'use strict';

const DIFFICULTIES = {
  facil: { total: 5, size: 'grande', label: 'Fácil' },
  medio: { total: 10, size: 'normal', label: 'Médio' },
  avancado: { total: 15, size: 'normal', label: 'Avançado' }
};
let difficulty = 'facil';
let TOTAL_TARGETS = DIFFICULTIES[difficulty].total;
const SHAPES = [
  { name: 'círculo', color: '#1458ae', svg: '<circle cx="50" cy="50" r="30" />' },
  { name: 'quadrado', color: '#a33425', svg: '<rect x="22" y="22" width="56" height="56" rx="3" />' },
  { name: 'triângulo', color: '#197348', svg: '<polygon points="50,15 85,81 15,81" />' },
  { name: 'estrela', color: '#8745a7', svg: '<polygon points="50,12 61,38 89,39 67,57 75,85 50,69 25,85 33,57 11,39 39,38" />' },
  { name: 'losango', color: '#9a5013', svg: '<polygon points="50,10 86,50 50,90 14,50" />' },
  { name: 'hexágono', color: '#096c79', svg: '<polygon points="28,15 72,15 94,50 72,85 28,85 6,50" />' }
];
// A dificuldade progride por fases, sem limite de tempo ou punição por erros.
const PHASES = [
  { total: 3, difficulty: 'facil', label: 'Primeiros movimentos' },
  { total: 5, difficulty: 'facil', label: 'Ganhando confiança' },
  { total: 7, difficulty: 'medio', label: 'Novos desafios' },
  { total: 10, difficulty: 'medio', label: 'Mais prática' },
  { total: 12, difficulty: 'avancado', label: 'Superando desafios' },
  { total: 15, difficulty: 'avancado', label: 'Grande conquista' }
];
// Tamanho gradual da área clicável em cada fase (px).
// O tamanho personalizado funciona como limite mínimo de acessibilidade.
const PHASE_DIAMETERS = [160, 138, 116, 94, 76, 60];
const CUSTOM_MINIMUMS = { normal: 60, grande: 112, extra: 148 };
function effectiveTargetDiameter() {
  const phaseDiameter = PHASE_DIAMETERS[phaseIndex];
  return customSize ? Math.max(phaseDiameter, CUSTOM_MINIMUMS[targetSize] || 76) : phaseDiameter;
}
// Medalhas permanentes por jogador. Os registros históricos antigos podem desbloquear
// medalhas retroativamente; o histórico limitado não representa todas as partidas da vida.
const BADGES = [
  {id:'precisao70', icon:'🎯', name:'Mira em evolução', group:'Precisão', description:'Concluir uma fase com pelo menos 70% de precisão.', test:e=>e.completed && accuracyOf(e)>=70},
  {id:'precisao85', icon:'🎯', name:'Boa precisão', group:'Precisão', description:'Concluir uma fase com pelo menos 85% de precisão.', test:e=>e.completed && accuracyOf(e)>=85},
  {id:'precisao100', icon:'🏅', name:'Precisão perfeita', group:'Precisão', description:'Concluir uma fase sem cliques fora do alvo.', test:e=>e.completed && e.hits>0 && e.misses===0},
  {id:'tempo15', icon:'⏱️', name:'Ritmo de 15 segundos', group:'Tempo', description:'Concluir uma fase com média de até 15 segundos por alvo.', test:e=>e.completed && Number.isFinite(e.averageTargetMs) && e.averageTargetMs<=15000},
  {id:'tempo10', icon:'⏱️', name:'Ritmo de 10 segundos', group:'Tempo', description:'Concluir uma fase com média de até 10 segundos por alvo.', test:e=>e.completed && Number.isFinite(e.averageTargetMs) && e.averageTargetMs<=10000},
  {id:'tempo5', icon:'⚡', name:'Ritmo de 5 segundos', group:'Tempo', description:'Concluir uma fase com média de até 5 segundos por alvo.', test:e=>e.completed && Number.isFinite(e.averageTargetMs) && e.averageTargetMs<=5000},
  {id:'nivel2', icon:'🌱', name:'Primeiros avanços', group:'Fases', description:'Concluir a fase 2.', test:e=>e.completed && e.phase>=2},
  {id:'nivel4', icon:'🌿', name:'Evolução constante', group:'Fases', description:'Concluir a fase 4.', test:e=>e.completed && e.phase>=4},
  {id:'nivel6', icon:'🏆', name:'Todas as fases', group:'Fases', description:'Concluir a fase 6.', test:e=>e.completed && e.phase>=6},
  {id:'primeira', icon:'⭐', name:'Primeira conquista', group:'Participação', description:'Concluir a primeira fase.', test:e=>e.completed},
  {id:'persistencia', icon:'💪', name:'Persistência', group:'Participação', description:'Concluir uma fase após pelo menos 5 cliques fora do alvo.', test:e=>e.completed && e.misses>=5},
  {id:'cinco', icon:'🌟', name:'Cinco conclusões', group:'Participação', description:'Concluir 5 partidas.', aggregate:es=>es.filter(e=>e.completed).length>=5},
  {id:'dez', icon:'✨', name:'Dez conclusões', group:'Participação', description:'Concluir 10 partidas.', aggregate:es=>es.filter(e=>e.completed).length>=10},
  {id:'tresdias', icon:'📅', name:'Três dias de prática', group:'Participação', description:'Registrar partidas em 3 dias diferentes.', aggregate:es=>new Set(es.map(e=>e.date.slice(0,10))).size>=3},
  {id:'cem', icon:'💯', name:'100 acertos', group:'Participação', description:'Somar 100 acertos registrados.', aggregate:es=>es.reduce((n,e)=>n+e.hits,0)>=100}
];
function accuracyOf(e) { const total=e.hits+e.misses; return total ? e.hits/total*100 : 0; }
function getEarnedBadges() {
  try { const value=JSON.parse(profileGet('badges')||'{}'); return value && typeof value==='object' && !Array.isArray(value) ? value : {}; }
  catch (_) { return {}; }
}
function updateBadges() {
  const earned=getEarnedBadges(); const newOnes=[];
  for (const badge of BADGES) {
    if (earned[badge.id]) continue;
    const qualifies=badge.aggregate ? badge.aggregate(historyEntries) : historyEntries.some(e=>badge.test(e));
    if (qualifies) { earned[badge.id]=new Date().toISOString(); newOnes.push(badge); }
  }
  if (newOnes.length) profileSet('badges',JSON.stringify(earned));
  return newOnes;
}
function renderBadges() {
  updateBadges();
  const earned=getEarnedBadges();
  const current=profiles.find(p=>p.id===activeProfileId);
  document.querySelector('#medalhas-perfil').textContent='Jogador: '+(current?.name||'Jogador');
  document.querySelector('#medalhas-progresso').textContent=`${BADGES.filter(b=>earned[b.id]).length} de ${BADGES.length} medalhas conquistadas`;
  const grid=document.querySelector('#grade-medalhas'); grid.replaceChildren();
  for (const badge of BADGES) {
    const unlocked=Boolean(earned[badge.id]);
    const card=document.createElement('article'); card.className='achievement'+(unlocked?' unlocked':' locked');
    const symbol=document.createElement('span'); symbol.className='achievement-icon'; symbol.textContent=unlocked?badge.icon:'🔒'; symbol.setAttribute('aria-hidden','true');
    const title=document.createElement('h2'); title.textContent=badge.name;
    const category=document.createElement('span'); category.className='achievement-category'; category.textContent=badge.group;
    const detail=document.createElement('p'); detail.textContent=badge.description;
    const status=document.createElement('p'); status.className='achievement-status';
    status.textContent=unlocked?'Conquistada em '+new Date(earned[badge.id]).toLocaleDateString('pt-BR'):'Ainda não conquistada';
    card.append(symbol,category,title,detail,status); grid.append(card);
  }
}
const PROFILE_KEY = 'jogo-cliques-perfis-v1';
const ACTIVE_PROFILE_KEY = 'jogo-cliques-perfil-ativo-v1';
const PROFILE_DATA_PREFIX = 'jogo-cliques-dados-perfil-v1:';
const LEGACY_PHASE_KEY = 'jogo-cliques-fase-v1';
const LEGACY_HISTORY_KEY = 'jogo-cliques-historico-v1';
const LEGACY_PREF_KEY = 'jogo-cliques-acessibilidade-v1';
const profileList = document.querySelector('#lista-perfis');
const profileNotice = document.querySelector('#perfil-aviso');
const profileMenu = document.querySelector('#perfil-menu');
const profileForm = document.querySelector('#form-perfil');
const profileNameInput = document.querySelector('#nome-perfil');
let profiles = [];
let activeProfileId = '';
let profileStorageAvailable = true;
function storageGet(key) {
  try { return localStorage.getItem(key); }
  catch (_) { profileStorageAvailable = false; return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch (_) { profileStorageAvailable = false; return false; }
}
function storageRemove(key) {
  try { localStorage.removeItem(key); }
  catch (_) { profileStorageAvailable = false; }
}
function makeProfileId() {
  return 'p-' + (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
}
function profileDataKey(id, field) { return PROFILE_DATA_PREFIX + id + ':' + field; }
function profileGet(field) { return storageGet(profileDataKey(activeProfileId, field)); }
function profileSet(field, value) { return storageSet(profileDataKey(activeProfileId, field), value); }
function initProfiles() {
  try {
    const loaded = JSON.parse(storageGet(PROFILE_KEY) || 'null');
    if (Array.isArray(loaded)) {
      profiles = loaded.filter(p => p && typeof p.id === 'string' && /^p-[a-z0-9-]+$/i.test(p.id)
        && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 40).slice(0, 50)
        // Código do participante (Etapa 5) é opcional; se estiver inválido, é descartado.
        .map(p => (p.codigo !== undefined && !(typeof p.codigo === 'string' && /^[A-Za-z0-9_-]{1,20}$/.test(p.codigo)))
          ? (({ codigo, ...resto }) => resto)(p) : p);
    }
  } catch (_) {}
  if (!profiles.length) {
    const initial = { id: makeProfileId(), name: 'Jogador 1' };
    profiles = [initial];
    // Migração: dados da versão anterior são associados ao primeiro perfil.
    for (const [legacy, field] of [[LEGACY_PHASE_KEY,'phase'], [LEGACY_HISTORY_KEY,'history'], [LEGACY_PREF_KEY,'preferences']]) {
      const old = storageGet(legacy);
      if (old !== null) storageSet(profileDataKey(initial.id, field), old);
    }
    storageSet(PROFILE_KEY, JSON.stringify(profiles));
  }
  const chosen = storageGet(ACTIVE_PROFILE_KEY);
  activeProfileId = profiles.some(p => p.id === chosen) ? chosen : profiles[0].id;
  storageSet(ACTIVE_PROFILE_KEY, activeProfileId);
}
initProfiles();
// Converte dados de versões anteriores para o formato atual (ver dados.js).
// Faz uma cópia de segurança antes e nunca apaga informações.
migrarDadosSeNecessario(profiles, profileDataKey);
function renderProfiles() {
  profileList.replaceChildren();
  const active = profiles.find(p => p.id === activeProfileId);
  profileMenu.textContent = 'Jogador atual: ' + (active?.name || 'Jogador');
  for (const p of profiles) {
    const row = document.createElement('div');
    row.className = 'profile-row';
    const label = document.createElement('span');
    label.textContent = profileLabel(p) + (p.id === activeProfileId ? ' — selecionado' : '');
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.textContent = p.id === activeProfileId ? 'Perfil ativo' : 'Selecionar';
    choose.disabled = p.id === activeProfileId;
    choose.addEventListener('click', () => switchProfile(p.id));
    // Ações protegidas pelo PIN do modo profissional (Etapa 5).
    const smallButton = (text, aria, action) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'button-secondary'; b.textContent = text;
      b.setAttribute('aria-label', aria);
      b.addEventListener('click', action);
      return b;
    };
    const edit = smallButton('Editar', 'Editar apelido e código de ' + p.name,
      async () => { if (await exigirModoProfissional()) abrirEdicaoPerfil(p); });
    const backup = smallButton('Exportar backup', 'Exportar backup do perfil de ' + p.name, () => exportarBackup([p]));
    const remove = smallButton('Excluir', 'Excluir perfil de ' + p.name, () => deleteProfile(p.id));
    remove.disabled = profiles.length === 1;
    row.append(label, choose, edit, backup, remove);
    profileList.appendChild(row);
  }
  profileNotice.textContent = profileStorageAvailable
    ? '' : 'O armazenamento local está indisponível. Perfis e resultados podem não permanecer após fechar a página.';
  if (typeof atualizarBarrasPro === 'function') atualizarBarrasPro();
}
// Apelido com o código do participante entre parênteses, quando houver.
function profileLabel(p) {
  return p.codigo ? `${p.name} (${p.codigo})` : p.name;
}
function switchProfile(id) {
  if (!profiles.some(p => p.id === id) || id === activeProfileId) return;
  stopScan();
  resetGame(false);
  activeProfileId = id;
  storageSet(ACTIVE_PROFILE_KEY, id);
  loadProfileState();
  applyPreferences();
  renderProfiles();
  profileNotice.textContent = 'Perfil selecionado: ' + profiles.find(p => p.id === id).name;
}
async function deleteProfile(id) {
  if (profiles.length <= 1) return;
  if (!(await exigirModoProfissional())) return; // exige o PIN (Etapa 5)
  const p = profiles.find(item => item.id === id);
  if (!p || !window.confirm('Excluir o perfil "' + p.name + '" e todos os seus resultados e preferências neste navegador?')) return;
  for (const field of ['phase','history','preferences','badges']) storageRemove(profileDataKey(id, field));
  apagarDetalhesDoPerfil(id); // trajetórias e cliques guardados no IndexedDB
  profiles = profiles.filter(item => item.id !== id);
  storageSet(PROFILE_KEY, JSON.stringify(profiles));
  if (activeProfileId === id) {
    activeProfileId = profiles[0].id;
    storageSet(ACTIVE_PROFILE_KEY, activeProfileId);
    loadProfileState();
    applyPreferences();
  }
  renderProfiles();
  profileNotice.textContent = 'Perfil excluído.';
}
profileForm.addEventListener('submit', async event => {
  event.preventDefault();
  // Junta espaços repetidos em um só.
  const name = profileNameInput.value.trim().replace(/\s+/g, ' ');
  const codeInput = document.querySelector('#codigo-perfil');
  const codigo = codeInput.value.trim();
  const erro = validarApelidoECodigo(name, codigo, null);
  if (erro) { profileNotice.textContent = erro; return; }
  if (profiles.length >= 50) { profileNotice.textContent = 'Limite de 50 perfis atingido.'; return; }
  // Orienta o uso de apelido em vez do nome completo (LGPD), sem bloquear.
  if (!(await confirmarSeParecerNomeCompleto(name))) { profileNameInput.focus(); return; }
  const p = { id: makeProfileId(), name, ...(codigo ? { codigo } : {}) };
  profiles.push(p);
  storageSet(PROFILE_KEY, JSON.stringify(profiles));
  profileNameInput.value = '';
  codeInput.value = '';
  switchProfile(p.id);
  profileNotice.textContent = 'Perfil criado e selecionado: ' + profileLabel(p);
});
const PHASE_KEY = 'jogo-cliques-fase-v1';
let phaseIndex = 0;
try {
  const storedPhase = Number(profileGet('phase'));
  if (Number.isInteger(storedPhase) && storedPhase >= 0 && storedPhase < PHASES.length) phaseIndex = storedPhase;
} catch (_) { /* Sem armazenamento, a progressão funciona nesta sessão. */ }
function syncPhase() {
  const phase = PHASES[phaseIndex];
  difficulty = phase.difficulty;
  TOTAL_TARGETS = phase.total;
  if (!customSize) targetSize = PHASE_DIAMETERS[phaseIndex] >= 130 ? 'grande' : 'normal';
  // Modo adaptativo (Etapa 6): rodadas de 10 figuras; o rótulo de nível segue o tamanho.
  if (isAdaptive()) {
    TOTAL_TARGETS = ADAPTIVE.total;
    difficulty = difficultyForSize(currentAdaptiveSize());
  }
}
function savePhase() {
  try { profileSet('phase', String(phaseIndex)); }
  catch (_) { /* Sem armazenamento, mantém a fase na sessão. */ }
}
const POINTS_PER_HIT = 10;
const screens = [...document.querySelectorAll('.screen')];
const validIds = new Set(screens.map(screen => screen.id));
const statusMessage = document.querySelector('#estado-jogo');
const pauseButton = document.querySelector('#btn-pausar');
const restartButton = document.querySelector('#btn-reiniciar');
const endButton = document.querySelector('#btn-encerrar');
const pauseOverlay = document.querySelector('#aviso-pausa');
const progress = document.querySelector('#progresso');
const progressText = document.querySelector('#progresso-texto');
const goalDetail = document.querySelector('#detalhe-meta');
const points = document.querySelector('#pontos');
const hits = document.querySelector('#acertos');
const attempts = document.querySelector('#tentativas');
const accuracy = document.querySelector('#precisao');
const activeTimeDisplay = document.querySelector('#tempo-ativo');
const averageTimeDisplay = document.querySelector('#tempo-medio');
// Tempo sem acertar até a figura receber o destaque visual (Etapa 3).
// 0 = desligado. Configurável por jogador: desligado, 2, 5 ou 10 segundos.
const HINT_DELAY_OPTIONS = [0, 2000, 5000, 10000];
let hintDelayMs = 2000;
let activeElapsedMs = 0;
let activeStartedAt = null;
let activeTick = null;
let targetIdleTimer = null;
let targetElapsedMs = 0;
let targetStartedAt = null;
let hitResponseTimes = [];
function isActiveTime() {
  return gameState === 'executando' && !document.hidden;
}
function activeDurationMs() {
  return activeElapsedMs + (activeStartedAt === null ? 0 : performance.now() - activeStartedAt);
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function formatSeconds(ms) {
  return Number.isFinite(ms) && ms >= 0 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : '—';
}
function refreshTimePanel() {
  activeTimeDisplay.textContent = formatDuration(activeDurationMs());
  averageTimeDisplay.textContent = hitResponseTimes.length
    ? formatSeconds(hitResponseTimes.reduce((sum, time) => sum + time, 0) / hitResponseTimes.length) : '—';
}
function stopTargetHint() {
  if (targetIdleTimer !== null) clearTimeout(targetIdleTimer);
  targetIdleTimer = null;
  currentTarget?.classList.remove('target-attention');
}
function suspendTiming() {
  if (activeStartedAt !== null) {
    activeElapsedMs += performance.now() - activeStartedAt;
    activeStartedAt = null;
  }
  if (targetStartedAt !== null) {
    targetElapsedMs += performance.now() - targetStartedAt;
    targetStartedAt = null;
  }
  if (activeTick !== null) clearInterval(activeTick);
  activeTick = null;
  stopTargetHint();
  refreshTimePanel();
}
function scheduleTargetHint() {
  stopTargetHint();
  if (!isActiveTime() || !currentTarget) return;
  if (!hintDelayMs) return; // destaque desligado nas Configurações
  const remaining = Math.max(0, hintDelayMs - targetElapsedMs);
  targetIdleTimer = setTimeout(() => {
    targetIdleTimer = null;
    if (isActiveTime() && currentTarget) {
      currentTarget.classList.add('target-attention');
      // Registra o momento em que o destaque apareceu (só a primeira vez neste alvo).
      movimento.destaque(currentTargetActiveMs());
    }
  }, remaining);
}
function resumeTiming() {
  if (!isActiveTime() || activeStartedAt !== null) return;
  activeStartedAt = performance.now();
  if (currentTarget && targetStartedAt === null) targetStartedAt = performance.now();
  activeTick = setInterval(refreshTimePanel, 250);
  scheduleTargetHint();
  refreshTimePanel();
}
function resetTiming() {
  suspendTiming();
  activeElapsedMs = 0;
  targetElapsedMs = 0;
  targetStartedAt = null;
  hitResponseTimes = [];
  refreshTimePanel();
}

const summary = document.querySelector('#resumo-partida');
const resultDialog = document.querySelector('#modal-resultado');
const resultMessage = document.querySelector('#mensagem-resultado');
const closeResultButton = document.querySelector('#btn-fechar-resultado');
const summaryText = document.querySelector('#resumo-texto');
const gameArea = document.querySelector('#area-jogo');
const initialMessage = document.querySelector('#aviso-area');
const soundToggle = document.querySelector('#ativar-sons');
const motionToggle = document.querySelector('#reduzir-animacoes');
const visualFeedback = document.querySelector('#feedback-visual');
const sizeSelect = document.querySelector('#tamanho-alvo');
const contrastToggle = document.querySelector('#alto-contraste');
const fixedToggle = document.querySelector('#alvo-fixo');
const difficultySelect = document.querySelector('#nivel-dificuldade');
const difficultyDescription = document.querySelector('#descricao-dificuldade');
const challengeTitle = document.querySelector('#desafio-atual');
const phaseLabel = document.querySelector('#fase-atual');
const phaseMenu = document.querySelector('#fase-menu');
const nextPhaseButton = document.querySelector('#btn-proxima-fase');
let audioContext = null;
let feedbackTimeout = null;
let soundEnabled = true;
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const PREF_KEY = 'jogo-cliques-acessibilidade-v1';
const interactionSelect = document.querySelector('#modo-interacao');
const scanSpeedSelect = document.querySelector('#velocidade-varredura');
const hintDelaySelect = document.querySelector('#tempo-destaque');
const scanHint = document.querySelector('#aviso-varredura');
let interactionMode = 'direto';
let scanSpeed = 2000;
const HISTORY_KEY = 'jogo-cliques-historico-v1';
const HISTORY_LIMIT = 50;
const historyBody = document.querySelector('#historico-corpo');
const historyStats = document.querySelector('#historico-estatisticas');
const historyNotice = document.querySelector('#historico-aviso');
const historyFilter = document.querySelector('#filtro-historico');
const profileReportFilter = document.querySelector('#filtro-perfil-relatorio');
const pointsChart = document.querySelector('#grafico-pontos');
const accuracyChart = document.querySelector('#grafico-precisao');
const timeChart = document.querySelector('#grafico-tempo');
const targetTimeChart = document.querySelector('#grafico-tempo-alvo');
const reportKpis = document.querySelector('#relatorio-indicadores');
const reportAnalysis = document.querySelector('#relatorio-analise');
let currentReportEntries = [];
const average = numbers => numbers.length ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : null;
const validMs = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
// Cartão de indicador: valor em destaque, detalhe curto e explicação em "O que é isso?" (Etapa 9).
function reportCard(label, value, explanation) {
  criarCartaoIndicador(reportKpis, { titulo: label, valor: value, detalhe: explanation, ajuda: KPI_AJUDA[label] || '' });
}
function renderTimeBars(container, entries, field) {
  container.replaceChildren();
  const chronological = entries.slice(0, 10).reverse();
  if (!chronological.length) { container.textContent = 'Sem partidas no filtro.'; return; }
  const numbers = chronological.map(e => validMs(e[field]) ? e[field] / 1000 : null);
  if (!numbers.some(n => n !== null)) { container.textContent = 'Sem dados de tempo nas partidas selecionadas.'; return; }
  const max = Math.max(1, ...numbers.filter(n => n !== null));
  numbers.forEach((value, i) => {
    const item = document.createElement('div'); item.className = 'chart-item';
    item.setAttribute('role', 'img'); item.setAttribute('aria-label', `Partida ${i+1}: ${value === null ? 'sem registro' : value.toFixed(1) + ' segundos'}`);
    const val = document.createElement('span'); val.className = 'chart-value'; val.textContent = value === null ? '—' : value.toFixed(1).replace('.', ',') + 's';
    const track = document.createElement('div'); track.className = 'chart-track';
    const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.height = value === null ? '0%' : `${Math.min(100, value/max*100)}%`; track.appendChild(bar);
    const index = document.createElement('span'); index.className = 'chart-index'; index.textContent = String(i+1);
    item.append(val,track,index); container.appendChild(item);
  });
}
function renderProfessionalReport(entries, selected) {
  reportKpis.replaceChildren(); reportAnalysis.replaceChildren();
  const attempts = entries.reduce((n,e)=>n+e.hits+e.misses,0);
  const hits = entries.reduce((n,e)=>n+e.hits,0);
  const completed = entries.filter(e=>e.completed).length;
  const timed = entries.filter(e=>validMs(e.activeMs));
  const targetTimed = entries.filter(e=>validMs(e.averageTargetMs));
  const avgSession = average(timed.map(e=>e.activeMs));
  const totalActive = timed.reduce((n,e)=>n+e.activeMs,0);
  const weightedTargetTime = average(targetTimed.map(e=>e.averageTargetMs));
  const rates = timed.filter(e=>e.activeMs>0).map(e=>e.hits*60000/e.activeMs);
  const days = new Set(entries.map(e=>e.date.slice(0,10)));
  const phases = entries.filter(e=>Number.isInteger(e.phase)).map(e=>e.phase);
  reportCard('Partidas registradas', String(entries.length), `${days.size} dia(s) com atividade`);
  reportCard('Fases concluídas', `${completed}/${entries.length}`, entries.length ? `${Math.round(completed/entries.length*100)}% das partidas` : 'Sem partidas');
  reportCard('Precisão geral', attempts ? `${Math.round(hits/attempts*100)}%` : '—', `${hits} acertos em ${attempts} tentativas`);
  reportCard('Tempo ativo total', timed.length ? formatDuration(totalActive) : '—', `Tempo registrado em ${timed.length} partida(s)`);
  reportCard('Tempo ativo médio', avgSession === null ? '—' : formatDuration(avgSession), 'Média por partida com tempo registrado');
  reportCard('Resposta média por alvo', weightedTargetTime === null ? '—' : formatSeconds(weightedTargetTime), `Média das médias de ${targetTimed.length} partida(s)`);
  reportCard('Ritmo médio', rates.length ? `${average(rates).toFixed(1).replace('.', ',')} acertos/min` : '—', 'Apenas partidas com tempo ativo positivo');
  // Etapa 3: quantos acertos aconteceram sem precisar do destaque de ajuda.
  const withHint = entries.filter(e => e.destaque && e.destaque.ms > 0);
  const hintBefore = withHint.reduce((n, e) => n + e.destaque.antes, 0);
  const hintTotal = withHint.reduce((n, e) => n + e.destaque.antes + e.destaque.depois, 0);
  reportCard('Acertos sem precisar do destaque', hintTotal ? `${Math.round(hintBefore / hintTotal * 100)}%` : '—',
    hintTotal ? `${hintBefore} de ${hintTotal} acertos antes de a figura piscar` : 'Sem partidas com o destaque ligado');
  // Etapa 6: tamanho alcançado no modo adaptativo (última rodada do filtro).
  const adaptiveEntries = entries.filter(e => e.adaptativo && Number.isFinite(e.adaptativo.finalPx));
  reportCard('Tamanho alcançado (adaptativo)', adaptiveEntries.length ? `${adaptiveEntries[0].adaptativo.finalPx} px` : '—',
    adaptiveEntries.length ? `Rodada mais recente · ${adaptiveEntries.length} rodada(s)` : 'Sem rodadas adaptativas');
  reportCard('Maior fase registrada', phases.length ? `Fase ${Math.max(...phases)}` : '—', 'Jogada, não necessariamente concluída');
  const lines=[];
  if (!entries.length) lines.push('Ainda não há dados suficientes para analisar este filtro.');
  else {
    const chronological=entries.slice().sort((a,b)=>a.date.localeCompare(b.date));
    const first=chronological[0], last=chronological[chronological.length-1];
    const dateFmt=d=>{ const x=new Date(d);return Number.isNaN(x.getTime())?'data indisponível':x.toLocaleDateString('pt-BR'); };
    lines.push(`Período observado: ${dateFmt(first.date)} a ${dateFmt(last.date)}. ${days.size} dia(s) distintos de participação.`);
    lines.push(`${completed} partida(s) concluída(s) e ${entries.length-completed} encerrada(s) antes da meta. A conclusão depende da fase e não deve ser comparada isoladamente entre níveis.`);
    if (timed.length) lines.push(`Tempo ativo registrado em ${timed.length} de ${entries.length} partidas; média de ${formatDuration(avgSession)} por partida com tempo disponível. Pausas e aba oculta não entram nessa contagem.`);
    else lines.push('Não há registros de tempo ativo neste conjunto. Partidas anteriores à atualização não recebem estimativas.');
    if (targetTimed.length) lines.push(`Tempo médio por alvo: ${formatSeconds(weightedTargetTime)} entre as partidas com registro. Esse indicador descreve o ritmo, não a qualidade do desempenho.`);
    const recent=chronological.slice(-5), prior=chronological.slice(-10,-5);
    if (recent.length===5 && prior.length===5) {
      const precision=arr=>{const a=arr.reduce((n,e)=>n+e.hits+e.misses,0);return a?100*arr.reduce((n,e)=>n+e.hits,0)/a:null;};
      const oldP=precision(prior), newP=precision(recent);
      if (oldP!==null && newP!==null) lines.push(`Precisão: ${oldP.toFixed(1).replace('.', ',')}% nas cinco partidas anteriores e ${newP.toFixed(1).replace('.', ',')}% nas cinco mais recentes (${newP>=oldP?'+':''}${(newP-oldP).toFixed(1).replace('.', ',')} pontos percentuais). Considere diferenças de fase e tamanho dos alvos.`);
    }
    // Avisa quando as partidas foram feitas em condições diferentes (dispositivo, tamanho, modo).
    const withConfig=entries.filter(e=>e.config);
    const semConfig=entries.length-withConfig.length;
    if (semConfig) lines.push(`${semConfig} partida(s) foram feitas antes desta atualização e não têm a configuração registrada.`);
    if (withConfig.length) {
      const devices=[...new Set(withConfig.map(e=>DEVICE_LABELS[e.config.dispositivo]||e.config.dispositivo))];
      const modes=[...new Set(withConfig.map(e=>MODE_LABELS[e.config.modoInteracao]||e.config.modoInteracao))];
      const sizes=withConfig.map(e=>e.config.tamanhoAlvoPx).filter(Number.isFinite);
      const parts=[];
      if (devices.length>1) parts.push(`dispositivos (${devices.join(', ')})`);
      if (modes.length>1) parts.push(`modos de interação (${modes.join(', ')})`);
      if (sizes.length && Math.max(...sizes)!==Math.min(...sizes)) parts.push(`tamanhos de alvo (de ${Math.min(...sizes)} a ${Math.max(...sizes)} px)`);
      if (parts.length) lines.push(`Atenção: as partidas usaram ${parts.join(', ')}. Diferenças de resultado podem vir dessas condições, e não só do desempenho.`);
      else lines.push(`Todas as ${withConfig.length} partida(s) com configuração registrada usaram ${devices[0]} e ${modes[0].toLowerCase()}.`);
    }
    lines.push(...motorAnalysisLines(entries)); // frases sobre os indicadores de movimento
    if (selected==='todos') lines.push('A visão consolidada reúne jogadores com níveis e configurações diferentes; use o filtro individual para acompanhar trajetórias pessoais.');
    lines.push('Os dados são descritivos e devem ser interpretados com observação profissional e contexto de acessibilidade; não representam diagnóstico.');
  }
  const list=document.createElement('ul');
  for(const line of lines){const li=document.createElement('li');li.textContent=line;list.appendChild(li);}
  reportAnalysis.appendChild(list);
}
// Protege contra fórmulas em planilhas: textos que começam com = + @ - ganham um apóstrofo na frente.
function csvCell(value) { return '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g,'""') + '"'; }
// Colunas do relatório por partida (CSV e planilha do grupo usam as mesmas).
// As colunas antigas ficam na mesma ordem; as novas são acrescentadas no final,
// para não atrapalhar planilhas que já usam o formato anterior.
const SUMMARY_HEADER=['Data','Jogador','Fase','Dificuldade','Situação','Pontos','Acertos','Erros','Tentativas','Precisão (%)','Tempo ativo (s)','Média por alvo (s)','Menor alvo (s)','Maior alvo (s)','Acertos por minuto',
    'Código da partida','Versão do registro','Diâmetro do alvo usado (px)','Menor diâmetro (px)','Maior diâmetro (px)','Diâmetro previsto pela fase (px)','Tamanho mínimo configurado','Tamanho mínimo (px)',
    'Modo de interação','Intervalo da varredura (s)','Dispositivo','Dispositivo identificado por','Cliques com mouse','Toques na tela','Cliques com caneta','Acionamentos por teclado/acionador',
    'Alvo fixo','Alto contraste','Redução de animações','Sons','Destaque após (s)','Largura da área de jogo (px)','Altura da área de jogo (px)',
    'Alvos com posição do clique','Distância média do acerto ao centro (px)','Distância relativa ao raio (0=centro, 1=borda)','Distância média dos erros ao centro (px)',
    'Tempo de reação médio (s)','Tempo de movimento médio (s)','Eficiência do caminho média (%)','Índice de dificuldade médio (bits)',
    'Índice de dificuldade efetivo médio (bits)','Largura efetiva (px)','Throughput (bits/s)','Método do throughput','Alvos usados no throughput',
    'Acertos antes do destaque','Acertos depois do destaque',
    'Clique conta','Tempo de permanência (s)','Filtro de tremor (s)','Margem invisível (px)','Tecla extra da varredura','Partes da varredura (colunas x linhas)','Ações ignoradas pelo filtro de tremor','Código do participante',
    'Modo de dificuldade','Tamanho inicial no adaptativo (px)','Tamanho final no adaptativo (px)','Reduções de tamanho','Aumentos de tamanho'];
// Monta a linha de uma partida, na mesma ordem de SUMMARY_HEADER.
function summaryRow(e) {
    const a=e.hits+e.misses;
    const secs=ms=>validMs(ms)?(ms/1000).toFixed(2):'';
    const c=e.config;
    const configCols = c ? [
      c.tamanhoAlvoPx??'', c.tamanhoAlvoMenorPx??'', c.tamanhoAlvoMaiorPx??'', c.tamanhoFasePx??'',
      c.tamanhoMinimo==='automatico'?'Automático pela fase':(SIZE_LABELS[c.tamanhoMinimo]||c.tamanhoMinimo||''), c.tamanhoMinimoPx??'',
      MODE_LABELS[c.modoInteracao]||c.modoInteracao||'', c.velocidadeVarreduraMs?(c.velocidadeVarreduraMs/1000):'',
      DEVICE_LABELS[c.dispositivo]||c.dispositivo||'', c.dispositivoOrigem==='uso'?'Uso na partida':c.dispositivoOrigem==='tela'?'Tipo de tela (estimado)':'',
      c.entradas?.mouse??'', c.entradas?.toque??'', c.entradas?.caneta??'', c.entradas?.teclado??'',
      yesNo(c.alvoFixo), yesNo(c.altoContraste), yesNo(c.reducaoAnimacoes), yesNo(c.sons),
      c.destaqueMs===0?'Desligado':validMs(c.destaqueMs)?c.destaqueMs/1000:'', c.areaJogoPx?.largura??'', c.areaJogoPx?.altura??''
    ] : new Array(21).fill('');
    return [e.date,e.profileName,e.phase??'',DIFFICULTIES[e.difficulty].label,e.completed?'Concluída':'Encerrada',e.hits*POINTS_PER_HIT,e.hits,e.misses,a,a?(e.hits/a*100).toFixed(1):'',secs(e.activeMs),secs(e.averageTargetMs),secs(e.minTargetMs),secs(e.maxTargetMs),validMs(e.activeMs)&&e.activeMs>0?(e.hits*60000/e.activeMs).toFixed(2):'',
      e.id??'', e.v??1, ...configCols, ...motorCsvCols(e.motor),
      e.destaque?.antes??'', e.destaque?.depois??'',
      // Etapa 4: forma de acionar (partidas anteriores ficam em branco)
      c?.acionarEm ? (c.acionarEm==='soltar'?'Ao soltar':'Ao encostar/apertar') : '',
      c?.permanenciaMs ? c.permanenciaMs/1000 : '',
      Number.isFinite(c?.filtroTremorMs) ? (c.filtroTremorMs ? c.filtroTremorMs/1000 : 'Desligado') : '',
      Number.isFinite(c?.margemPx) ? c.margemPx : '',
      c?.teclaExtra ?? '', c?.partesVarredura ?? '', e.tremorIgnorados ?? '', e.profileCode ?? '',
      // Etapa 6: modo de dificuldade (partidas antigas eram sempre por fases)
      e.modoDificuldade === 'adaptativo' ? 'Adaptativo' : 'Fases',
      e.adaptativo?.inicialPx ?? '', e.adaptativo?.finalPx ?? '', e.adaptativo?.reducoes ?? '', e.adaptativo?.aumentos ?? ''];
}
function exportReportCsv() {
  const header=SUMMARY_HEADER;
  const rows=currentReportEntries.map(summaryRow);
  const csv='\uFEFF'+[header,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='relatorio-clique-bom-'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.querySelector('#btn-exportar-relatorio').addEventListener('click',exportReportCsv);
function renderBars(container, entries, metric) {
  container.replaceChildren();
  if (!entries.length) { container.textContent = 'Sem dados para exibir.'; return; }
  const chronological = entries.slice(0, 10).reverse();
  const maxPoints = Math.max(10, ...chronological.map(e => e.hits * POINTS_PER_HIT));
  chronological.forEach((entry, index) => {
    const attempts = entry.hits + entry.misses;
    const value = metric === 'points' ? entry.hits * POINTS_PER_HIT : (attempts ? Math.round(100 * entry.hits / attempts) : 0);
    const maximum = metric === 'points' ? maxPoints : 100;
    const item = document.createElement('div');
    item.className = 'chart-item';
    item.setAttribute('role', 'img');
    item.setAttribute('aria-label', `Partida ${index + 1}, ${entry.profileName || 'Jogador'}, ${DIFFICULTIES[entry.difficulty].label}, ${value}${metric === 'points' ? ' pontos' : '% de precisão'}`);
    const valueLabel = document.createElement('span');
    valueLabel.className = 'chart-value';
    valueLabel.textContent = metric === 'points' ? String(value) : `${value}%`;
    const track = document.createElement('div');
    track.className = 'chart-track';
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${Math.max(0, Math.min(100, value / maximum * 100))}%`;
    track.appendChild(bar);
    const label = document.createElement('span');
    label.className = 'chart-index';
    label.textContent = String(index + 1);
    item.append(valueLabel, track, label);
    container.appendChild(item);
  });
}

const clearHistoryButton = document.querySelector('#btn-limpar-historico');
let historyEntries = [];
let historyAvailable = true;
// Confere se um registro de partida tem os campos mínimos para ser exibido.
// Vale para partidas antigas (versão 1) e novas (versão 2 em diante).
function isValidHistoryEntry(item) {
  return Boolean(item && typeof item.date === 'string' && DIFFICULTIES[item.difficulty] &&
    Number.isInteger(item.hits) && item.hits >= 0 &&
    Number.isInteger(item.misses) && item.misses >= 0 && typeof item.completed === 'boolean');
}
try {
  const loaded = JSON.parse(profileGet('history') || '[]');
  if (Array.isArray(loaded)) historyEntries = loaded.filter(isValidHistoryEntry).slice(0, HISTORY_LIMIT);
} catch (_) { historyAvailable = false; }

// -----------------------------------------------------------------------------
// Configuração de cada partida (Etapa 1)
// Guardamos junto com o resultado tudo que pode influenciar o desempenho:
// tamanho real do alvo, tamanho mínimo, modo de interação, acessibilidade
// e o dispositivo que a pessoa realmente usou (detectado automaticamente).
// -----------------------------------------------------------------------------
const SIZE_LABELS = { normal: 'Normal', grande: 'Grande', extra: 'Extragrande' };
const MODE_LABELS = { direto: 'Direto (mouse, toque ou teclado)', permanencia: 'Permanência (cursor parado)', varredura: 'Varredura automática' };
const ACTIVATE_LABELS = { soltar: 'ao soltar', pressionar: 'ao encostar/apertar' };
const DEVICE_LABELS = { mouse: 'Mouse', toque: 'Toque na tela', caneta: 'Caneta', teclado: 'Teclado ou acionador' };
let inputCounts = { mouse: 0, toque: 0, caneta: 0, teclado: 0 };
let targetSizesPx = [];
let lastPointerType = null;
let lastPointerClient = null; // última posição conhecida do ponteiro na janela
// Guarda o tipo e a posição do último ponteiro pressionado (mouse, toque ou caneta).
document.addEventListener('pointerdown', event => {
  lastPointerType = event.pointerType;
  lastPointerClient = { x: event.clientX, y: event.clientY };
}, true);
// A contagem por tipo de entrada (inputCounts) é feita em registerHit/registerMiss.

// -----------------------------------------------------------------------------
// Medição do movimento (Etapa 2) — ligação com movimento.js
// -----------------------------------------------------------------------------
// Converte uma posição da janela para coordenadas da área de jogo.
function toAreaPoint(clientX, clientY) {
  const rect = gameArea.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}
// Centro e diâmetro da figura, em coordenadas da área de jogo.
function targetGeometry(target) {
  const r = target.getBoundingClientRect();
  const area = gameArea.getBoundingClientRect();
  return { cx: r.left - area.left + r.width / 2, cy: r.top - area.top + r.height / 2, d: r.width };
}
// Tempo desde que o alvo atual apareceu, sem contar pausas.
function currentTargetActiveMs() {
  return targetElapsedMs + (targetStartedAt === null ? 0 : performance.now() - targetStartedAt);
}
// Amostras da trajetória: usamos os eventos "agrupados" do navegador
// (getCoalescedEvents) para não perder pontos em movimentos rápidos.
document.addEventListener('pointermove', event => {
  lastPointerClient = { x: event.clientX, y: event.clientY };
  lastPointerType = event.pointerType; // necessário no modo Permanência (sem cliques)
  if (gameState !== 'executando' || !currentTarget || document.hidden) return;
  const agrupados = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
  const agora = currentTargetActiveMs();
  const rect = gameArea.getBoundingClientRect();
  for (const ev of (agrupados.length ? agrupados : [event])) {
    const atraso = Math.max(0, performance.now() - ev.timeStamp);
    movimento.amostra(ev.clientX - rect.left, ev.clientY - rect.top, agora - atraso);
  }
}, { passive: true });
function resetGameConfigTracking() {
  inputCounts = { mouse: 0, toque: 0, caneta: 0, teclado: 0 };
  targetSizesPx = [];
}
// Dispositivo mais usado na partida. Se não houve nenhum clique,
// estimamos pelo tipo de tela (tela de toque ou não).
function detectedDevice() {
  const usados = Object.entries(inputCounts).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (usados.length) return { dispositivo: usados[0][0], origem: 'uso' };
  const toque = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  return { dispositivo: toque ? 'toque' : 'mouse', origem: 'tela' };
}
function currentGameConfig() {
  const sizes = targetSizesPx.filter(n => n > 0);
  const device = detectedDevice();
  return {
    tamanhoAlvoPx: sizes.length ? Math.round(average(sizes)) : null, // tamanho realmente desenhado (média)
    tamanhoAlvoMenorPx: sizes.length ? Math.min(...sizes) : null,
    tamanhoAlvoMaiorPx: sizes.length ? Math.max(...sizes) : null,
    tamanhoFasePx: PHASE_DIAMETERS[phaseIndex],                      // tamanho previsto pela fase
    tamanhoMinimo: customSize ? targetSize : 'automatico',
    tamanhoMinimoPx: customSize ? CUSTOM_MINIMUMS[targetSize] : null,
    modoInteracao: interactionMode,
    velocidadeVarreduraMs: interactionMode === 'varredura' ? scanSpeed : null,
    alvoFixo: fixedTarget,
    altoContraste: highContrast,
    reducaoAnimacoes: reducedMotion,
    sons: soundEnabled,
    destaqueMs: hintDelayMs, // 0 = destaque desligado
    // Etapa 4: forma de acionar
    acionarEm: interactionMode === 'direto' ? activateOn : null,
    permanenciaMs: interactionMode === 'permanencia' ? dwellMs : null,
    filtroTremorMs: tremorMs,
    margemPx: marginPx,
    teclaExtra: interactionMode === 'varredura' && scanKey ? scanKey.label : null,
    partesVarredura: interactionMode === 'varredura' && scanGrid ? `${scanGrid.cols}x${scanGrid.rows}` : null,
    dispositivo: device.dispositivo,
    dispositivoOrigem: device.origem,
    entradas: { ...inputCounts },
    areaJogoPx: { largura: Math.round(gameArea.clientWidth), altura: Math.round(gameArea.clientHeight) }
  };
}
const yesNo = value => value === true ? 'Sim' : value === false ? 'Não' : '';
// Lista de frases curtas descrevendo a configuração, para o histórico.
function describeConfig(c) {
  if (!c) return ['Não registrada (partida anterior à atualização)'];
  const lines = [];
  lines.push(`Alvo: ${c.tamanhoAlvoPx ?? '—'} px` + (c.tamanhoAlvoMenorPx !== c.tamanhoAlvoMaiorPx && c.tamanhoAlvoMenorPx ? ` (de ${c.tamanhoAlvoMenorPx} a ${c.tamanhoAlvoMaiorPx})` : ''));
  lines.push(c.tamanhoMinimo === 'automatico' ? 'Tamanho: automático pela fase'
    : `Tamanho mínimo: ${SIZE_LABELS[c.tamanhoMinimo] || c.tamanhoMinimo} (${c.tamanhoMinimoPx} px)`);
  lines.push('Modo: ' + (MODE_LABELS[c.modoInteracao] || c.modoInteracao) +
    (c.velocidadeVarreduraMs ? `, a cada ${c.velocidadeVarreduraMs / 1000} s` : '') +
    (c.acionarEm ? `, conta ${ACTIVATE_LABELS[c.acionarEm] || c.acionarEm}` : '') +
    (c.permanenciaMs ? `, ${c.permanenciaMs / 1000} s parado` : '') +
    (c.partesVarredura ? `, ${c.partesVarredura.replace('x', ' × ')} partes` : '') +
    (c.teclaExtra ? `, tecla extra ${c.teclaExtra}` : ''));
  if (c.filtroTremorMs) lines.push(`Filtro de tremor: ${String(c.filtroTremorMs / 1000).replace('.', ',')} s`);
  if (c.margemPx) lines.push(`Margem invisível: ${c.margemPx} px`);
  lines.push('Dispositivo: ' + (DEVICE_LABELS[c.dispositivo] || c.dispositivo) + (c.dispositivoOrigem === 'tela' ? ' (estimado)' : ''));
  lines.push(c.alvoFixo ? 'Alvo fixo no centro' : 'Alvo muda de lugar');
  lines.push(c.altoContraste ? 'Alto contraste: ligado' : 'Alto contraste: desligado');
  lines.push(c.reducaoAnimacoes ? 'Animações: reduzidas' : 'Animações: normais');
  if (Number.isFinite(c.destaqueMs)) lines.push(c.destaqueMs === 0 ? 'Destaque de ajuda: desligado' : `Destaque de ajuda: após ${c.destaqueMs / 1000} s`);
  return lines;
}
function saveHistory() {
  try { profileSet('history', JSON.stringify(historyEntries)); return true; }
  catch (_) { historyAvailable = false; return false; }
}
function recordGame(completed) {
  // Indicadores de movimento: o resumo vai para o histórico e os detalhes para o IndexedDB.
  const mov = resumirMovimento(movimento.alvos);
  const entry = {
    date: new Date().toISOString(),
    activeMs: Math.round(activeDurationMs()),
    averageTargetMs: hitResponseTimes.length
      ? Math.round(hitResponseTimes.reduce((sum, value) => sum + value, 0) / hitResponseTimes.length) : null,
    minTargetMs: hitResponseTimes.length ? Math.round(Math.min(...hitResponseTimes)) : null,
    maxTargetMs: hitResponseTimes.length ? Math.round(Math.max(...hitResponseTimes)) : null,
    // No modo adaptativo não há fase (null) e o nível segue o tamanho final da figura.
    difficulty: isAdaptive() ? difficultyForSize(currentAdaptiveSize()) : difficulty,
    phase: isAdaptive() ? null : phaseIndex + 1,
    hits: hitCount, misses: missCount, completed,
    modoDificuldade: difficultyMode,   // 'fases' ou 'adaptativo' (Etapa 6)
    adaptativo: adaptiveSummary(),     // tamanhos inicial/final e ajustes (só no adaptativo)
    v: DATA_VERSION,          // versão do formato deste registro (ver dados.js)
    id: makeGameId(),         // código único da partida
    config: currentGameConfig(),
    motor: mov.resumo,
    // Acertos antes/depois do destaque de ajuda aparecer (ms: 0 = destaque desligado).
    destaque: contarDestaque(movimento.alvos, hintDelayMs),
    // Ações ignoradas pelo filtro de tremor (não contam como erro).
    tremorIgnorados: tremorIgnored
  };
  historyEntries.unshift(entry);
  historyEntries = historyEntries.slice(0, HISTORY_LIMIT);
  saveHistory();
  // Etapa 8: se o envio estiver ligado e o perfil tiver código, manda o resumo para a planilha.
  if (enfileirarPartida(entry, profiles.find(p => p.id === activeProfileId))) enviarPendentes();
  // Gravação dos detalhes (trajetórias e cliques) em segundo plano, sem atrasar o jogo.
  salvarDetalhes({ id: entry.id, perfilId: activeProfileId, date: entry.date, v: DATA_VERSION,
    area: entry.config.areaJogoPx, alvos: mov.alvos, resumo: entry });
  return updateBadges();
}
function readProfileHistory(id) {
  if (id === activeProfileId) return historyEntries;
  try {
    const raw = JSON.parse(storageGet(profileDataKey(id, 'history')) || '[]');
    return Array.isArray(raw) ? raw.filter(isValidHistoryEntry).slice(0, HISTORY_LIMIT) : [];
  } catch (_) { return []; }
}
function refreshReportProfiles() {
  const previous = profileReportFilter.value || activeProfileId;
  profileReportFilter.replaceChildren();
  const choices = [{id:'todos',name:'Todos os jogadores'}, ...profiles];
  for (const p of choices) {
    const option = document.createElement('option'); option.value = p.id; option.textContent = p.id === 'todos' ? p.name : profileLabel(p);
    profileReportFilter.appendChild(option);
  }
  profileReportFilter.value = choices.some(p => p.id === previous) ? previous : activeProfileId;
}
function renderHistory() {
  historyBody.replaceChildren();
  const selected = profileReportFilter.value || activeProfileId;
  const selectedProfiles = selected === 'todos' ? profiles : profiles.filter(p => p.id === selected);
  const allEntries = selectedProfiles.flatMap(p => readProfileHistory(p.id).map(e => ({...e, profileName:p.name, profileCode:p.codigo || ''})));
  allEntries.sort((a,b) => b.date.localeCompare(a.date));
  const filtered = allEntries.filter(entry => historyFilter.value === 'todos' || entry.difficulty === historyFilter.value);
  currentReportEntries = filtered;
  document.querySelector('#btn-exportar-relatorio').disabled = !filtered.length;
  const anyMotor = filtered.some(e => e.motor);
  document.querySelector('#btn-exportar-cliques').disabled = !anyMotor;
  document.querySelector('#btn-exportar-trajetorias').disabled = !anyMotor;
  renderProfessionalReport(filtered, selected);
  renderMotorReport(filtered);
  renderMotorCharts(filtered);
  renderTimeBars(timeChart, filtered, 'activeMs');
  renderTimeBars(targetTimeChart, filtered, 'averageTargetMs');
  clearHistoryButton.disabled = selected === 'todos' || !allEntries.length;
  clearHistoryButton.textContent = selected === 'todos' ? 'Selecione um jogador para apagar o histórico' : 'Apagar histórico do jogador';
  historyNotice.textContent = !historyAvailable
    ? 'O armazenamento local pode estar indisponível. Os resultados podem não permanecer após fechar esta página.'
    : allEntries.length === 0 ? 'Ainda não há partidas registradas para esta seleção.' : '';
  const finished = filtered.filter(entry => entry.completed).length;
  const best = filtered.length ? Math.max(...filtered.map(entry => entry.hits * POINTS_PER_HIT)) : 0;
  const totalAttempts = filtered.reduce((sum, entry) => sum + entry.hits + entry.misses, 0);
  const totalHits = filtered.reduce((sum, entry) => sum + entry.hits, 0);
  const overallAccuracy = totalAttempts ? Math.round(100 * totalHits / totalAttempts) : 0;
  const timedEntries = filtered.filter(entry => Number.isFinite(entry.activeMs) && entry.activeMs >= 0);
  const meanActiveMs = timedEntries.length
    ? timedEntries.reduce((sum, entry) => sum + entry.activeMs, 0) / timedEntries.length : null;
  historyStats.textContent = `${filtered.length} partidas · ${finished} concluídas · Melhor pontuação: ${best} · Precisão geral: ${overallAccuracy}% · Tempo médio de partida: ${meanActiveMs === null ? '—' : formatDuration(meanActiveMs)}`;
  renderBars(pointsChart, filtered, 'points');
  renderBars(accuracyChart, filtered, 'accuracy');
  if (!filtered.length && allEntries.length) historyNotice.textContent = 'Nenhuma partida neste nível.';
  for (const entry of filtered) {
    const tr = document.createElement('tr');
    const total = entry.hits + entry.misses;
    const values = [
      new Date(entry.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      entry.profileCode ? `${entry.profileName} (${entry.profileCode})` : entry.profileName,
      entry.adaptativo ? `Adaptativo — figura de ${entry.adaptativo.inicialPx} para ${entry.adaptativo.finalPx} px` : entry.phase ? `Fase ${entry.phase} — ${DIFFICULTIES[entry.difficulty].label}` : DIFFICULTIES[entry.difficulty].label,
      entry.completed ? 'Concluída' : 'Encerrada',
      String(entry.hits * POINTS_PER_HIT),
      String(entry.hits),
      total ? `${Math.round(entry.hits / total * 100)}%` : '—',
      Number.isFinite(entry.activeMs) ? formatDuration(entry.activeMs) : '—',
      validMs(entry.averageTargetMs) ? formatSeconds(entry.averageTargetMs) : '—'
    ];
    // Números secundários: ficam em "Mais números" (abre ao tocar), para a tabela caber na tela (Etapa 9).
    const moreValues = [
      `Tentativas: ${total}`,
      `Menor tempo por figura: ${validMs(entry.minTargetMs) ? formatSeconds(entry.minTargetMs) : '—'}`,
      `Maior tempo por figura: ${validMs(entry.maxTargetMs) ? formatSeconds(entry.maxTargetMs) : '—'}`,
      `Ritmo: ${validMs(entry.activeMs) && entry.activeMs > 0 ? (entry.hits * 60000 / entry.activeMs).toFixed(1).replace('.', ',') : '—'} acertos/min`
    ];
    // Nome de cada coluna em data-label: no celular a tabela vira cartões (Etapa 9).
    const labels = [...document.querySelectorAll('.history-table thead th')].map(th => th.textContent);
    values.forEach((value, i) => {
      const td = document.createElement('td');
      td.textContent = value;
      td.dataset.label = labels[i] || '';
      if (i === 0) td.className = 'cell-date';
      if (i === 1) td.className = 'cell-player';
      if (i === 3) td.className = 'cell-status ' + (entry.completed ? 'is-done' : 'is-ended');
      tr.appendChild(td);
    });
    const moreCell = document.createElement('td');
    moreCell.className = 'cell-more';
    moreCell.dataset.label = 'Mais números';
    celulaRecolhivel(moreCell, `${total} tentativas, tempos e ritmo`, moreValues);
    tr.appendChild(moreCell);
    // Coluna "Movimento": indicadores da Etapa 2 e botão para ver o caminho do cursor.
    const motorCell = buildMotorCell(entry);
    motorCell.dataset.label = 'Movimento';
    tr.appendChild(motorCell);
    // Última coluna: configuração usada, recolhida para não ocupar muito espaço.
    const configCell = document.createElement('td');
    configCell.className = 'config-cell';
    configCell.dataset.label = 'Configuração usada';
    const c = entry.config;
    const resumoConfig = c ? [DEVICE_LABELS[c.dispositivo] || c.dispositivo, c.tamanhoAlvoPx ? `${c.tamanhoAlvoPx} px` : '']
      .filter(Boolean).join(' · ') : 'Não registrada';
    if (c) celulaRecolhivel(configCell, `${resumoConfig} — ver detalhes`, describeConfig(c));
    else configCell.textContent = describeConfig(c)[0];
    tr.appendChild(configCell);
    historyBody.appendChild(tr);
  }
  // Com um único jogador no filtro, o nome dele não precisa se repetir em cada cartão.
  document.querySelector('.history-table').classList.toggle('one-player', selected !== 'todos');
  aplicarPaginacao(); // mostra 10 partidas por vez (Etapa 9)
}
historyFilter.addEventListener('change', renderHistory);
profileReportFilter.addEventListener('change', renderHistory);
clearHistoryButton.addEventListener('click', async () => {
  const id = profileReportFilter.value;
  if (!id || id === 'todos') return;
  if (!(await exigirModoProfissional())) return; // exige o PIN (Etapa 5)
  const p = profiles.find(item => item.id === id);
  if (!p || !readProfileHistory(id).length || !window.confirm('Apagar definitivamente o histórico de ' + p.name + '?')) return;
  if (id === activeProfileId) { historyEntries = []; saveHistory(); }
  else storageSet(profileDataKey(id, 'history'), '[]');
  apagarDetalhesDoPerfil(id); // trajetórias e cliques guardados no IndexedDB
  renderHistory();
  historyNotice.textContent = historyAvailable ? 'Histórico apagado.' : 'Histórico apagado nesta sessão. O armazenamento está indisponível.';
});

let targetSize = 'grande';
let customSize = false;
let highContrast = false;
let fixedTarget = false;
try {
  const saved = JSON.parse(profileGet('preferences') || '{}');
  if (DIFFICULTIES[saved.difficulty]) difficulty = saved.difficulty;
  TOTAL_TARGETS = DIFFICULTIES[difficulty].total;
  customSize = saved.customSize === true;
  targetSize = DIFFICULTIES[difficulty].size;
  if (customSize && ['normal', 'grande', 'extra'].includes(saved.targetSize)) targetSize = saved.targetSize;
  highContrast = saved.highContrast === true;
  fixedTarget = saved.fixedTarget === true;
  if ([1000, 2000, 3000, 5000].includes(saved.scanSpeed)) scanSpeed = saved.scanSpeed;
  if (typeof saved.soundEnabled === 'boolean') soundEnabled = saved.soundEnabled;
  if (typeof saved.reducedMotion === 'boolean') reducedMotion = saved.reducedMotion;
  // Preferências antigas não têm este campo: mantém os 2 segundos de antes.
  if (HINT_DELAY_OPTIONS.includes(saved.hintDelayMs)) hintDelayMs = saved.hintDelayMs;
  readActivationPreferences(saved);
} catch (_) { /* Preferências indisponíveis. */ }
// Preferências de acionamento (Etapa 4). Campos ausentes mantêm o comportamento original.
function readActivationPreferences(saved) {
  interactionMode = INTERACTION_MODES.includes(saved.interactionMode) ? saved.interactionMode : 'direto';
  dwellMs = DWELL_OPTIONS.includes(saved.dwellMs) ? saved.dwellMs : 2000;
  activateOn = ACTIVATE_OPTIONS.includes(saved.activateOn) ? saved.activateOn : 'soltar';
  tremorMs = TREMOR_OPTIONS.includes(saved.tremorMs) ? saved.tremorMs : 0;
  marginPx = MARGIN_OPTIONS.includes(saved.marginPx) ? saved.marginPx : 0;
  scanKey = saved.scanKey && typeof saved.scanKey.code === 'string' && typeof saved.scanKey.label === 'string'
    ? { code: saved.scanKey.code.slice(0, 40), label: saved.scanKey.label.slice(0, 20) } : null;
  // Etapa 6: modo de dificuldade e tamanho alcançado no modo adaptativo.
  difficultyMode = DIFFICULTY_MODES.includes(saved.difficultyMode) ? saved.difficultyMode : 'fases';
  adaptiveSizePx = Number.isFinite(saved.adaptiveSizePx) && saved.adaptiveSizePx > 0 && saved.adaptiveSizePx <= 400 ? saved.adaptiveSizePx : null;
}
syncPhase();
function loadProfileState() {
  const storedPhase = Number(profileGet('phase'));
  phaseIndex = Number.isInteger(storedPhase) && storedPhase >= 0 && storedPhase < PHASES.length ? storedPhase : 0;
  try {
    const loaded = JSON.parse(profileGet('history') || '[]');
    historyEntries = Array.isArray(loaded) ? loaded.filter(isValidHistoryEntry).slice(0, HISTORY_LIMIT) : [];
  } catch (_) { historyEntries = []; }
  targetSize = 'grande';
  customSize = false;
  highContrast = false;
  fixedTarget = false;
  soundEnabled = true;
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scanSpeed = 2000;
  hintDelayMs = 2000;
  readActivationPreferences({}); // valores padrão antes de ler o perfil
  try {
    const saved = JSON.parse(profileGet('preferences') || '{}');
    customSize = saved.customSize === true;
    highContrast = saved.highContrast === true;
    fixedTarget = saved.fixedTarget === true;
    soundEnabled = saved.soundEnabled !== false;
    if (typeof saved.reducedMotion === 'boolean') reducedMotion = saved.reducedMotion;
    readActivationPreferences(saved);
    if ([1000,2000,3000,5000].includes(saved.scanSpeed)) scanSpeed = saved.scanSpeed;
    if (customSize && ['normal','grande','extra'].includes(saved.targetSize)) targetSize = saved.targetSize;
    if (HINT_DELAY_OPTIONS.includes(saved.hintDelayMs)) hintDelayMs = saved.hintDelayMs;
  } catch (_) {}
  syncPhase();
}
function savePreferences() {
  try { profileSet('preferences', JSON.stringify({targetSize, customSize, difficulty, highContrast, fixedTarget, soundEnabled, reducedMotion, interactionMode, scanSpeed, hintDelayMs,
    dwellMs, activateOn, tremorMs, marginPx, scanKey, difficultyMode, adaptiveSizePx})); }
  catch (_) { /* Navegação privada pode bloquear armazenamento. */ }
}

const starsDisplay = document.querySelector('#estrelas-partida');
function applyPreferences() {
  document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  soundToggle.checked = soundEnabled;
  motionToggle.checked = reducedMotion;
  sizeSelect.value = targetSize;
  document.querySelector('#tamanho-automatico').disabled = !customSize;
  difficultySelect.value = difficulty;
  // Etapa 6: textos mudam conforme o modo de dificuldade.
  document.querySelector('#modo-dificuldade').value = difficultyMode;
  document.querySelector('#btn-reiniciar-adaptativo').hidden = !isAdaptive();
  if (isAdaptive()) {
    difficultyDescription.textContent = `Modo adaptativo ativo. Rodadas de ${TOTAL_TARGETS} figuras. Tamanho atual da figura: ${currentAdaptiveSize()} px (mínimo ${adaptiveMinPx()} px). Sem limite de tempo.`;
    phaseLabel.textContent = 'Modo adaptativo — a figura muda de tamanho conforme você joga';
    phaseMenu.textContent = `Sua próxima atividade: rodada adaptativa de ${TOTAL_TARGETS} figuras.`;
  } else {
    difficultyDescription.textContent = `A dificuldade aumenta automaticamente conforme você conclui as fases. Meta atual: ${TOTAL_TARGETS} alvos. Diâmetro do alvo: ${effectiveTargetDiameter()} px. Sem limite de tempo.`;
    phaseLabel.textContent = `Fase ${phaseIndex + 1} de ${PHASES.length} — ${PHASES[phaseIndex].label}`;
    phaseMenu.textContent = `Sua próxima atividade: fase ${phaseIndex + 1} de ${PHASES.length} — ${PHASES[phaseIndex].label}.`;
  }
  challengeTitle.textContent = `Nível ${DIFFICULTIES[difficulty].label} — Clique nas figuras`;
  contrastToggle.checked = highContrast;
  fixedToggle.checked = fixedTarget;
  interactionSelect.value = interactionMode;
  scanSpeedSelect.value = String(scanSpeed);
  hintDelaySelect.value = String(hintDelayMs);
  // Etapa 4: opções de acionamento; cada grupo só aparece no modo correspondente.
  document.querySelector('#acionar-em').value = activateOn;
  document.querySelector('#tempo-permanencia').value = String(dwellMs);
  document.querySelector('#filtro-tremor').value = String(tremorMs);
  document.querySelector('#margem-alvo').value = String(marginPx);
  document.querySelector('#opcoes-direto').hidden = interactionMode !== 'direto';
  document.querySelector('#opcoes-permanencia').hidden = interactionMode !== 'permanencia';
  document.querySelector('#opcoes-varredura').hidden = interactionMode !== 'varredura';
  refreshScanKeyText(); // texto da tecla extra e aviso da varredura
  scanHint.hidden = interactionMode !== 'varredura';
  document.documentElement.dataset.targetSize = targetSize;
  document.documentElement.style.setProperty('--target-diameter', `${currentTargetDiameter()}px`);
  document.documentElement.classList.toggle('high-contrast', highContrast);
  if (typeof currentTarget !== 'undefined' && currentTarget) placeTarget(currentTarget);
}
soundToggle.addEventListener('change', () => { soundEnabled = soundToggle.checked; savePreferences(); });
hintDelaySelect.addEventListener('change', () => {
  hintDelayMs = Number(hintDelaySelect.value);
  savePreferences();
});
// Etapa 6: o modo de dificuldade é escolha do profissional (exige o PIN).
document.querySelector('#modo-dificuldade').addEventListener('change', async e => {
  const escolhido = e.target.value;
  if (!(await exigirModoProfissional())) { e.target.value = difficultyMode; return; }
  difficultyMode = DIFFICULTY_MODES.includes(escolhido) ? escolhido : 'fases';
  syncPhase(); applyPreferences(); savePreferences();
  announce(isAdaptive() ? 'Modo adaptativo ativado.' : 'Modo de fases ativado.');
});
document.querySelector('#btn-reiniciar-adaptativo').addEventListener('click', async () => {
  if (!(await exigirModoProfissional())) return;
  adaptiveSizePx = null; // volta ao tamanho da fase atual do aluno
  syncPhase(); applyPreferences(); savePreferences();
  announce(`Tamanho adaptativo recomeçado em ${currentAdaptiveSize()} px.`);
});
// Etapa 4: novas preferências de acionamento.
document.querySelector('#acionar-em').addEventListener('change', e => { activateOn = e.target.value; savePreferences(); });
document.querySelector('#tempo-permanencia').addEventListener('change', e => { dwellMs = Number(e.target.value); savePreferences(); });
document.querySelector('#filtro-tremor').addEventListener('change', e => { tremorMs = Number(e.target.value); savePreferences(); });
document.querySelector('#margem-alvo').addEventListener('change', e => { marginPx = Number(e.target.value); savePreferences(); });
motionToggle.addEventListener('change', () => {
  reducedMotion = motionToggle.checked;
  applyPreferences();
  savePreferences();
});
document.querySelector('#tamanho-automatico').addEventListener('click', () => {
  customSize = false;
  syncPhase();
  applyPreferences();
  savePreferences();
  announce('Redução automática do tamanho dos alvos ativada.');
});
sizeSelect.addEventListener('change', () => {
  targetSize = sizeSelect.value;
  customSize = true;
  applyPreferences();
  savePreferences();
});
contrastToggle.addEventListener('change', () => { highContrast = contrastToggle.checked; applyPreferences(); savePreferences(); });
fixedToggle.addEventListener('change', () => { fixedTarget = fixedToggle.checked; applyPreferences(); savePreferences(); });
interactionSelect.addEventListener('change', () => {
  interactionMode = interactionSelect.value;
  applyPreferences(); savePreferences(); restartScan();
});
scanSpeedSelect.addEventListener('change', () => {
  scanSpeed = Number(scanSpeedSelect.value);
  savePreferences(); restartScan();
});

function playTone(frequency, duration = 0.12) {
  if (!soundEnabled) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ||= new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration + 0.01);
  } catch (_) { /* Áudio indisponível: jogo continua normalmente. */ }
}

// Sons sintetizados, sem arquivos externos. Respeitam a preferência individual.
function playMissSound() {
  if (!soundEnabled) return;
  playTone(330, 0.12);
  window.setTimeout(() => { if (soundEnabled) playTone(247, 0.18); }, 125);
}
function playCompletionSound() {
  if (!soundEnabled) return;
  [523, 659, 784, 1047].forEach((frequency, index) => {
    window.setTimeout(() => { if (soundEnabled) playTone(frequency, 0.22); }, index * 155);
  });
}

function showVisualFeedback(message, celebration = false) {
  clearTimeout(feedbackTimeout);
  visualFeedback.textContent = message;
  visualFeedback.classList.toggle('celebration', celebration);
  visualFeedback.classList.remove('feedback-enter');
  void visualFeedback.offsetWidth;
  visualFeedback.classList.add('feedback-enter');
  feedbackTimeout = setTimeout(() => {
    visualFeedback.textContent = '';
    visualFeedback.classList.remove('feedback-enter', 'celebration');
  }, celebration ? 4000 : 1000);
}


let gameState = 'pronto';
let hitCount = 0;
let missCount = 0;
let currentTarget = null;
applyPreferences();
renderProfiles();

// Mensagem para a área de status, lida automaticamente por leitores de tela (aria-live).
// Se a mesma frase se repetir, alternamos um caractere invisível para que seja lida de novo.
let announceToggle = false;
function announce(message) {
  announceToggle = !announceToggle;
  statusMessage.textContent = message + (announceToggle ? '​' : '');
}

function updatePanel() {
  points.textContent = String(hitCount * POINTS_PER_HIT);
  hits.textContent = String(hitCount);
  const totalAttempts = hitCount + missCount;
  attempts.textContent = String(totalAttempts);
  accuracy.textContent = totalAttempts ? `${Math.round(hitCount / totalAttempts * 100)}%` : '—';
  progress.max = TOTAL_TARGETS;
  progress.value = hitCount;
  const percentage = Math.round(hitCount / TOTAL_TARGETS * 100);
  progressText.textContent = `${percentage}%`;
  goalDetail.textContent = `Meta: acertar ${TOTAL_TARGETS} alvos · Restam ${TOTAL_TARGETS - hitCount}`;
  progress.textContent = `${hitCount} de ${TOTAL_TARGETS}`;
  progress.setAttribute('aria-valuetext', `${hitCount} de ${TOTAL_TARGETS} alvos concluídos, ${percentage}%`);
}

// A varredura (scanItems, restartScan, teclas...) fica em acionamento.js.

function updateControls() {
  pauseButton.textContent = gameState === 'pausado' ? 'Retomar' : 'Pausar';
  nextPhaseButton.hidden = !(gameState === 'concluido' && !isAdaptive() && phaseIndex < PHASES.length - 1);
  pauseButton.disabled = gameState !== 'executando' && gameState !== 'pausado';
  endButton.disabled = gameState !== 'executando' && gameState !== 'pausado';
  pauseOverlay.hidden = gameState !== 'pausado';
  if (currentTarget) currentTarget.disabled = gameState !== 'executando';
  if (gameState !== 'executando') resetDwell();
  scheduleDwell();
  restartScan();
}

function clearTarget() {
  stopTargetHint();
  targetStartedAt = null;
  targetElapsedMs = 0;
  stopScan();
  if (currentTarget) currentTarget.remove();
  currentTarget = null;
}

function randomBetween(min, max) {
  return min + Math.random() * Math.max(0, max - min);
}

function placeTarget(target) {
  // A área é medida sem padding, para manter o botão inteiro visível.
  const rect = gameArea.getBoundingClientRect();
  const areaStyle = getComputedStyle(gameArea);
  const inset = parseFloat(areaStyle.borderLeftWidth) + 8;
  const size = target.offsetWidth;
  const x = fixedTarget ? Math.max(inset, (rect.width - size) / 2) : randomBetween(inset, Math.max(inset, rect.width - size - inset));
  const y = fixedTarget ? Math.max(inset, (rect.height - size) / 2) : randomBetween(inset, Math.max(inset, rect.height - size - inset));
  target.style.left = `${Math.round(x)}px`;
  target.style.top = `${Math.round(y)}px`;
  // Se a figura mudou de lugar durante o alvo (ex.: janela redimensionada), atualiza a medição.
  if (target === currentTarget) movimento.atualizarAlvo(targetGeometry(target));
}

function finishGame(completed) {
  if (gameState !== 'executando' && gameState !== 'pausado') return;
  suspendTiming();
  if (isAdaptive()) syncPhase(); // nível atualizado conforme o tamanho final (Etapa 6)
  gameState = completed ? 'concluido' : 'encerrado';
  const newlyEarned = recordGame(completed);
  clearTarget();
  initialMessage.hidden = true;
  const totalAttempts = hitCount + missCount;
  const percent = totalAttempts ? Math.round(hitCount / totalAttempts * 100) : 0;
  const title = document.querySelector('#titulo-resumo');
  title.textContent = completed ? 'Desafio concluído!' : 'Partida encerrada';
  summaryText.textContent = `Tempo ativo: ${formatDuration(activeDurationMs())} · Média por alvo: ${hitResponseTimes.length ? formatSeconds(hitResponseTimes.reduce((sum, v) => sum + v, 0) / hitResponseTimes.length) : '—'} · ${isAdaptive() ? `Modo adaptativo (figura de ${adaptiveRound.inicialPx} para ${currentAdaptiveSize()} px)` : `Fase ${phaseIndex + 1} de ${PHASES.length}`} · Nível ${DIFFICULTIES[difficulty].label} · ${hitCount * POINTS_PER_HIT} pontos · ${hitCount} acertos · ${totalAttempts} tentativas · ${percent}% de precisão · ${hitCount} de ${TOTAL_TARGETS} alvos.`;
  const newBadgeBox=document.querySelector('#medalhas-novas');
  newBadgeBox.hidden=!newlyEarned.length;
  newBadgeBox.textContent=newlyEarned.length ? 'Novas medalhas: '+newlyEarned.map(b=>b.icon+' '+b.name).join(' · ') : '';
  resultMessage.textContent = completed ? (isAdaptive() ? 'Parabéns! Você concluiu esta rodada!' : phaseIndex === PHASES.length - 1 ? 'Parabéns! Você concluiu todas as fases!' : 'Parabéns! Você concluiu esta fase!') : 'Você pode tentar novamente no seu ritmo.';
  if (completed) {
    const earned = missCount === 0 ? 3 : missCount <= 5 ? 2 : 1;
    starsDisplay.textContent = '★'.repeat(earned) + '☆'.repeat(3 - earned);
    starsDisplay.setAttribute('aria-label', `${earned} de 3 estrelas conquistadas`);
    showVisualFeedback(isAdaptive() ? 'Parabéns! Rodada concluída!' : phaseIndex === PHASES.length - 1 ? 'Parabéns! Todas as fases concluídas!' : 'Parabéns! Fase concluída!', true);
    playCompletionSound();
  } else {
    starsDisplay.textContent = '';
    starsDisplay.setAttribute('aria-label', 'Partida encerrada sem recompensa de conclusão');
    showVisualFeedback('Você pode tentar novamente!');
  }
  updateControls();
  // Anúncio para leitores de tela, com o resultado em texto (não depende de cor nem de imagem).
  const resultado = ` Você fez ${hitCount * POINTS_PER_HIT} pontos, com ${hitCount} acertos em ${totalAttempts} tentativas.`;
  announce((completed ? (isAdaptive() ? 'Rodada concluída!' : phaseIndex === PHASES.length - 1 ? 'Parabéns! Você concluiu todas as fases!' : 'Fase concluída! Avance para a próxima fase quando desejar.') : 'Partida encerrada. Você pode reiniciar quando quiser.') + resultado);
  if (!resultDialog.open) resultDialog.showModal();
  (completed && !nextPhaseButton.hidden ? nextPhaseButton : closeResultButton).focus({ preventScroll: true });
}

// Acerto: usado por todos os modos (direto, permanência, varredura e teclado).
// ponto = posição na área de jogo (ou null); tipo = mouse/toque/caneta/teclado;
// extra = informações do modo (ex.: { permanenciaMs } ou { celula }).
function registerHit(ponto, tipo, extra = {}) {
  if (gameState !== 'executando' || !currentTarget) return;
  const responseMs = currentTargetActiveMs();
  inputCounts[tipo] += 1;
  movimento.acerto(ponto, responseMs, tipo, extra);
  hitResponseTimes.push(responseMs);
  stopTargetHint();
  hitCount += 1;
  refreshTimePanel();
  playTone(523 + Math.min(hitCount, 15) * 24);
  if (hitCount < TOTAL_TARGETS) {
    showVisualFeedback(['Muito bem!', 'Ótimo!', 'Você conseguiu!', 'Continue assim!'][(hitCount - 1) % 4]);
  }
  updatePanel();
  adaptiveOnHit(); // modo adaptativo: 3 acertos seguidos diminuem a próxima figura
  if (hitCount >= TOTAL_TARGETS) {
    finishGame(true);
  } else {
    announce(`${hitCount === Math.ceil(TOTAL_TARGETS / 2) ? 'Metade do desafio concluída! ' : 'Acertou! '}Mais ${POINTS_PER_HIT} pontos, total de ${hitCount * POINTS_PER_HIT}. ${hitCount} de ${TOTAL_TARGETS} alvos. Restam ${TOTAL_TARGETS - hitCount}.`);
    createTarget();
  }
}
// Erro: ação fora da figura (ou, na varredura, com a parte errada destacada).
function registerMiss(ponto, tipo, extra = {}) {
  if (gameState !== 'executando' || !currentTarget) return;
  missCount += 1;
  inputCounts[tipo] += 1;
  movimento.erro(ponto, currentTargetActiveMs(), tipo, extra);
  playMissSound();
  updatePanel();
  adaptiveOnMiss(); // modo adaptativo: 2 erros seguidos aumentam a figura na hora
  announce(interactionMode === 'varredura'
    ? 'Ainda não. Espere a parte com a figura ficar destacada.'
    : 'Tente novamente. Selecione a figura geométrica.');
}

function createTarget() {
  clearTarget();
  if (gameState !== 'executando') return;
  const target = document.createElement('button');
  target.type = 'button';
  target.className = 'click-target';
  const shape = SHAPES[hitCount % SHAPES.length];
  // Figura + anel de carregamento do modo Permanência (só aparece nesse modo).
  target.innerHTML = `<svg class="target-shape" viewBox="0 0 100 100" aria-hidden="true" focusable="false" style="--shape-color:${shape.color}">${shape.svg}</svg>` +
    `<svg class="dwell-ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="50" r="47" pathLength="100" /></svg>`;
  const comoAcionar = interactionMode === 'permanencia' ? `Deixe o cursor parado sobre a figura por ${dwellMs / 1000} segundo(s).`
    : interactionMode === 'varredura' ? `Pressione ${scanKeyText()} quando a parte com a figura estiver destacada.`
    : 'Acione para marcar pontos.';
  target.setAttribute('aria-label', `Alvo ${hitCount + 1} de ${TOTAL_TARGETS}. Figura: ${shape.name}. ${comoAcionar}`);
  // Cliques com mouse/toque são tratados pela área de jogo (acionamento.js).
  // Aqui chegam apenas Enter/Espaço com a figura em foco (detail === 0).
  target.addEventListener('click', event => {
    event.stopPropagation();
    if (event.detail !== 0 || gameState !== 'executando' || interactionMode === 'varredura') return;
    if (!passesTremorFilter()) return;
    registerHit(null, 'teclado');
  });
  currentTarget = target;
  gameArea.appendChild(target);
  placeTarget(target);
  // Tamanho realmente desenhado (em telas pequenas pode ser menor que o configurado).
  targetSizesPx.push(Math.round(target.getBoundingClientRect().width));
  // Começa o registro deste alvo, guardando onde o ponteiro estava neste momento.
  movimento.iniciarAlvo({
    n: hitCount + 1, forma: shape.name, ...targetGeometry(target), margem: marginPx,
    inicio: lastPointerClient ? toAreaPoint(lastPointerClient.x, lastPointerClient.y) : null
  });
  targetElapsedMs = 0;
  targetStartedAt = isActiveTime() ? performance.now() : null;
  scheduleTargetHint();
  if (interactionMode !== 'varredura') target.focus({ preventScroll: true });
  resetDwell();
  scheduleDwell();
  restartScan();
}

function resetGame(start = false) {
  resetTiming();
  resetGameConfigTracking();
  resetActivationTracking();
  startAdaptiveRound();
  movimento.iniciarPartida();
  clearTarget();
  clearTimeout(feedbackTimeout);
  visualFeedback.textContent = '';
  visualFeedback.classList.remove('feedback-enter', 'celebration');
  starsDisplay.textContent = '';
  hitCount = 0;
  missCount = 0;
  gameState = start ? 'executando' : 'pronto';
  if (resultDialog.open) resultDialog.close();
  document.querySelector('#titulo-resumo').textContent = 'Desafio concluído!';
  summaryText.textContent = '';
  initialMessage.hidden = start;
  updatePanel();
  updateControls();
  if (start) {
    announce(interactionMode === 'permanencia'
      ? `Partida iniciada. Deixe o cursor parado sobre a figura por ${dwellMs / 1000} segundo(s).`
      : interactionMode === 'varredura'
        ? `Partida iniciada. Pressione ${scanKeyText()} quando a parte com a figura estiver destacada.`
        : 'Partida iniciada. Selecione o alvo.');
    createTarget();
    resumeTiming();
  } else {
    announce('Pronto para jogar.');
  }
}

function showScreen(id) {
  if (!validIds.has(id)) return;
  screens.forEach(screen => { screen.hidden = screen.id !== id; });
  document.body.dataset.tela = id; // permite ao CSS dar mais largura ao Histórico em telas grandes (Etapa 9)
  applyPreferences();
  resetGame(id === 'jogo');
  if (id === 'historico') { refreshReportProfiles(); renderHistory(); atualizarPainelPlanilha(); }
  if (id === 'perfis') renderProfiles();
  if (id === 'medalhas') renderBadges();
  restartScan();
  if (id !== 'jogo') {
    const title = document.querySelector(`#${id} h1`);
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus();
    }
  }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('button[data-go]');
  if (!button) return;
  // Os relatórios exigem o PIN do modo profissional (Etapa 5).
  if (button.dataset.go === 'historico' && !(await exigirModoProfissional())) return;
  showScreen(button.dataset.go);
});

// Cliques e toques na área de jogo são decididos em acionamento.js (initAcionamento).

pauseButton.addEventListener('click', () => {
  if (gameState === 'executando') {
    suspendTiming();
    gameState = 'pausado';
    updateControls();
    announce('Partida pausada.');
  } else if (gameState === 'pausado') {
    gameState = 'executando';
    scanContext = 'jogo'; // na varredura, volta a percorrer a área de jogo
    resumeTiming();
    updateControls();
    announce('Partida retomada.');
    currentTarget?.focus({ preventScroll: true });
  }
});

restartButton.addEventListener('click', () => resetGame(true));
closeResultButton.addEventListener('click', () => {
  resultDialog.close();
  restartButton.focus({ preventScroll: true });
});
resultDialog.addEventListener('close', () => {
  if (gameState === 'concluido' || gameState === 'encerrado') restartButton.focus({ preventScroll: true });
});
nextPhaseButton.addEventListener('click', () => {
  if (gameState !== 'concluido' || phaseIndex >= PHASES.length - 1) return;
  phaseIndex += 1;
  savePhase();
  syncPhase();
  applyPreferences();
  resetGame(true);
});
endButton.addEventListener('click', () => finishGame(false));

document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspendTiming();
  else resumeTiming();
  restartScan();
});
window.addEventListener('resize', () => {
  if (currentTarget) placeTarget(currentTarget);
  // Na varredura, refaz a divisão da área para o novo tamanho.
  if (scanGrid) { removeScanGrid(); restartScan(); }
});

initAcionamento(); // liga os eventos de clique, toque, permanência e varredura (acionamento.js)
initProtecao();    // liga PIN, modo profissional e backup (protecao.js)
initPlanilha();    // envio dos resumos para a Planilha Google (planilha.js)
initInterface();   // abas do Histórico, gráficos e lista de partidas (interface.js)

// PWA (Etapa 7): o modo sem internet só funciona quando o jogo está publicado em
// um endereço http(s). Aberto com duplo clique (file://), o jogo funciona normalmente,
// apenas sem a instalação como aplicativo.
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sem modo offline; o jogo segue normal */ });
}
resetGame(false);
