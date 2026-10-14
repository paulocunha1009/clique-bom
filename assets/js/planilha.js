'use strict';
// =============================================================================
// Clique Bom — envio dos resumos para a Planilha Google do grupo (Etapa 8)
// -----------------------------------------------------------------------------
//   • Desligado por padrão. Só o profissional (com PIN) liga e configura.
//   • Envia UMA LINHA POR PARTIDA, com as mesmas colunas do relatório CSV,
//     MAS SEM o apelido: o aluno é identificado só pelo código do participante.
//   • Perfis sem código do participante NÃO são enviados.
//   • Sem internet, as partidas ficam numa fila e são enviadas depois
//     (ao abrir o jogo, quando a conexão volta ou pelo botão "Enviar pendentes").
//   • A planilha ignora partidas repetidas, então reenviar é seguro.
//   • Cliques e trajetórias continuam só no computador (exportar pelos CSVs).
//
// O código que fica na planilha está em apps-script/Codigo.gs.
// =============================================================================

const PLANILHA_CONFIG_KEY = 'cliquebom-planilha';
const PLANILHA_FILA_KEY = 'cliquebom-fila-envio';
const PLANILHA_FILA_MAX = 3000;   // limite de partidas aguardando envio
const PLANILHA_LOTE = 50;         // partidas por envio
const PLANILHA_URL_VALIDA = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;

let planilhaEnviando = false;

// ---------- Configuração (vale para o navegador todo) ----------
function lerConfigPlanilha() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem(PLANILHA_CONFIG_KEY) || '{}') || {}; } catch (_) { c = {}; }
  if (!c.dispositivoId) {
    // Identificador aleatório deste computador (não identifica pessoas).
    c.dispositivoId = 'PC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    try { localStorage.setItem(PLANILHA_CONFIG_KEY, JSON.stringify(c)); } catch (_) {}
  }
  return { ativo: c.ativo === true, url: c.url || '', chave: c.chave || '', escola: c.escola || '',
    dispositivoId: c.dispositivoId, ultimoEnvio: c.ultimoEnvio || null, ultimoErro: c.ultimoErro || '' };
}
function gravarConfigPlanilha(mudancas) {
  const c = { ...lerConfigPlanilha(), ...mudancas };
  try { localStorage.setItem(PLANILHA_CONFIG_KEY, JSON.stringify(c)); } catch (_) {}
  return c;
}

// ---------- Fila de envio ----------
function lerFila() {
  try { const f = JSON.parse(localStorage.getItem(PLANILHA_FILA_KEY) || '[]'); return Array.isArray(f) ? f : []; } catch (_) { return []; }
}
function gravarFila(fila) {
  try { localStorage.setItem(PLANILHA_FILA_KEY, JSON.stringify(fila.slice(-PLANILHA_FILA_MAX))); return true; } catch (_) { return false; }
}

// Monta a linha da planilha a partir de uma partida (sem o apelido!).
function linhaParaPlanilha(entry, codigo, config) {
  const valores = summaryRow({ ...entry, profileName: '', profileCode: codigo });
  const linha = {};
  SUMMARY_HEADER.forEach((coluna, i) => {
    if (coluna === 'Jogador') return; // o apelido nunca sai do computador
    const v = valores[i];
    // Números vão como números (a planilha em português lê "83.3" como texto).
    linha[coluna] = typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
  });
  linha['Escola/turma'] = config.escola;
  linha['Identificador do computador'] = config.dispositivoId;
  return linha;
}

// Coloca uma partida na fila (chamado no fim de cada partida).
function enfileirarPartida(entry, perfil) {
  const config = lerConfigPlanilha();
  if (!config.ativo || !perfil || !perfil.codigo || !entry || !entry.id) return false;
  const fila = lerFila();
  if (fila.some(item => item.id === entry.id)) return false;
  fila.push({ id: entry.id, linha: linhaParaPlanilha(entry, perfil.codigo, config) });
  gravarFila(fila);
  return true;
}
// Coloca na fila as partidas antigas do histórico (só de perfis com código).
function enfileirarHistoricoAntigo() {
  let n = 0;
  for (const p of profiles) {
    if (!p.codigo) continue;
    for (const e of readProfileHistory(p.id)) if (enfileirarPartida(e, p)) n++;
  }
  return n;
}

// ---------- Envio ----------
async function chamarPlanilha(config, corpo) {
  const resposta = await fetch(config.url, {
    method: 'POST',
    // Sem cabeçalhos especiais: o navegador envia como texto simples, que o Google aceita.
    body: JSON.stringify({ chave: config.chave, ...corpo }),
    redirect: 'follow'
  });
  return resposta.json();
}
// Envia a fila em lotes. Devolve um texto explicando o resultado.
async function enviarPendentes() {
  const config = lerConfigPlanilha();
  if (!config.ativo) return 'O envio para a planilha está desligado.';
  if (!PLANILHA_URL_VALIDA.test(config.url) || !config.chave) return 'Falta configurar o endereço ou a chave da planilha.';
  if (planilhaEnviando) return 'Já existe um envio em andamento.';
  if (!navigator.onLine) return 'Sem internet agora. As partidas continuam guardadas e serão enviadas depois.';
  planilhaEnviando = true;
  let enviadas = 0;
  try {
    let fila = lerFila();
    while (fila.length) {
      const lote = fila.slice(0, PLANILHA_LOTE);
      const colunas = [...new Set(lote.flatMap(item => Object.keys(item.linha)))];
      const linhas = lote.map(item => colunas.map(c => item.linha[c] ?? ''));
      const r = await chamarPlanilha(config, { acao: 'partidas', colunas, linhas });
      if (!r || !r.ok) throw new Error(r && r.erro ? r.erro : 'resposta-invalida');
      const recebidos = new Set(r.recebidos || []);
      fila = lerFila().filter(item => !recebidos.has(item.id));
      gravarFila(fila);
      enviadas += recebidos.size;
      if (!recebidos.size) break; // segurança: evita repetir para sempre
    }
    gravarConfigPlanilha({ ultimoEnvio: new Date().toISOString(), ultimoErro: '' });
    return enviadas ? `${enviadas} partida(s) enviada(s) para a planilha.` : 'Nenhuma partida aguardando envio.';
  } catch (erro) {
    const msg = traduzirErroPlanilha(erro);
    gravarConfigPlanilha({ ultimoErro: msg });
    return msg + (enviadas ? ` (${enviadas} partida(s) chegaram a ser enviadas.)` : '');
  } finally {
    planilhaEnviando = false;
    atualizarPainelPlanilha();
  }
}
function traduzirErroPlanilha(erro) {
  const t = String(erro && erro.message || erro);
  if (t.includes('chave-invalida')) return 'A planilha recusou o envio: a chave do projeto não confere.';
  if (t.includes('chave-nao-configurada')) return 'A chave ainda não foi definida no script da planilha (Codigo.gs).';
  if (t.includes('apelido')) return 'A planilha recusou dados com apelido.';
  if (t.includes('Failed to fetch') || t.includes('NetworkError') || t.includes('Load failed')) return 'Não foi possível falar com a planilha (sem internet ou endereço errado). As partidas continuam guardadas.';
  return 'Não foi possível enviar agora: ' + t + '. As partidas continuam guardadas.';
}

// ---------- Painel na tela de Histórico ----------
function atualizarPainelPlanilha() {
  const painel = document.querySelector('#painel-planilha');
  if (!painel) return;
  const c = lerConfigPlanilha();
  const fila = lerFila();
  document.querySelector('#planilha-ativo').checked = c.ativo;
  if (document.activeElement !== document.querySelector('#planilha-url')) document.querySelector('#planilha-url').value = c.url;
  if (document.activeElement !== document.querySelector('#planilha-escola')) document.querySelector('#planilha-escola').value = c.escola;
  // A chave não é mostrada de volta (só se sabe se está preenchida).
  document.querySelector('#planilha-chave').placeholder = c.chave ? 'Chave salva (digite para trocar)' : 'Cole aqui a chave do projeto';
  const semCodigo = profiles.filter(p => !p.codigo).map(p => p.name);
  const estado = [];
  estado.push(c.ativo ? '✅ Envio ligado.' : '⏸️ Envio desligado.');
  estado.push(`${fila.length} partida(s) aguardando envio.`);
  if (c.ultimoEnvio) estado.push(`Último envio: ${new Date(c.ultimoEnvio).toLocaleString('pt-BR')}.`);
  if (c.ultimoErro) estado.push(`⚠️ ${c.ultimoErro}`);
  document.querySelector('#planilha-estado').textContent = estado.join(' ');
  document.querySelector('#planilha-sem-codigo').textContent = semCodigo.length
    ? `Perfis sem código do participante não são enviados: ${semCodigo.join(', ')}. Use "Editar" em Perfis dos jogadores para dar um código.`
    : 'Todos os perfis têm código do participante.';
  document.querySelector('#btn-planilha-enviar').disabled = !c.ativo || !fila.length;
  document.querySelector('#btn-planilha-antigas').disabled = !c.ativo;
}

function initPlanilha() {
  const $p = s => document.querySelector(s);
  const aviso = texto => { $p('#planilha-aviso').textContent = texto; };
  $p('#form-planilha').addEventListener('submit', async e => {
    e.preventDefault();
    if (!(await exigirModoProfissional())) return;
    const url = $p('#planilha-url').value.trim();
    const chaveDigitada = $p('#planilha-chave').value.trim();
    const escola = $p('#planilha-escola').value.trim();
    const ativo = $p('#planilha-ativo').checked;
    if (url && !PLANILHA_URL_VALIDA.test(url)) { aviso('O endereço deve ser parecido com https://script.google.com/macros/s/…/exec (veja o passo a passo).'); return; }
    if (escola && !/^[A-Za-z0-9_-]{1,20}$/.test(escola)) { aviso('Escola/turma: use só letras, números e hífen (ex.: ESC03).'); return; }
    const chave = chaveDigitada || lerConfigPlanilha().chave;
    if (ativo && (!url || !chave)) { aviso('Para ligar o envio, preencha o endereço e a chave do projeto.'); return; }
    gravarConfigPlanilha({ url, chave, escola, ativo });
    $p('#planilha-chave').value = '';
    atualizarPainelPlanilha();
    aviso(ativo ? 'Configuração salva. O envio está ligado.' : 'Configuração salva. O envio está desligado.');
    if (ativo) aviso(await enviarPendentes());
  });
  $p('#btn-planilha-testar').addEventListener('click', async () => {
    if (!(await exigirModoProfissional())) return;
    const c = lerConfigPlanilha();
    const url = $p('#planilha-url').value.trim() || c.url;
    const chave = $p('#planilha-chave').value.trim() || c.chave;
    if (!PLANILHA_URL_VALIDA.test(url) || !chave) { aviso('Preencha o endereço e a chave antes de testar.'); return; }
    aviso('Testando a conexão…');
    try {
      const r = await chamarPlanilha({ url, chave }, { acao: 'teste' });
      aviso(r && r.ok ? `Conexão funcionando! Planilha: "${r.planilha}".` : traduzirErroPlanilha(r && r.erro));
    } catch (erro) { aviso(traduzirErroPlanilha(erro)); }
  });
  $p('#btn-planilha-enviar').addEventListener('click', async () => {
    if (!(await exigirModoProfissional())) return;
    aviso('Enviando…');
    aviso(await enviarPendentes());
  });
  $p('#btn-planilha-antigas').addEventListener('click', async () => {
    if (!(await exigirModoProfissional())) return;
    const n = enfileirarHistoricoAntigo();
    atualizarPainelPlanilha();
    aviso(n ? `${n} partida(s) antiga(s) colocada(s) na fila. Enviando…` : 'Não há partidas antigas novas para enviar.');
    if (n) aviso(await enviarPendentes());
  });
  // Tenta enviar quando a internet volta e logo depois de abrir o jogo.
  window.addEventListener('online', () => { enviarPendentes(); });
  setTimeout(() => { if (lerConfigPlanilha().ativo && lerFila().length) enviarPendentes(); }, 4000);
}
