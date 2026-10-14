'use strict';
// =============================================================================
// Clique Bom — proteção dos dados (Etapa 5, LGPD)
// -----------------------------------------------------------------------------
//   • Modo profissional protegido por PIN: relatórios, backup, edição e exclusão
//     de perfis e apagamento de histórico só funcionam com o PIN.
//   • O PIN nunca é guardado como texto: guardamos só um "resumo" embaralhado
//     (PBKDF2 com SHA-256 e sal aleatório). Junto, um código de recuperação.
//   • Backup em arquivo JSON: exportar e importar um perfil ou todos.
//
// Aviso honesto (também mostrado na tela): sem servidor, o PIN impede o acesso
// de alunos, mas não é criptografia dos dados. Quem tem conhecimento técnico e
// acesso ao computador ainda consegue ler o armazenamento do navegador.
//
// Carregado antes do script.js; os eventos são ligados por initProtecao().
// =============================================================================

const PIN_KEY = 'cliquebom-pin';
const PRO_SESSAO_MS = 15 * 60 * 1000;      // sai sozinho após 15 minutos sem uso
const PIN_TENTATIVAS_MAX = 5;               // depois disso, espera 30 segundos
const PIN_ESPERA_MS = 30 * 1000;
const PBKDF2_ITERACOES = 150000;
const BACKUP_FORMATO = 'cliquebom-backup';
const BACKUP_VERSAO = 1;
const BACKUP_TAMANHO_MAX = 200 * 1024 * 1024; // 200 MB

let proAteMs = 0;          // até quando o modo profissional fica ativo
let pinFalhas = 0;
let pinBloqueadoAte = 0;

// ---------- Resumo seguro do PIN ----------
function paraHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function novoSal() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return paraHex(a.buffer);
}
async function resumirSegredo(texto, sal, metodo) {
  if (metodo !== 'simples' && typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const chave = await crypto.subtle.importKey('raw', enc.encode(texto), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(sal), iterations: PBKDF2_ITERACOES, hash: 'SHA-256' }, chave, 256);
    return { metodo: 'pbkdf2', hash: paraHex(bits) };
  }
  // Reserva para navegadores sem crypto.subtle: resumo simples repetido muitas vezes.
  let h = 2166136261;
  const s = sal + ':' + texto;
  for (let r = 0; r < 20000; r++) for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return { metodo: 'simples', hash: h.toString(16) };
}
function lerPinSalvo() {
  try {
    const v = JSON.parse(localStorage.getItem(PIN_KEY) || 'null');
    return v && typeof v.hash === 'string' && typeof v.sal === 'string' ? v : null;
  } catch (_) { return null; }
}
async function conferirSegredo(texto, sal, hashSalvo, metodo) {
  if (metodo === 'pbkdf2' && !(typeof crypto !== 'undefined' && crypto.subtle)) return null; // não dá para conferir aqui
  const r = await resumirSegredo(texto, sal, metodo);
  return r.hash === hashSalvo;
}
// Código de recuperação: 8 caracteres fáceis de ler (sem 0/O, 1/I/L).
function novoCodigoRecuperacao() {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  const c = [...a].map(n => letras[n % letras.length]).join('');
  return c.slice(0, 4) + '-' + c.slice(4);
}
const normalizarCodigo = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

async function gravarNovoPin(pin, codigoRecuperacao, anterior) {
  const sal = novoSal();
  const r = await resumirSegredo(pin, sal);
  const registro = { sal, hash: r.hash, metodo: r.metodo, criadoEm: new Date().toISOString() };
  if (codigoRecuperacao) {
    const salRec = novoSal();
    const rr = await resumirSegredo(normalizarCodigo(codigoRecuperacao), salRec);
    Object.assign(registro, { salRec, hashRec: rr.hash, metodoRec: rr.metodo });
  } else if (anterior) {
    Object.assign(registro, { salRec: anterior.salRec, hashRec: anterior.hashRec, metodoRec: anterior.metodoRec });
  }
  try { localStorage.setItem(PIN_KEY, JSON.stringify(registro)); return true; } catch (_) { return false; }
}

// ---------- Sessão do modo profissional ----------
function profissionalAtivo() { return Date.now() < proAteMs; }
function renovarSessaoProfissional() { if (profissionalAtivo()) proAteMs = Date.now() + PRO_SESSAO_MS; }
function ativarModoProfissional() { proAteMs = Date.now() + PRO_SESSAO_MS; atualizarBarrasPro(); }
function sairModoProfissional(aviso = 'Você saiu do modo profissional.') {
  proAteMs = 0;
  atualizarBarrasPro();
  // Se estava vendo relatórios, volta ao menu para não deixar dados na tela.
  if (!document.querySelector('#historico').hidden) showScreen('inicio');
  if (aviso) announce(aviso);
}
// Pede o PIN (ou a criação dele) quando necessário. Devolve true se liberado.
async function exigirModoProfissional() {
  if (profissionalAtivo()) { renovarSessaoProfissional(); return true; }
  return abrirJanelaPin(lerPinSalvo() ? 'entrar' : 'criar');
}

// Barra exibida nas telas protegidas, mostrando o estado do modo profissional.
function atualizarBarrasPro() {
  for (const barra of document.querySelectorAll('.pro-bar')) {
    barra.replaceChildren();
    const ativo = profissionalAtivo();
    const tela = barra.closest('.screen')?.id;
    // No Histórico, a barra só aparece com o modo ativo (a tela já exige o PIN).
    barra.hidden = !ativo && tela !== 'perfis';
    const texto = document.createElement('span');
    texto.textContent = ativo
      ? '🔓 Modo profissional ativo. Ele se desliga sozinho após 15 minutos sem uso.'
      : '🔒 Para editar, fazer backup ou excluir perfis, entre no modo profissional.';
    barra.appendChild(texto);
    const botao = (rotulo, acao, secundario = true) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = rotulo; b.className = secundario ? 'button-secondary button-small' : 'button-small';
      b.addEventListener('click', acao);
      barra.appendChild(b);
    };
    if (ativo) {
      botao('Trocar PIN', () => abrirJanelaPin('trocar'));
      botao('Sair do modo profissional', () => sairModoProfissional());
    } else {
      botao('Entrar no modo profissional', async () => { if (await exigirModoProfissional()) renderProfiles(); }, false);
    }
  }
}

// ---------- Janela do PIN ----------
// Modos: 'criar' | 'entrar' | 'recuperar' | 'trocar' | 'mostrar-codigo'
let pinModo = 'entrar';
let pinResolver = null;
let pinCodigoMostrado = '';
const $ = sel => document.querySelector(sel);

function configurarJanelaPin(modo) {
  pinModo = modo;
  const textos = {
    criar: ['Criar PIN do modo profissional', 'Crie um PIN de 4 a 8 números. Ele será pedido para ver relatórios, fazer backup, editar e excluir perfis e apagar histórico. Não compartilhe com os alunos.', 'Criar PIN'],
    entrar: ['Área do profissional', 'Digite o PIN do modo profissional.', 'Entrar'],
    recuperar: ['Recuperar acesso', 'Digite o código de recuperação que você anotou ao criar o PIN e escolha um novo PIN. Se o código também foi perdido, não é possível recuperar o PIN neste navegador: será preciso pedir ajuda técnica, e os dados podem ser perdidos.', 'Criar novo PIN'],
    trocar: ['Trocar PIN', 'Escolha um novo PIN de 4 a 8 números. O código de recuperação continua o mesmo.', 'Salvar novo PIN'],
    'mostrar-codigo': ['Anote o código de recuperação', 'Anote este código em papel e guarde em local seguro, longe dos alunos. Ele é a única forma de criar um novo PIN se você esquecer o atual. Ele não será mostrado de novo.', 'Já anotei, continuar']
  }[modo];
  $('#titulo-pin').textContent = textos[0];
  $('#pin-texto').textContent = textos[1];
  $('#btn-pin-ok').textContent = textos[2];
  $('#pin-1-rotulo').textContent = modo === 'entrar' ? 'PIN' : 'Novo PIN (4 a 8 números)';
  $('#pin-campo-codigo').hidden = modo !== 'recuperar';
  $('#pin-campo-1').hidden = modo === 'mostrar-codigo';
  $('#pin-campo-2').hidden = !['criar', 'recuperar', 'trocar'].includes(modo);
  $('#pin-recuperacao').hidden = modo !== 'mostrar-codigo';
  $('#pin-recuperacao').textContent = modo === 'mostrar-codigo' ? pinCodigoMostrado : '';
  $('#btn-pin-cancelar').hidden = modo === 'mostrar-codigo';
  $('#btn-pin-esqueci').hidden = modo !== 'entrar';
  $('#pin-erro').textContent = '';
  for (const id of ['#pin-1', '#pin-2', '#pin-codigo']) $(id).value = '';
  const primeiro = modo === 'recuperar' ? '#pin-codigo' : modo === 'mostrar-codigo' ? '#btn-pin-ok' : '#pin-1';
  setTimeout(() => $(primeiro).focus(), 0);
}
function abrirJanelaPin(modo) {
  configurarJanelaPin(modo);
  const dlg = $('#modal-pin');
  if (!dlg.open) dlg.showModal();
  return new Promise(resolve => { pinResolver = resolve; });
}
function fecharJanelaPin(resultado) {
  const dlg = $('#modal-pin');
  const r = pinResolver;
  pinResolver = null;
  if (dlg.open) dlg.close();
  if (r) r(resultado);
}
function erroPin(msg) { $('#pin-erro').textContent = msg; }
function pinValido(pin) { return /^\d{4,8}$/.test(pin); }

async function enviarJanelaPin() {
  const pin1 = $('#pin-1').value.trim(), pin2 = $('#pin-2').value.trim();
  const salvo = lerPinSalvo();
  if (pinModo === 'mostrar-codigo') {
    pinCodigoMostrado = '';
    ativarModoProfissional();
    fecharJanelaPin(true);
    return;
  }
  if (pinModo === 'entrar') {
    if (Date.now() < pinBloqueadoAte) {
      erroPin(`Muitas tentativas erradas. Aguarde ${Math.ceil((pinBloqueadoAte - Date.now()) / 1000)} segundos.`);
      return;
    }
    if (!salvo) { configurarJanelaPin('criar'); return; }
    const ok = await conferirSegredo(pin1, salvo.sal, salvo.hash, salvo.metodo);
    if (ok === null) { erroPin('Este navegador não consegue conferir o PIN. Abra o jogo no navegador de costume (Chrome, Edge ou Firefox atualizados).'); return; }
    if (!ok) {
      pinFalhas += 1;
      if (pinFalhas >= PIN_TENTATIVAS_MAX) { pinFalhas = 0; pinBloqueadoAte = Date.now() + PIN_ESPERA_MS; erroPin('PIN incorreto. Muitas tentativas: aguarde 30 segundos.'); }
      else erroPin(`PIN incorreto. Tentativa ${pinFalhas} de ${PIN_TENTATIVAS_MAX}.`);
      $('#pin-1').value = '';
      $('#pin-1').focus();
      return;
    }
    pinFalhas = 0;
    ativarModoProfissional();
    fecharJanelaPin(true);
    return;
  }
  // criar, recuperar e trocar: conferem o novo PIN digitado duas vezes.
  if (!pinValido(pin1)) { erroPin('O PIN precisa ter de 4 a 8 números (só algarismos).'); return; }
  if (pin1 !== pin2) { erroPin('Os dois PINs digitados são diferentes. Digite de novo.'); return; }
  if (pinModo === 'recuperar') {
    if (!salvo || !salvo.hashRec) { erroPin('Não há código de recuperação registrado neste navegador.'); return; }
    const ok = await conferirSegredo(normalizarCodigo($('#pin-codigo').value), salvo.salRec, salvo.hashRec, salvo.metodoRec);
    if (!ok) { erroPin('Código de recuperação incorreto.'); return; }
  }
  if (pinModo === 'trocar') {
    if (!profissionalAtivo()) { erroPin('Entre no modo profissional antes de trocar o PIN.'); return; }
    if (!(await gravarNovoPin(pin1, null, salvo))) { erroPin('Não foi possível salvar o PIN neste navegador.'); return; }
    announce('PIN trocado com sucesso.');
    fecharJanelaPin(true);
    return;
  }
  // criar ou recuperar: gera um novo código de recuperação e mostra uma única vez.
  const codigo = novoCodigoRecuperacao();
  if (!(await gravarNovoPin(pin1, codigo))) { erroPin('Não foi possível salvar o PIN neste navegador.'); return; }
  pinCodigoMostrado = codigo;
  configurarJanelaPin('mostrar-codigo');
}

// ---------- Janela de escolha com vários botões ----------
// opcoes: [{ valor, rotulo, secundario }]. Devolve o valor escolhido (ou null).
function perguntarEscolha(titulo, texto, opcoes) {
  const dlg = $('#modal-escolha');
  $('#titulo-escolha').textContent = titulo;
  $('#texto-escolha').textContent = texto;
  const caixa = $('#botoes-escolha');
  caixa.replaceChildren();
  return new Promise(resolve => {
    let resolvido = false;
    const terminar = valor => { if (resolvido) return; resolvido = true; if (dlg.open) dlg.close(); resolve(valor); };
    for (const o of opcoes) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = o.rotulo;
      if (o.secundario) b.className = 'button-secondary';
      b.addEventListener('click', () => terminar(o.valor));
      caixa.appendChild(b);
    }
    dlg.addEventListener('close', () => terminar(null), { once: true });
    dlg.showModal();
    caixa.querySelector('button')?.focus();
  });
}

// ---------- Backup (exportar) ----------
function lerJsonSeguro(texto, padrao) {
  try { return texto === null ? padrao : JSON.parse(texto); } catch (_) { return padrao; }
}
async function montarBackupPerfil(p) {
  const campo = f => storageGet(profileDataKey(p.id, f));
  return {
    perfil: { id: p.id, name: p.name, codigo: p.codigo || '' },
    dados: {
      phase: Number(campo('phase')) || 0,
      history: lerJsonSeguro(campo('history'), []),
      preferences: lerJsonSeguro(campo('preferences'), {}),
      badges: lerJsonSeguro(campo('badges'), {})
    },
    detalhes: await lerDetalhesDoPerfil(p.id) // cliques e trajetórias (IndexedDB)
  };
}
function nomeArquivoSeguro(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'perfil';
}
async function exportarBackup(listaPerfis) {
  if (!(await exigirModoProfissional())) return;
  const pacote = {
    formato: BACKUP_FORMATO, versaoBackup: BACKUP_VERSAO, versaoDados: DATA_VERSION,
    criadoEm: new Date().toISOString(),
    aviso: 'Este arquivo contém dados de desempenho de alunos. Guarde em local seguro e não compartilhe sem autorização.',
    perfis: []
  };
  for (const p of listaPerfis) pacote.perfis.push(await montarBackupPerfil(p));
  const nome = listaPerfis.length === 1 ? nomeArquivoSeguro(listaPerfis[0].codigo || listaPerfis[0].name) : 'todos-os-perfis';
  const blob = new Blob([JSON.stringify(pacote)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-clique-bom-${nome}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  profileNotice.textContent = `Backup criado com ${listaPerfis.length} perfil(is). Guarde o arquivo em local seguro (por exemplo, no Drive institucional ou num pendrive guardado).`;
}

// ---------- Backup (importar) ----------
function validarPerfilDoBackup(item) {
  const p = item && item.perfil;
  if (!p || typeof p.id !== 'string' || !/^p-[a-z0-9-]+$/i.test(p.id)) return false;
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40) return false;
  return item.dados && typeof item.dados === 'object';
}
async function importarBackupArquivo(arquivo) {
  if (arquivo.size > BACKUP_TAMANHO_MAX) { profileNotice.textContent = 'Arquivo grande demais para ser um backup do Clique Bom.'; return; }
  let pacote;
  try { pacote = JSON.parse(await arquivo.text()); } catch (_) { profileNotice.textContent = 'Não foi possível ler o arquivo. Ele não parece ser um backup do Clique Bom.'; return; }
  if (!pacote || pacote.formato !== BACKUP_FORMATO || !Array.isArray(pacote.perfis)) {
    profileNotice.textContent = 'Este arquivo não é um backup do Clique Bom.';
    return;
  }
  if (pacote.versaoBackup > BACKUP_VERSAO || pacote.versaoDados > DATA_VERSION) {
    const seguir = await perguntarEscolha('Backup de versão mais nova',
      'Este backup foi criado por uma versão mais nova do Clique Bom. Algumas informações podem não aparecer nesta versão. Deseja importar mesmo assim?',
      [{ valor: 'sim', rotulo: 'Importar mesmo assim' }, { valor: 'nao', rotulo: 'Cancelar', secundario: true }]);
    if (seguir !== 'sim') return;
  }
  let importados = 0, pulados = 0, semCodigo = 0, ativoSubstituido = false;
  for (const item of pacote.perfis) {
    if (!validarPerfilDoBackup(item)) { pulados++; continue; }
    const origem = item.perfil;
    let destinoId = origem.id, nome = origem.name.trim(), trocarIds = false;
    const existente = profiles.find(p => p.id === origem.id);
    if (existente) {
      const escolha = await perguntarEscolha('Este perfil já existe',
        `Já existe neste navegador o perfil "${existente.name}". O que fazer com o backup de "${origem.name}"?`,
        [{ valor: 'substituir', rotulo: 'Substituir pelos dados do backup' },
         { valor: 'novo', rotulo: 'Importar como um novo perfil' },
         { valor: 'pular', rotulo: 'Não importar este perfil', secundario: true }]);
      if (escolha === 'pular' || escolha === null) { pulados++; continue; }
      if (escolha === 'novo') {
        destinoId = makeProfileId();
        nome = (nome.slice(0, 32) + ' (cópia)').slice(0, 40);
        trocarIds = true; // novos códigos de partida, para não misturar com o original
      } else {
        await apagarDetalhesDoPerfil(destinoId);
        if (destinoId === activeProfileId) ativoSubstituido = true;
      }
    } else if (profiles.length >= 50) { pulados++; continue; }

    // Histórico: migra partidas antigas e descarta registros inválidos.
    const mapaIds = new Map();
    const historico = (Array.isArray(item.dados.history) ? item.dados.history : [])
      .map(e => migrarPartidaV1paraV2({ ...e }))
      .filter(isValidHistoryEntry)
      .slice(0, HISTORY_LIMIT)
      .map(e => {
        if (!trocarIds) return e;
        const novo = makeGameId();
        mapaIds.set(e.id, novo);
        return { ...e, id: novo };
      });
    const fase = Number.isInteger(item.dados.phase) && item.dados.phase >= 0 && item.dados.phase < PHASES.length ? item.dados.phase : 0;
    const prefs = item.dados.preferences && typeof item.dados.preferences === 'object' ? item.dados.preferences : {};
    const medalhas = item.dados.badges && typeof item.dados.badges === 'object' && !Array.isArray(item.dados.badges) ? item.dados.badges : {};
    storageSet(profileDataKey(destinoId, 'phase'), String(fase));
    storageSet(profileDataKey(destinoId, 'history'), JSON.stringify(historico));
    storageSet(profileDataKey(destinoId, 'preferences'), JSON.stringify(prefs));
    storageSet(profileDataKey(destinoId, 'badges'), JSON.stringify(medalhas));
    // Detalhes (cliques e trajetórias) vão para o IndexedDB.
    for (const r of (Array.isArray(item.detalhes) ? item.detalhes : [])) {
      if (!r || typeof r.id !== 'string' || !Array.isArray(r.alvos)) continue;
      const id = trocarIds ? mapaIds.get(r.id) : r.id;
      if (!id) continue;
      await salvarDetalhes({ ...r, id, perfilId: destinoId });
    }
    let codigo = typeof origem.codigo === 'string' && /^[A-Za-z0-9_-]{1,20}$/.test(origem.codigo) ? origem.codigo : '';
    // O código do participante não pode se repetir (misturaria alunos na pesquisa).
    if (codigo && profiles.some(p => p.id !== destinoId && (p.codigo || '').toUpperCase() === codigo.toUpperCase())) {
      codigo = '';
      semCodigo++;
    }
    const perfil = { id: destinoId, name: nome, ...(codigo ? { codigo } : {}) };
    const i = profiles.findIndex(p => p.id === destinoId);
    if (i >= 0) profiles[i] = perfil; else profiles.push(perfil);
    importados++;
  }
  storageSet(PROFILE_KEY, JSON.stringify(profiles));
  if (ativoSubstituido) { loadProfileState(); applyPreferences(); }
  renderProfiles();
  profileNotice.textContent = `Importação concluída: ${importados} perfil(is) importado(s)` + (pulados ? `, ${pulados} não importado(s).` : '.') +
    (semCodigo ? ` ${semCodigo} perfil(is) ficaram sem código do participante porque o código já estava em uso. Use "Editar" para dar um novo código.` : '');
}

// ---------- Editar perfil (apelido e código) ----------
let perfilEmEdicao = null;
function abrirEdicaoPerfil(p) {
  perfilEmEdicao = p.id;
  $('#editar-nome').value = p.name;
  $('#editar-codigo').value = p.codigo || '';
  $('#editar-erro').textContent = '';
  $('#modal-editar-perfil').showModal();
  $('#editar-nome').focus();
}
// Valida apelido e código. Devolve mensagem de erro ou ''.
function validarApelidoECodigo(nome, codigo, idIgnorado) {
  if (!nome || nome.length > 40) return 'Informe um apelido de até 40 caracteres.';
  if (codigo && !/^[A-Za-z0-9_-]{1,20}$/.test(codigo)) return 'O código pode ter só letras, números, hífen e sublinhado (até 20 caracteres).';
  if (codigo && profiles.some(p => p.id !== idIgnorado && (p.codigo || '').toUpperCase() === codigo.toUpperCase())) return 'Já existe outro perfil com este código.';
  return '';
}
// Alerta (sem bloquear) quando o apelido parece um nome completo.
async function confirmarSeParecerNomeCompleto(nome) {
  const pareceNome = /^\p{Lu}\p{Ll}+(\s+(d[aeo]s?\s+)?\p{Lu}\p{Ll}+)+$/u.test(nome);
  if (!pareceNome) return true;
  const r = await perguntarEscolha('Isto parece um nome completo',
    `"${nome}" parece o nome e sobrenome de uma pessoa. Para proteger o aluno (LGPD), prefira um apelido ou um código.`,
    [{ valor: 'trocar', rotulo: 'Voltar e usar um apelido' }, { valor: 'manter', rotulo: 'Usar assim mesmo', secundario: true }]);
  return r === 'manter';
}

// ---------- Ligação dos eventos (chamada no fim do script.js) ----------
function initProtecao() {
  $('#form-pin').addEventListener('submit', e => { e.preventDefault(); enviarJanelaPin(); });
  $('#btn-pin-cancelar').addEventListener('click', () => fecharJanelaPin(false));
  $('#btn-pin-esqueci').addEventListener('click', () => configurarJanelaPin('recuperar'));
  $('#modal-pin').addEventListener('cancel', e => { if (pinModo === 'mostrar-codigo') e.preventDefault(); });
  $('#modal-pin').addEventListener('close', () => { if (pinResolver) fecharJanelaPin(false); });

  $('#btn-exportar-todos').addEventListener('click', () => exportarBackup(profiles.slice()));
  $('#btn-importar-backup').addEventListener('click', async () => {
    if (await exigirModoProfissional()) $('#arquivo-backup').click();
  });
  $('#arquivo-backup').addEventListener('change', async e => {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = '';
    if (arquivo) await importarBackupArquivo(arquivo);
  });

  $('#form-editar-perfil').addEventListener('submit', async e => {
    e.preventDefault();
    const p = profiles.find(x => x.id === perfilEmEdicao);
    if (!p || !profissionalAtivo()) { $('#modal-editar-perfil').close(); return; }
    const nome = $('#editar-nome').value.trim().replace(/\s+/g, ' ');
    const codigo = $('#editar-codigo').value.trim();
    const erro = validarApelidoECodigo(nome, codigo, p.id);
    if (erro) { $('#editar-erro').textContent = erro; return; }
    $('#modal-editar-perfil').close();
    if (nome !== p.name && !(await confirmarSeParecerNomeCompleto(nome))) { abrirEdicaoPerfil(p); return; }
    p.name = nome;
    if (codigo) p.codigo = codigo; else delete p.codigo;
    storageSet(PROFILE_KEY, JSON.stringify(profiles));
    renderProfiles();
    profileNotice.textContent = 'Perfil atualizado.';
  });
  $('#btn-editar-cancelar').addEventListener('click', () => $('#modal-editar-perfil').close());

  // Qualquer uso renova o tempo do modo profissional; após 15 minutos parado, ele se desliga.
  document.addEventListener('pointerdown', renovarSessaoProfissional, true);
  document.addEventListener('keydown', renovarSessaoProfissional, true);
  let estavaAtivo = false;
  setInterval(() => {
    const ativo = profissionalAtivo();
    if (estavaAtivo && !ativo) sairModoProfissional('O modo profissional foi desligado por falta de uso.');
    estavaAtivo = ativo;
  }, 15000);
  atualizarBarrasPro();
}
