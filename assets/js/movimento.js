'use strict';
// =============================================================================
// Clique Bom — medição do movimento (Etapa 2)
// -----------------------------------------------------------------------------
// Este arquivo registra, para cada alvo:
//   • onde o cursor estava quando a figura apareceu;
//   • a trajetória do cursor (x, y e tempo, a cada ~20 ms);
//   • a posição de cada clique (acertos e erros) e a distância até o centro;
//   • tempo de reação, tempo de movimento e eficiência do caminho;
//   • índice de dificuldade e throughput pela Lei de Fitts (ISO 9241-411).
//
// Onde os dados ficam:
//   • O RESUMO de cada partida (médias) vai junto com o histórico no LocalStorage.
//   • Os DETALHES (trajetórias e cada clique) vão para o IndexedDB, um banco de
//     dados que já vem no navegador e comporta muito mais informação.
//     Se o IndexedDB não estiver disponível, os detalhes ficam só na memória
//     até a página ser fechada — o jogo continua funcionando normalmente.
//
// Coordenadas: em pixels, a partir do canto superior esquerdo da área de jogo.
// Tempos: em milissegundos desde que o alvo apareceu, sem contar pausas.
// =============================================================================

// ---------- Parâmetros da medição ----------
const AMOSTRA_MIN_MS = 20;          // intervalo mínimo entre amostras da trajetória
const AMOSTRAS_MAX_POR_ALVO = 1500; // limite por alvo; acima disso, a resolução cai pela metade
const LIMIAR_MOVIMENTO_PX = 3;      // deslocamento mínimo para considerar que o movimento começou
const FITTS_MIN_ALVOS = 5;          // mínimo de alvos para usar a largura efetiva (ISO 9241-411)
const FITTS_FATOR_LARGURA = 4.133;  // We = 4,133 × desvio-padrão dos cliques (ISO 9241-411)
// Dispositivos em que o cursor se move antes do clique (permitem medir reação e trajetória).
const DISPOSITIVOS_COM_CURSOR = new Set(['mouse', 'caneta']);

// ---------- Registro durante a partida ----------
const movimento = {
  alvos: [],   // um registro por alvo apresentado
  atual: null, // alvo em andamento

  iniciarPartida() {
    this.alvos = [];
    this.atual = null;
  },

  // Chamado quando uma nova figura aparece na tela.
  iniciarAlvo({ n, forma, cx, cy, d, inicio, margem = 0 }) {
    this.atual = {
      n, forma,
      cx: Math.round(cx), cy: Math.round(cy), d: Math.round(d), // centro e diâmetro da figura
      margem,            // margem invisível de acerto (px), Etapa 4
      inicio: inicio ? { x: Math.round(inicio.x), y: Math.round(inicio.y) } : null,
      traj: [],          // trajetória "achatada": [t, x, y, t, x, y, ...] (economiza espaço)
      intervalo: AMOSTRA_MIN_MS,
      erros: [],         // cliques fora da figura enquanto este alvo estava na tela
      acerto: null,      // clique certo: { x, y, t, dispositivo, aposDestaque }
      destaqueEm: null,  // momento em que o destaque de ajuda apareceu (null = não apareceu)
      reposicionado: false
    };
    this.alvos.push(this.atual);
  },

  // O destaque de ajuda (borda piscante) apareceu neste alvo.
  destaque(t) {
    const a = this.atual;
    if (!a || a.acerto || a.destaqueEm !== null) return;
    a.destaqueEm = Math.round(t);
  },

  // Se a janela mudar de tamanho, a figura é reposicionada; marcamos isso.
  atualizarAlvo({ cx, cy, d }) {
    const a = this.atual;
    if (!a || a.acerto) return;
    a.cx = Math.round(cx); a.cy = Math.round(cy); a.d = Math.round(d);
    a.reposicionado = true;
  },

  // Uma amostra de posição do cursor.
  amostra(x, y, t) {
    const a = this.atual;
    if (!a || a.acerto) return;
    const tr = a.traj;
    if (tr.length && t - tr[tr.length - 3] < a.intervalo) return;
    tr.push(Math.max(0, Math.round(t)), Math.round(x), Math.round(y));
    // Para não pesar a memória: se passar do limite, guarda um ponto sim, outro não,
    // e passa a amostrar com o dobro do intervalo.
    if (tr.length / 3 > AMOSTRAS_MAX_POR_ALVO) {
      const reduzida = [];
      for (let i = 0; i < tr.length; i += 6) reduzida.push(tr[i], tr[i + 1], tr[i + 2]);
      a.traj = reduzida;
      a.intervalo *= 2;
    }
  },

  // Clique fora da figura. "ponto" é null quando não há posição (teclado).
  erro(ponto, t, dispositivo, extra = {}) {
    const a = this.atual;
    if (!a || a.acerto) return;
    a.erros.push({
      ...extra,          // ex.: { celula } na varredura
      x: ponto ? Math.round(ponto.x) : null,
      y: ponto ? Math.round(ponto.y) : null,
      t: Math.round(t), dispositivo,
      dist: ponto ? arred(Math.hypot(ponto.x - a.cx, ponto.y - a.cy), 1) : null,
      aposDestaque: a.destaqueEm !== null
    });
  },

  // Clique certo na figura.
  // extra: { permanenciaMs } no modo Permanência ou { celula } na varredura.
  acerto(ponto, t, dispositivo, extra = {}) {
    const a = this.atual;
    if (!a || a.acerto) return;
    a.acerto = {
      ...extra,
      x: ponto ? Math.round(ponto.x) : null,
      y: ponto ? Math.round(ponto.y) : null,
      t: Math.round(t), dispositivo,
      aposDestaque: a.destaqueEm !== null // true = acertou depois que o destaque apareceu
    };
  }
};

// Conta os acertos feitos antes e depois do destaque de ajuda aparecer (Etapa 3).
function contarDestaque(alvos, destaqueMs) {
  const acertados = alvos.filter(a => a.acerto);
  const depois = acertados.filter(a => a.acerto.aposDestaque).length;
  return { ms: destaqueMs, antes: acertados.length - depois, depois };
}

// ---------- Cálculos ----------
function arred(n, casas) {
  if (!Number.isFinite(n)) return null;
  const f = 10 ** casas;
  return Math.round(n * f) / f;
}
function mediaDe(lista) {
  const v = lista.filter(Number.isFinite);
  return v.length ? v.reduce((s, n) => s + n, 0) / v.length : null;
}
function desvioPadrao(lista) {
  if (lista.length < 2) return null;
  const m = mediaDe(lista);
  return Math.sqrt(lista.reduce((s, n) => s + (n - m) ** 2, 0) / (lista.length - 1));
}

// Calcula os indicadores de um alvo já acertado.
function calcularMetricasAlvo(a) {
  const m = {
    tTotalMs: a.acerto ? a.acerto.t : null,
    distCentroPx: null, distCentroRel: null,
    tReacaoMs: null, tMovimentoMs: null,
    distRetaPx: null, distPercorridaPx: null, eficiencia: null,
    amplitudePx: null, idBits: null, usadoFitts: false,
    amostras: a.traj.length / 3
  };
  if (!a.acerto) return m;
  const { x, y, dispositivo } = a.acerto;
  const temPonto = x !== null && y !== null;
  // Modo Permanência: os últimos segundos foram o cursor PARADO sobre a figura.
  // O movimento terminou quando a permanência começou.
  const tFim = Math.max(0, a.acerto.t - (a.acerto.permanenciaMs || 0));
  // Largura útil da figura: diâmetro + margem invisível dos dois lados (Etapa 4).
  const largura = a.d + 2 * (a.margem || 0);
  if (temPonto) {
    m.distCentroPx = arred(Math.hypot(x - a.cx, y - a.cy), 1);
    m.distCentroRel = a.d > 0 ? arred(m.distCentroPx / (a.d / 2), 3) : null; // 0 = centro, 1 = borda
  }

  // Reação, movimento e eficiência: só quando há um cursor que se move (mouse/caneta).
  if (temPonto && DISPOSITIVOS_COM_CURSOR.has(dispositivo)) {
    const pts = [];
    if (a.inicio) pts.push({ t: 0, x: a.inicio.x, y: a.inicio.y });
    for (let i = 0; i < a.traj.length; i += 3) pts.push({ t: a.traj[i], x: a.traj[i + 1], y: a.traj[i + 2] });
    pts.push({ t: a.acerto.t, x, y });
    if (pts.length >= 2) {
      const origem = pts[0];
      // O movimento começa quando o cursor se afasta mais que o limiar da posição inicial.
      const inicioMov = pts.find(p => Math.hypot(p.x - origem.x, p.y - origem.y) > LIMIAR_MOVIMENTO_PX);
      if (inicioMov) {
        // Sem posição inicial conhecida, a primeira amostra já indica movimento.
        const tInicio = Math.min(a.inicio ? inicioMov.t : origem.t, tFim);
        m.tReacaoMs = Math.round(tInicio);
        m.tMovimentoMs = Math.max(0, Math.round(tFim - tInicio));
      }
      let percorrida = 0;
      for (let i = 1; i < pts.length; i++) percorrida += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const reta = Math.hypot(x - origem.x, y - origem.y);
      m.distRetaPx = arred(reta, 1);
      m.distPercorridaPx = arred(percorrida, 1);
      // Se o cursor quase não precisou se mover, a eficiência não faz sentido.
      if (reta > LIMIAR_MOVIMENTO_PX && percorrida > 0) m.eficiencia = arred(Math.min(1, reta / percorrida), 3);
    }
  }

  // Lei de Fitts: precisa de ponto de partida e de clique com posição (não vale para teclado).
  if (temPonto && a.inicio && dispositivo !== 'teclado') {
    const A = Math.hypot(a.cx - a.inicio.x, a.cy - a.inicio.y);
    m.amplitudePx = arred(A, 1);
    // Se o cursor já estava sobre a figura (ex.: alvo fixo no centro), não houve tarefa de apontar.
    if (A >= largura / 2 && largura > 0 && tFim > 0) {
      m.idBits = arred(Math.log2(A / largura + 1), 3);
      m.usadoFitts = true;
    }
  }
  return m;
}

// Throughput da partida (ISO 9241-411, adaptado para alvos em posições variadas):
//   • dx = deslocamento do clique em relação ao centro, medido na direção do movimento;
//   • We = 4,133 × desvio-padrão de dx (largura efetiva);
//   • Ae = distância percorrida na direção do movimento;
//   • IDe = log2(Ae / We + 1); TP = média(IDe) / média(tempo em segundos).
// Com menos de 5 alvos válidos, usa o diâmetro real da figura no lugar de We.
function calcularFitts(alvos, metricas) {
  const ensaios = [];
  alvos.forEach((a, i) => {
    const m = metricas[i];
    if (!m.usadoFitts) return;
    const ux = (a.cx - a.inicio.x) / m.amplitudePx, uy = (a.cy - a.inicio.y) / m.amplitudePx;
    const dx = (a.acerto.x - a.cx) * ux + (a.acerto.y - a.cy) * uy;
    // Tempo do ensaio: até o acerto, descontando a permanência (quando houver).
    const mt = Math.max(0, a.acerto.t - (a.acerto.permanenciaMs || 0));
    ensaios.push({ A: m.amplitudePx, W: a.d + 2 * (a.margem || 0), dx, Ae: m.amplitudePx + dx, mtS: mt / 1000, id: m.idBits });
  });
  if (!ensaios.length) return { metodo: null, n: 0, larguraEfetivaPx: null, idMedio: null, idEfetivoMedio: null, throughput: null };
  const sd = desvioPadrao(ensaios.map(e => e.dx));
  const usarEfetiva = ensaios.length >= FITTS_MIN_ALVOS && sd > 0;
  const We = usarEfetiva ? FITTS_FATOR_LARGURA * sd : null;
  const ides = ensaios.map(e => Math.log2(Math.max(0, e.Ae) / (We ?? e.W) + 1));
  const mt = mediaDe(ensaios.map(e => e.mtS));
  return {
    metodo: usarEfetiva ? 'efetiva' : 'nominal',
    n: ensaios.length,
    larguraEfetivaPx: usarEfetiva ? arred(We, 1) : null,
    idMedio: arred(mediaDe(ensaios.map(e => e.id)), 2),
    idEfetivoMedio: arred(mediaDe(ides), 2),
    throughput: mt > 0 ? arred(mediaDe(ides) / mt, 2) : null
  };
}

// Junta tudo: métricas de cada alvo + resumo da partida (que vai para o histórico).
function resumirMovimento(alvos) {
  const metricas = alvos.map(calcularMetricasAlvo);
  const acertados = metricas.filter(m => m.tTotalMs !== null);
  const erros = alvos.flatMap(a => a.erros);
  const fitts = calcularFitts(alvos, metricas);
  const resumo = {
    alvosMedidos: acertados.filter(m => m.distCentroPx !== null).length,
    distCentroAcertoPx: arred(mediaDe(acertados.map(m => m.distCentroPx)), 1),
    distCentroAcertoRel: arred(mediaDe(acertados.map(m => m.distCentroRel)), 3),
    distCentroErroPx: arred(mediaDe(erros.map(e => e.dist)), 1),
    tReacaoMs: arred(mediaDe(acertados.map(m => m.tReacaoMs)), 0),
    tMovimentoMs: arred(mediaDe(acertados.map(m => m.tMovimentoMs)), 0),
    eficiencia: arred(mediaDe(acertados.map(m => m.eficiencia)), 3),
    idMedioBits: fitts.idMedio,
    idEfetivoBits: fitts.idEfetivoMedio,
    larguraEfetivaPx: fitts.larguraEfetivaPx,
    throughput: fitts.throughput,
    fittsMetodo: fitts.metodo,
    fittsN: fitts.n
  };
  const alvosComMetricas = alvos.map((a, i) => ({ ...a, metricas: metricas[i] }));
  return { resumo, alvos: alvosComMetricas };
}

// ---------- Banco de dados local (IndexedDB) ----------
const DB_NOME = 'cliquebom';
const DB_VERSAO = 1;
const DB_TABELA = 'detalhesPartidas';
const detalhesEmMemoria = new Map(); // reserva para quando o IndexedDB falhar
let bancoPromessa = null;

function abrirBanco() {
  if (bancoPromessa) return bancoPromessa;
  bancoPromessa = new Promise(resolve => {
    try {
      if (!('indexedDB' in window)) { resolve(null); return; }
      const req = indexedDB.open(DB_NOME, DB_VERSAO);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_TABELA)) {
          const tabela = db.createObjectStore(DB_TABELA, { keyPath: 'id' });
          tabela.createIndex('perfilId', 'perfilId');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch (_) { resolve(null); }
  });
  // Pede ao navegador para não apagar estes dados automaticamente quando faltar espaço.
  try { navigator.storage?.persist?.(); } catch (_) {}
  return bancoPromessa;
}

async function salvarDetalhes(registro) {
  detalhesEmMemoria.set(registro.id, registro);
  const db = await abrirBanco();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(DB_TABELA, 'readwrite');
      tx.objectStore(DB_TABELA).put(registro);
      tx.oncomplete = () => { detalhesEmMemoria.delete(registro.id); resolve(true); };
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (_) { resolve(false); }
  });
}

// Lê os detalhes de várias partidas. Retorna um Map: código da partida → detalhes.
async function lerDetalhes(ids) {
  const resultado = new Map();
  for (const id of ids) if (detalhesEmMemoria.has(id)) resultado.set(id, detalhesEmMemoria.get(id));
  const faltam = ids.filter(id => !resultado.has(id));
  const db = await abrirBanco();
  if (!db || !faltam.length) return resultado;
  await new Promise(resolve => {
    try {
      const tabela = db.transaction(DB_TABELA, 'readonly').objectStore(DB_TABELA);
      let pendentes = faltam.length;
      for (const id of faltam) {
        const req = tabela.get(id);
        req.onsuccess = () => { if (req.result) resultado.set(id, req.result); if (--pendentes === 0) resolve(); };
        req.onerror = () => { if (--pendentes === 0) resolve(); };
      }
    } catch (_) { resolve(); }
  });
  return resultado;
}

// Lê todos os detalhes de um perfil (usado no backup da Etapa 5).
async function lerDetalhesDoPerfil(perfilId) {
  const lista = [...detalhesEmMemoria.values()].filter(r => r.perfilId === perfilId);
  const db = await abrirBanco();
  if (!db) return lista;
  const doBanco = await new Promise(resolve => {
    try {
      const req = db.transaction(DB_TABELA, 'readonly').objectStore(DB_TABELA).index('perfilId').getAll(IDBKeyRange.only(perfilId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch (_) { resolve([]); }
  });
  const ids = new Set(lista.map(r => r.id));
  return [...lista, ...doBanco.filter(r => !ids.has(r.id))];
}

// Apaga todos os detalhes de um perfil (ao apagar histórico ou excluir perfil).
async function apagarDetalhesDoPerfil(perfilId) {
  for (const [id, r] of detalhesEmMemoria) if (r.perfilId === perfilId) detalhesEmMemoria.delete(id);
  const db = await abrirBanco();
  if (!db) return;
  await new Promise(resolve => {
    try {
      const tx = db.transaction(DB_TABELA, 'readwrite');
      const req = tx.objectStore(DB_TABELA).index('perfilId').openCursor(IDBKeyRange.only(perfilId));
      req.onsuccess = () => { const c = req.result; if (c) { c.delete(); c.continue(); } };
      tx.oncomplete = resolve; tx.onerror = resolve; tx.onabort = resolve;
    } catch (_) { resolve(); }
  });
}
