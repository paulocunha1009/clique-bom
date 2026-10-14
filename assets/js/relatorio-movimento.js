'use strict';
// =============================================================================
// Clique Bom — relatórios dos indicadores de movimento (Etapa 2)
// -----------------------------------------------------------------------------
// Mostra no Histórico os indicadores calculados em movimento.js:
//   • cartões com médias e uma frase simples explicando cada indicador;
//   • gráficos de eficiência do caminho e throughput;
//   • coluna "Movimento" na tabela, com botão para ver o caminho do cursor;
//   • exportação de cada clique e das trajetórias em CSV.
// Este arquivo é carregado depois de movimento.js e antes de script.js.
// =============================================================================

// Frases explicativas para profissionais sem formação técnica.
// (As mesmas explicações estão no README.md.)
const MOTOR_INFO = {
  distCentro: 'Distância entre o ponto clicado e o meio da figura. Quanto menor, mais preciso foi o clique.',
  distErro: 'Nos cliques fora da figura, a que distância do meio eles caíram. Ajuda a ver se os erros passam perto ou longe.',
  reacao: 'Tempo entre a figura aparecer e o cursor começar a se mexer. Mostra a rapidez para perceber e iniciar a ação.',
  movimento: 'Tempo entre começar a mexer o cursor e acertar a figura. Mostra a agilidade do movimento em si.',
  eficiencia: '100% significa que o cursor foi em linha reta até a figura. Valores menores indicam desvios ou correções no caminho.',
  id: 'Quanto cada figura era difícil de alcançar, juntando distância e tamanho (medido em "bits"). Quanto maior, mais difícil.',
  throughput: 'Junta velocidade e precisão num só número (bits por segundo), pela Lei de Fitts. Quanto maior, mais eficiente o movimento. Compare sempre a mesma pessoa, com o mesmo dispositivo.'
};

// Número com vírgula decimal (padrão brasileiro).
function fmtDec(n, casas = 1) {
  return Number.isFinite(n) ? n.toFixed(casas).replace('.', ',') : '—';
}
// Média de um campo do resumo de movimento, apenas nas partidas que o possuem.
function motorMean(entries, campo) {
  const valores = entries.map(e => e.motor?.[campo]).filter(Number.isFinite);
  return { media: valores.length ? valores.reduce((s, n) => s + n, 0) / valores.length : null, n: valores.length };
}

// ---------- Cartões de indicadores ----------
function renderMotorReport(entries) {
  const box = document.querySelector('#relatorio-movimento');
  box.replaceChildren();
  const comMotor = entries.filter(e => e.motor);
  // Valor em destaque; a explicação fica em "O que é isso?" (Etapa 9).
  const card = (titulo, valor, explicacao, n) => criarCartaoIndicador(box, {
    titulo, valor, ajuda: explicacao, base: n ? `Base: ${n} partida(s)` : 'Sem dados medidos neste filtro'
  });
  if (!comMotor.length) {
    const p = document.createElement('p');
    p.textContent = entries.length
      ? 'As partidas deste filtro foram feitas antes desta atualização, por isso não têm medidas de movimento.'
      : 'Ainda não há partidas neste filtro.';
    box.appendChild(p);
    return;
  }
  const dc = motorMean(comMotor, 'distCentroAcertoPx');
  const dcr = motorMean(comMotor, 'distCentroAcertoRel');
  card('Distância do clique até o centro', dc.media === null ? '—' : `${fmtDec(dc.media)} px`,
    MOTOR_INFO.distCentro + (dcr.media === null ? '' : ` Em média, a ${Math.round(dcr.media * 100)}% do caminho entre o centro e a borda.`), dc.n);
  const de = motorMean(comMotor, 'distCentroErroPx');
  card('Distância dos erros até o centro', de.media === null ? '—' : `${fmtDec(de.media)} px`, MOTOR_INFO.distErro, de.n);
  const re = motorMean(comMotor, 'tReacaoMs');
  card('Tempo de reação', re.media === null ? '—' : `${fmtDec(re.media / 1000, 2)} s`, MOTOR_INFO.reacao, re.n);
  const mv = motorMean(comMotor, 'tMovimentoMs');
  card('Tempo de movimento', mv.media === null ? '—' : `${fmtDec(mv.media / 1000, 2)} s`, MOTOR_INFO.movimento, mv.n);
  const ef = motorMean(comMotor, 'eficiencia');
  card('Eficiência do caminho', ef.media === null ? '—' : `${Math.round(ef.media * 100)}%`, MOTOR_INFO.eficiencia, ef.n);
  const id = motorMean(comMotor, 'idMedioBits');
  card('Índice de dificuldade', id.media === null ? '—' : `${fmtDec(id.media, 2)} bits`, MOTOR_INFO.id, id.n);
  const tp = motorMean(comMotor, 'throughput');
  card('Throughput', tp.media === null ? '—' : `${fmtDec(tp.media, 2)} bits/s`, MOTOR_INFO.throughput, tp.n);
}

// Frases extras para a "Análise descritiva do período".
function motorAnalysisLines(entries) {
  const lines = [];
  const comMotor = entries.filter(e => e.motor);
  if (!comMotor.length) return lines;
  const tp = comMotor.filter(e => Number.isFinite(e.motor.throughput));
  if (tp.length >= 2) {
    const cron = tp.slice().sort((a, b) => a.date.localeCompare(b.date));
    const meio = Math.floor(cron.length / 2);
    const media = arr => arr.reduce((s, e) => s + e.motor.throughput, 0) / arr.length;
    const antes = media(cron.slice(0, meio)), depois = media(cron.slice(meio));
    lines.push(`Throughput: ${fmtDec(antes, 2)} bits/s na primeira metade das partidas e ${fmtDec(depois, 2)} bits/s na segunda metade. Diferenças pequenas são normais de um dia para outro.`);
  }
  const nominal = comMotor.filter(e => e.motor.fittsMetodo === 'nominal').length;
  if (nominal) lines.push(`Em ${nominal} partida(s) houve menos de 5 alvos válidos, então o throughput foi estimado com o tamanho real da figura, e não com a largura efetiva da norma ISO 9241-411.`);
  const comDestaque = entries.filter(e => e.destaque && e.destaque.ms > 0);
  const depois = comDestaque.reduce((n, e) => n + e.destaque.depois, 0);
  const total = comDestaque.reduce((n, e) => n + e.destaque.antes + e.destaque.depois, 0);
  if (total) lines.push(`Destaque de ajuda: em ${comDestaque.length} partida(s) com o destaque ligado, ${depois} de ${total} acertos (${Math.round(depois / total * 100)}%) aconteceram depois de a figura piscar. Compare partidas com o mesmo tempo de destaque.`);
  // Etapa 6: evolução do tamanho no modo adaptativo.
  const adapt = entries.filter(e => e.adaptativo && Number.isFinite(e.adaptativo.finalPx)).sort((a, b) => a.date.localeCompare(b.date));
  if (adapt.length) {
    const primeiro = adapt[0].adaptativo, ultimo = adapt[adapt.length - 1].adaptativo;
    lines.push(`Modo adaptativo: ${adapt.length} rodada(s). A figura começou com ${primeiro.inicialPx} px e terminou a rodada mais recente com ${ultimo.finalPx} px (mínimo permitido: ${ultimo.minimoPx} px). Se o tamanho para no mínimo, considere diminuir o tamanho mínimo nas Configurações.`);
    if (entries.some(e => e.adaptativo) && entries.some(e => !e.adaptativo)) lines.push('Este filtro mistura rodadas adaptativas e partidas por fases. Para comparar o tamanho alcançado, olhe o gráfico "Tamanho alcançado".');
  }
  const ignorados = entries.reduce((n, e) => n + (e.tremorIgnorados || 0), 0);
  if (ignorados) lines.push(`O filtro de tremor ignorou ${ignorados} ação(ões) repetida(s). Elas não contaram como erro. Muitas ações ignoradas podem indicar que vale aumentar o intervalo do filtro.`);
  if (comMotor.some(e => e.config?.permanenciaMs)) lines.push('No modo Permanência, o tempo em que o cursor ficou parado sobre a figura não entra no tempo de movimento nem no throughput.');
  if (comMotor.some(e => e.config?.margemPx)) lines.push('Com margem invisível, acertos podem cair um pouco fora do desenho. O índice de dificuldade considera a figura mais a margem.');
  if (comMotor.some(e => e.config?.alvoFixo)) lines.push('Com "alvo fixo no centro", o cursor geralmente já está sobre a figura. Por isso o tempo de reação, o caminho e a Lei de Fitts quase não se aplicam a essas partidas.');
  return lines;
}

// ---------- Gráfico de barras genérico ----------
// getter: função que devolve o valor da partida (ou null); opts: { max, fmt, unidade }
function renderMetricBars(container, entries, getter, opts) {
  container.replaceChildren();
  const cron = entries.slice(0, 10).reverse();
  if (!cron.length) { container.textContent = 'Sem partidas no filtro.'; return; }
  const valores = cron.map(e => { const v = getter(e); return Number.isFinite(v) ? v : null; });
  if (!valores.some(v => v !== null)) { container.textContent = 'Sem medidas de movimento nas partidas selecionadas.'; return; }
  const max = opts.max ?? Math.max(1, ...valores.filter(v => v !== null));
  valores.forEach((valor, i) => {
    const item = document.createElement('div'); item.className = 'chart-item';
    item.setAttribute('role', 'img');
    item.setAttribute('aria-label', `Partida ${i + 1}: ${valor === null ? 'sem medida' : opts.fmt(valor) + ' ' + opts.unidade}`);
    const val = document.createElement('span'); val.className = 'chart-value'; val.textContent = valor === null ? '—' : opts.fmt(valor);
    const track = document.createElement('div'); track.className = 'chart-track';
    const bar = document.createElement('div'); bar.className = 'chart-bar';
    bar.style.height = valor === null ? '0%' : `${Math.max(0, Math.min(100, valor / max * 100))}%`;
    track.appendChild(bar);
    const idx = document.createElement('span'); idx.className = 'chart-index'; idx.textContent = String(i + 1);
    item.append(val, track, idx); container.appendChild(item);
  });
}
function renderMotorCharts(entries) {
  renderMetricBars(document.querySelector('#grafico-eficiencia'), entries,
    e => Number.isFinite(e.motor?.eficiencia) ? e.motor.eficiencia * 100 : null,
    { max: 100, fmt: v => `${Math.round(v)}%`, unidade: 'de eficiência' });
  // Etapa 6: só as rodadas do modo adaptativo entram neste gráfico.
  renderMetricBars(document.querySelector('#grafico-adaptativo'), entries.filter(e => e.adaptativo),
    e => e.adaptativo?.finalPx ?? null,
    { max: ADAPTIVE.maxPx, fmt: v => String(Math.round(v)), unidade: 'pixels' });
  renderMetricBars(document.querySelector('#grafico-throughput'), entries,
    e => e.motor?.throughput ?? null,
    { fmt: v => fmtDec(v, 1), unidade: 'bits por segundo' });
}

// ---------- Célula "Movimento" da tabela ----------
function buildMotorCell(entry) {
  const td = document.createElement('td');
  td.className = 'config-cell';
  const m = entry.motor;
  if (!m) { td.textContent = 'Não medido (partida anterior à atualização)'; return td; }
  const linhas = [];
  const algum = ['distCentroAcertoPx', 'tReacaoMs', 'eficiencia', 'throughput'].some(k => Number.isFinite(m[k]));
  if (!algum) linhas.push('Não se aplica (teclado ou varredura) ou sem acertos');
  if (Number.isFinite(m.distCentroAcertoPx)) linhas.push(`Distância do centro: ${fmtDec(m.distCentroAcertoPx)} px`);
  if (Number.isFinite(m.tReacaoMs)) linhas.push(`Reação: ${fmtDec(m.tReacaoMs / 1000, 2)} s`);
  if (Number.isFinite(m.tMovimentoMs)) linhas.push(`Movimento: ${fmtDec(m.tMovimentoMs / 1000, 2)} s`);
  if (Number.isFinite(m.eficiencia)) linhas.push(`Eficiência do caminho: ${Math.round(m.eficiencia * 100)}%`);
  if (Number.isFinite(m.throughput)) linhas.push(`Throughput: ${fmtDec(m.throughput, 2)} bits/s`);
  // Etapa 3: acertos antes/depois do destaque de ajuda.
  const dq = entry.destaque;
  if (dq && dq.ms > 0) linhas.push(`Acertos depois do destaque: ${dq.depois} de ${dq.antes + dq.depois}`);
  else if (dq && dq.ms === 0) linhas.push('Destaque de ajuda desligado');
  // Etapa 4: ações ignoradas pelo filtro de tremor.
  if (entry.tremorIgnorados > 0) linhas.push(`Ignorados pelo filtro de tremor: ${entry.tremorIgnorados}`);
  // Etapa 9: resumo curto visível; o restante abre ao tocar em "ver tudo".
  const resumo = Number.isFinite(m.eficiencia) ? `Eficiência ${Math.round(m.eficiencia * 100)}%`
    : Number.isFinite(m.distCentroAcertoPx) ? `Centro a ${fmtDec(m.distCentroAcertoPx)} px` : 'Indicadores';
  celulaRecolhivel(td, `${resumo} — ver tudo`, linhas);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'button-secondary button-small';
  btn.textContent = 'Ver caminho do cursor';
  btn.setAttribute('aria-label', `Ver caminho do cursor da partida de ${new Date(entry.date).toLocaleString('pt-BR')}`);
  btn.addEventListener('click', () => openTrajectory(entry));
  td.appendChild(btn);
  return td;
}

// ---------- Exportações CSV detalhadas ----------
function downloadCsv(nomeArquivo, linhas) {
  const csv = '﻿' + linhas.map(l => l.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = nomeArquivo;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const num = (n, casas) => Number.isFinite(n) ? (casas === undefined ? n : n.toFixed(casas)) : '';
const DEVICE_CSV = { mouse: 'Mouse', toque: 'Toque', caneta: 'Caneta', teclado: 'Teclado/acionador' };

// Colunas de movimento no CSV principal (uma linha por partida). Partidas antigas ficam em branco.
function motorCsvCols(m) {
  if (!m) return new Array(13).fill('');
  return [m.alvosMedidos ?? '', num(m.distCentroAcertoPx, 1), num(m.distCentroAcertoRel, 3), num(m.distCentroErroPx, 1),
    Number.isFinite(m.tReacaoMs) ? num(m.tReacaoMs / 1000, 3) : '', Number.isFinite(m.tMovimentoMs) ? num(m.tMovimentoMs / 1000, 3) : '',
    Number.isFinite(m.eficiencia) ? num(m.eficiencia * 100, 1) : '', num(m.idMedioBits, 2), num(m.idEfetivoBits, 2),
    num(m.larguraEfetivaPx, 1), num(m.throughput, 2),
    m.fittsMetodo === 'efetiva' ? 'Largura efetiva (ISO 9241-411)' : m.fittsMetodo === 'nominal' ? 'Tamanho real da figura (poucos alvos)' : '',
    m.fittsN ?? ''];
}

// Uma linha por clique (acertos e erros), com todos os indicadores do alvo.
async function exportClicksCsv() {
  const entries = currentReportEntries.filter(e => e.id && e.motor);
  const det = await lerDetalhes(entries.map(e => e.id));
  const header = ['Data', 'Jogador', 'Código do participante', 'Código da partida', 'Fase', 'Alvo nº', 'Figura', 'Tipo de clique', 'Dispositivo',
    'Tempo desde a figura aparecer (s)', 'Clique X (px)', 'Clique Y (px)', 'Centro X (px)', 'Centro Y (px)', 'Diâmetro (px)',
    'Distância ao centro (px)', 'Distância relativa ao raio (0=centro, 1=borda)', 'Cursor no início X (px)', 'Cursor no início Y (px)',
    'Tempo de reação (s)', 'Tempo de movimento (s)', 'Distância em linha reta (px)', 'Distância percorrida (px)', 'Eficiência do caminho (%)',
    'Distância até a figura (px)', 'Índice de dificuldade (bits)', 'Usado no throughput', 'Figura reposicionada', 'Amostras da trajetória',
    'Destaque já aparecia', 'Destaque apareceu em (s)', 'Margem invisível (px)', 'Permanência (s)', 'Parte da varredura'];
  // Colunas do destaque (Etapa 3) e do acionamento (Etapa 4). Registros antigos ficam em branco.
  const destaqueCols = (a, clique) => [
    clique.aposDestaque === undefined ? '' : clique.aposDestaque ? 'Sim' : 'Não',
    Number.isFinite(a.destaqueEm) ? num(a.destaqueEm / 1000, 2) : '',
    Number.isFinite(a.margem) ? a.margem : '',
    Number.isFinite(clique.permanenciaMs) ? clique.permanenciaMs / 1000 : '',
    clique.celula ?? ''];
  const linhas = [header];
  let semDetalhes = 0;
  for (const e of entries) {
    const d = det.get(e.id);
    if (!d) { semDetalhes++; continue; }
    for (const a of d.alvos) {
      const base = [e.date, e.profileName, e.profileCode || '', e.id, e.phase ?? '', a.n, a.forma];
      for (const er of a.erros) {
        linhas.push([...base, 'Erro (fora da figura)', DEVICE_CSV[er.dispositivo] || '', num(er.t / 1000, 2), num(er.x), num(er.y),
          a.cx, a.cy, a.d, num(er.dist, 1), a.d ? num(er.dist / (a.d / 2), 3) : '', a.inicio?.x ?? '', a.inicio?.y ?? '',
          '', '', '', '', '', '', '', '', a.reposicionado ? 'Sim' : 'Não', '', ...destaqueCols(a, er)]);
      }
      if (a.acerto) {
        const m = a.metricas || {};
        linhas.push([...base, 'Acerto', DEVICE_CSV[a.acerto.dispositivo] || '', num(a.acerto.t / 1000, 2), num(a.acerto.x), num(a.acerto.y),
          a.cx, a.cy, a.d, num(m.distCentroPx, 1), num(m.distCentroRel, 3), a.inicio?.x ?? '', a.inicio?.y ?? '',
          Number.isFinite(m.tReacaoMs) ? num(m.tReacaoMs / 1000, 3) : '', Number.isFinite(m.tMovimentoMs) ? num(m.tMovimentoMs / 1000, 3) : '',
          num(m.distRetaPx, 1), num(m.distPercorridaPx, 1), Number.isFinite(m.eficiencia) ? num(m.eficiencia * 100, 1) : '',
          num(m.amplitudePx, 1), num(m.idBits, 3), m.usadoFitts ? 'Sim' : 'Não', a.reposicionado ? 'Sim' : 'Não', m.amostras ?? '',
          ...destaqueCols(a, a.acerto)]);
      }
    }
  }
  if (linhas.length === 1) {
    historyNotice.textContent = 'Não há detalhes de cliques guardados neste navegador para as partidas filtradas.';
    return;
  }
  downloadCsv('cliques-clique-bom-' + new Date().toISOString().slice(0, 10) + '.csv', linhas);
  historyNotice.textContent = semDetalhes ? `${semDetalhes} partida(s) não tinham detalhes guardados neste navegador e ficaram de fora.` : '';
}

// Uma linha por ponto da trajetória do cursor.
async function exportTrajectoriesCsv() {
  const entries = currentReportEntries.filter(e => e.id && e.motor);
  const det = await lerDetalhes(entries.map(e => e.id));
  const linhas = [['Data', 'Jogador', 'Código do participante', 'Código da partida', 'Fase', 'Alvo nº', 'Tempo desde a figura aparecer (ms)', 'X (px)', 'Y (px)', 'Tipo de ponto']];
  for (const e of entries) {
    const d = det.get(e.id);
    if (!d) continue;
    for (const a of d.alvos) {
      const base = [e.date, e.profileName, e.profileCode || '', e.id, e.phase ?? '', a.n];
      if (a.inicio) linhas.push([...base, 0, a.inicio.x, a.inicio.y, 'Posição quando a figura apareceu']);
      for (let i = 0; i < a.traj.length; i += 3) linhas.push([...base, a.traj[i], a.traj[i + 1], a.traj[i + 2], 'Trajetória']);
      if (a.acerto && a.acerto.x !== null) linhas.push([...base, a.acerto.t, a.acerto.x, a.acerto.y, 'Clique de acerto']);
    }
  }
  if (linhas.length === 1) {
    historyNotice.textContent = 'Não há trajetórias guardadas neste navegador para as partidas filtradas.';
    return;
  }
  downloadCsv('trajetorias-clique-bom-' + new Date().toISOString().slice(0, 10) + '.csv', linhas);
}
document.querySelector('#btn-exportar-cliques').addEventListener('click', exportClicksCsv);
document.querySelector('#btn-exportar-trajetorias').addEventListener('click', exportTrajectoriesCsv);

// ---------- Desenho do caminho do cursor ----------
const trajDialog = document.querySelector('#modal-trajetoria');
const trajSelect = document.querySelector('#trajetoria-alvo');
const trajBox = document.querySelector('#trajetoria-desenho');
const trajInfo = document.querySelector('#trajetoria-info');
const trajResumo = document.querySelector('#trajetoria-resumo');
// Cores dos caminhos. A cor nunca é a única pista: cada caminho tem o número do alvo.
const TRAJ_CORES = ['#1458ae', '#a33425', '#197348', '#8745a7', '#9a5013', '#096c79'];
let trajDetalhes = null;

document.querySelector('#btn-fechar-trajetoria').addEventListener('click', () => trajDialog.close());
trajSelect.addEventListener('change', () => { if (trajDetalhes) drawTrajectory(trajDetalhes, trajSelect.value); });

async function openTrajectory(entry) {
  trajDetalhes = null;
  trajBox.replaceChildren(); trajSelect.replaceChildren(); trajResumo.textContent = '';
  trajInfo.textContent = `${entry.profileName || 'Jogador'} · ${new Date(entry.date).toLocaleString('pt-BR')} · Fase ${entry.phase ?? '—'}`;
  trajBox.textContent = 'Carregando…';
  if (!trajDialog.open) trajDialog.showModal();
  const det = (await lerDetalhes([entry.id])).get(entry.id);
  if (!det || !det.alvos?.length) {
    trajBox.textContent = 'Os detalhes desta partida não estão guardados neste navegador.';
    trajSelect.disabled = true;
    return;
  }
  trajDetalhes = det;
  trajSelect.disabled = false;
  const todos = document.createElement('option'); todos.value = 'todos'; todos.textContent = 'Todos os alvos';
  trajSelect.appendChild(todos);
  for (const a of det.alvos) {
    const o = document.createElement('option'); o.value = String(a.n);
    o.textContent = `Alvo ${a.n} — ${a.forma}${a.acerto ? '' : ' (não acertado)'}`;
    trajSelect.appendChild(o);
  }
  drawTrajectory(det, 'todos');
}

function drawTrajectory(det, qual) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const alvos = qual === 'todos' ? det.alvos : det.alvos.filter(a => String(a.n) === qual);
  const W = det.area?.largura || 700, H = det.area?.altura || 360;
  // O cursor pode ter passado fora da área de jogo: ampliamos o desenho para caber tudo.
  let minX = 0, minY = 0, maxX = W, maxY = H;
  const inclui = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); } };
  for (const a of alvos) {
    if (a.inicio) inclui(a.inicio.x, a.inicio.y);
    for (let i = 0; i < a.traj.length; i += 3) inclui(a.traj[i + 1], a.traj[i + 2]);
  }
  const m = 12;
  const svg = el('svg', { viewBox: `${minX - m} ${minY - m} ${maxX - minX + 2 * m} ${maxY - minY + 2 * m}`, class: 'trajectory-svg', 'aria-hidden': 'true' });
  svg.appendChild(el('rect', { x: 0, y: 0, width: W, height: H, rx: 14, class: 'traj-area' }));
  const tam = Math.max(12, Math.min(W, H) / 22); // tamanho dos símbolos, proporcional à área
  for (const a of alvos) {
    const cor = TRAJ_CORES[(a.n - 1) % TRAJ_CORES.length];
    svg.appendChild(el('circle', { cx: a.cx, cy: a.cy, r: a.d / 2, class: 'traj-alvo', stroke: cor }));
    const rot = el('text', { x: a.cx, y: a.cy, class: 'traj-num', 'font-size': tam * 1.4, fill: cor }); rot.textContent = String(a.n);
    svg.appendChild(rot);
    const pts = [];
    if (a.inicio) pts.push([a.inicio.x, a.inicio.y]);
    for (let i = 0; i < a.traj.length; i += 3) pts.push([a.traj[i + 1], a.traj[i + 2]]);
    if (a.acerto && a.acerto.x !== null) pts.push([a.acerto.x, a.acerto.y]);
    if (pts.length >= 2) svg.appendChild(el('polyline', { points: pts.map(p => p.join(',')).join(' '), class: 'traj-linha', stroke: cor }));
    if (a.inicio) svg.appendChild(el('rect', { x: a.inicio.x - tam / 3, y: a.inicio.y - tam / 3, width: tam / 1.5, height: tam / 1.5, fill: cor, class: 'traj-inicio' }));
    for (const er of a.erros) {
      if (er.x === null) continue;
      const s = tam / 2.2;
      svg.appendChild(el('path', { d: `M${er.x - s},${er.y - s}L${er.x + s},${er.y + s}M${er.x + s},${er.y - s}L${er.x - s},${er.y + s}`, class: 'traj-erro' }));
    }
    if (a.acerto && a.acerto.x !== null) svg.appendChild(el('circle', { cx: a.acerto.x, cy: a.acerto.y, r: tam / 3, fill: cor, class: 'traj-acerto' }));
  }
  trajBox.replaceChildren(svg);
  // Resumo em texto: o desenho também precisa ser compreensível sem enxergar as cores.
  const acertos = alvos.filter(a => a.acerto).length;
  const erros = alvos.reduce((n, a) => n + a.erros.length, 0);
  const efs = alvos.map(a => a.metricas?.eficiencia).filter(Number.isFinite);
  const semCursor = alvos.every(a => a.traj.length === 0);
  trajResumo.textContent = `${alvos.length} alvo(s) mostrados · ${acertos} acerto(s) · ${erros} clique(s) fora da figura` +
    (efs.length ? ` · eficiência média do caminho: ${Math.round(efs.reduce((s, n) => s + n, 0) / efs.length * 100)}%` : '') +
    (semCursor ? ' · Sem caminho registrado (toque na tela, teclado ou varredura não movem cursor).' : '');
  trajBox.setAttribute('aria-label', 'Desenho do caminho do cursor. ' + trajResumo.textContent);
}
