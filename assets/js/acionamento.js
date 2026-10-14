'use strict';
// =============================================================================
// Clique Bom — formas de acionar a figura (Etapa 4)
// -----------------------------------------------------------------------------
// Aqui fica tudo que decide SE e QUANDO uma ação conta como acerto ou erro:
//   • Modo Direto: clique/toque, contando ao soltar (padrão) ou ao encostar.
//   • Modo Permanência: cursor parado sobre a figura por 1, 2 ou 3 segundos.
//   • Modo Varredura: a área de jogo é dividida em partes destacadas uma de
//     cada vez; a pessoa pressiona Espaço, Enter ou uma tecla escolhida.
//   • Filtro de tremor: ignora ações repetidas em intervalo curto.
//   • Margem invisível: aumenta a área de acerto sem mudar o desenho.
//
// O acerto é decidido pela GEOMETRIA: distância do ponto até o centro da figura
// menor ou igual ao raio + margem. Assim todos os modos usam a mesma regra.
//
// Este arquivo é carregado ANTES do script.js. As funções usam variáveis do
// script.js (gameState, currentTarget...) apenas quando são chamadas, e os
// eventos são ligados por initAcionamento(), chamada no fim do script.js.
// =============================================================================

// ---------- Opções disponíveis (os valores salvos são validados com estas listas) ----------
const DWELL_OPTIONS = [1000, 2000, 3000];
const TREMOR_OPTIONS = [0, 300, 500, 1000];
const MARGIN_OPTIONS = [0, 10, 20, 40];
const ACTIVATE_OPTIONS = ['soltar', 'pressionar'];
const INTERACTION_MODES = ['direto', 'permanencia', 'varredura'];

// ---------- Preferências (carregadas e salvas pelo script.js) ----------
let dwellMs = 2000;        // tempo de permanência
let activateOn = 'soltar'; // 'soltar' = ao soltar (comportamento original) | 'pressionar'
let tremorMs = 0;          // 0 = filtro desligado
let marginPx = 0;          // margem invisível em pixels
let scanKey = null;        // tecla extra da varredura: { code, label } ou null

// ---------- Estado da partida ----------
let tremorIgnored = 0;                 // ações ignoradas pelo filtro nesta partida
let lastAcceptedActivation = -Infinity;
function resetActivationTracking() {
  tremorIgnored = 0;
  lastAcceptedActivation = -Infinity;
  resetDwell();
  dwellArmed = true;
  scanContext = 'jogo';
}

// Converte o tipo de ponteiro do navegador para o nome usado no jogo.
function pointerKind(pointerType) {
  return { mouse: 'mouse', touch: 'toque', pen: 'caneta' }[pointerType] || 'mouse';
}

// ---------- Filtro de tremor ----------
// Devolve true se a ação deve contar. Se veio cedo demais depois da última
// ação aceita, é ignorada (não conta como erro) e apenas somada no contador.
function passesTremorFilter() {
  const agora = performance.now();
  if (tremorMs > 0 && agora - lastAcceptedActivation < tremorMs) {
    tremorIgnored += 1;
    return false;
  }
  lastAcceptedActivation = agora;
  return true;
}

// ---------- Regra de acerto (com margem invisível) ----------
function targetHitTest(clientX, clientY) {
  if (!currentTarget) return { dentro: false, dist: null };
  const r = currentTarget.getBoundingClientRect();
  const dist = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2));
  return { dentro: dist <= r.width / 2 + marginPx, dist };
}

// ---------- Modo Direto: ao encostar ou ao soltar ----------
let pointerDownInArea = false;
function activateAt(event) {
  if (gameState !== 'executando' || !currentTarget) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return; // só o botão principal
  if (!passesTremorFilter()) return;
  const ponto = toAreaPoint(event.clientX, event.clientY);
  if (targetHitTest(event.clientX, event.clientY).dentro) registerHit(ponto, pointerKind(event.pointerType));
  else registerMiss(ponto, pointerKind(event.pointerType));
}

// ---------- Modo Permanência ----------
let dwellAccum = 0;     // tempo acumulado com o cursor sobre a figura
let dwellLast = null;   // último quadro de animação
let dwellRaf = null;
let dwellArmed = true;  // depois de um acerto, é preciso sair da figura para "rearmar"
let touchDown = false;  // no toque, só conta enquanto o dedo está encostado
function resetDwell() {
  dwellAccum = 0;
  dwellLast = null;
  renderDwell(0);
}
// Desenha o anel de carregamento em volta da figura (0 = vazio, 1 = completo).
function renderDwell(progresso) {
  if (!currentTarget) return;
  currentTarget.style.setProperty('--dwell', String(progresso));
  currentTarget.classList.toggle('dwell-active', progresso > 0);
}
function scheduleDwell() {
  if (dwellRaf === null && interactionMode === 'permanencia' && gameState === 'executando') {
    dwellRaf = requestAnimationFrame(dwellTick);
  }
}
function dwellTick(agora) {
  dwellRaf = null;
  if (interactionMode !== 'permanencia' || gameState !== 'executando' || !currentTarget) { resetDwell(); return; }
  // Limita o passo a 100 ms: após a aba ficar oculta, não soma o tempo em que ficou escondida.
  const dt = dwellLast === null ? 0 : Math.min(100, agora - dwellLast);
  dwellLast = agora;
  const p = lastPointerClient;
  const dentro = p && targetHitTest(p.x, p.y).dentro && (lastPointerType !== 'touch' || touchDown);
  if (!dentro) dwellArmed = true; // saiu da figura: pode contar de novo
  if (dentro && dwellArmed && isActiveTime()) dwellAccum += dt;
  else dwellAccum = 0;
  renderDwell(Math.min(1, dwellAccum / dwellMs));
  if (dwellAccum >= dwellMs) {
    dwellAccum = 0;
    dwellArmed = false;
    registerHit(toAreaPoint(p.x, p.y), pointerKind(lastPointerType), { permanenciaMs: dwellMs });
  }
  scheduleDwell();
}

// ---------- Modo Varredura ----------
let scanTimer = null;
let scanIndex = 0;
let scanSelected = null;
let scanContext = 'jogo'; // 'jogo' (partes da área + Opções) | 'opcoes' (botões de controle)
let scanGrid = null;      // { el, cols, rows, cells: [elementos] }

function scanOptionsButton() { return document.querySelector('#btn-opcoes-varredura'); }
function scanBackButton() { return document.querySelector('#btn-voltar-jogo-varredura'); }
function menuButtonInGame() { return document.querySelector('#jogo .game-controls button[data-go="inicio"]'); }

// Divide a área de jogo em partes (2 a 4 colunas, 2 a 3 linhas, conforme o tamanho).
function buildScanGrid() {
  removeScanGrid();
  const w = gameArea.clientWidth, h = gameArea.clientHeight;
  const cols = Math.max(2, Math.min(4, Math.round(w / 220)));
  const rows = Math.max(2, Math.min(3, Math.round(h / 170)));
  const el = document.createElement('div');
  el.className = 'scan-grid';
  el.setAttribute('aria-hidden', 'true');
  el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  const cells = [];
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement('div');
    cell.className = 'scan-cell';
    cell.dataset.index = String(i);
    // Rótulo de texto: o destaque não depende só de cor.
    const label = document.createElement('span');
    label.className = 'scan-cell-label';
    label.textContent = '▶ Agora';
    cell.appendChild(label);
    el.appendChild(cell);
    cells.push(cell);
  }
  gameArea.appendChild(el);
  scanGrid = { el, cols, rows, cells };
}
function removeScanGrid() {
  scanGrid?.el.remove();
  scanGrid = null;
}

// O que é percorrido em cada situação.
function scanItems() {
  const visivel = el => el && !el.disabled && !el.hidden;
  if (resultDialog.open) return [nextPhaseButton, closeResultButton].filter(visivel);
  if (gameState === 'pausado') return [pauseButton, restartButton, endButton, menuButtonInGame()].filter(visivel);
  if (gameState === 'concluido' || gameState === 'encerrado') return [restartButton, menuButtonInGame()].filter(visivel);
  if (gameState !== 'executando') return [];
  if (scanContext === 'opcoes') return [scanBackButton(), pauseButton, restartButton, endButton, menuButtonInGame()].filter(visivel);
  return [...(scanGrid ? scanGrid.cells : []), scanOptionsButton()].filter(el => el && !el.hidden);
}
function clearScanHighlight() {
  scanSelected?.classList.remove('scan-selected');
  scanSelected = null;
}
function stopScan() {
  if (scanTimer !== null) clearInterval(scanTimer);
  scanTimer = null;
  clearScanHighlight();
}
function advanceScan() {
  const itens = scanItems();
  clearScanHighlight();
  if (!itens.length) return;
  scanIndex %= itens.length;
  scanSelected = itens[scanIndex];
  scanSelected.classList.add('scan-selected');
  scanIndex = (scanIndex + 1) % itens.length;
}
// Mostra/esconde os botões próprios da varredura.
function updateScanButtons() {
  const ativo = interactionMode === 'varredura' && gameState === 'executando';
  scanOptionsButton().hidden = !(ativo && scanContext === 'jogo');
  scanBackButton().hidden = !(ativo && scanContext === 'opcoes');
}
// Recomeça a varredura do primeiro item (chamada quando algo muda no jogo).
function restartScan() {
  stopScan();
  const telaJogo = !document.querySelector('#jogo').hidden;
  const ativo = interactionMode === 'varredura' && telaJogo && !document.hidden;
  if (ativo && gameState === 'executando') { if (!scanGrid) buildScanGrid(); }
  else removeScanGrid();
  updateScanButtons();
  if (!ativo || !['executando', 'pausado', 'concluido', 'encerrado'].includes(gameState)) return;
  scanIndex = 0;
  advanceScan();
  scanTimer = setInterval(advanceScan, scanSpeed);
}
function setScanContext(contexto) {
  scanContext = contexto;
  restartScan();
  if (contexto === 'opcoes') announce('Opções do jogo. Os botões serão destacados um de cada vez.');
}
// Ação do acionador sobre o item destacado.
function scanPress() {
  const item = scanSelected;
  if (!item || !passesTremorFilter()) return;
  if (item.classList.contains('scan-cell')) {
    if (gameState !== 'executando' || !currentTarget) return;
    const t = currentTarget.getBoundingClientRect(), c = item.getBoundingClientRect();
    const cx = t.left + t.width / 2, cy = t.top + t.height / 2;
    const celula = Number(item.dataset.index) + 1;
    if (cx >= c.left && cx < c.right && cy >= c.top && cy < c.bottom) registerHit(null, 'teclado', { celula });
    else registerMiss(null, 'teclado', { celula });
    return;
  }
  if (!item.disabled) item.click();
}
function isScanKey(event) {
  return event.code === 'Space' || event.code === 'Enter' || event.code === 'NumpadEnter' ||
    (scanKey !== null && event.code === scanKey.code);
}
function scanKeyText() {
  return scanKey ? `Espaço, Enter ou ${scanKey.label}` : 'Espaço ou Enter';
}
function scanDescription() {
  if (!scanGrid) return '';
  return `${scanGrid.cols * scanGrid.rows} partes (${scanGrid.cols} colunas × ${scanGrid.rows} linhas)`;
}

// ---------- Escolha da tecla extra (para acionadores que imitam uma tecla) ----------
let capturingScanKey = false;
function describeKey(event) {
  if (event.code === 'Space') return 'Espaço';
  if (event.key && event.key.length === 1) return event.key.toUpperCase();
  return event.key || event.code;
}
function refreshScanKeyText() {
  scanHint.textContent = `Varredura ativa. Pressione ${scanKeyText()} quando a parte com a figura estiver destacada.`;
  document.querySelector('#tecla-extra-atual').textContent =
    capturingScanKey ? 'Pressione agora a tecla do acionador… (Esc cancela)'
      : 'Tecla extra: ' + (scanKey ? scanKey.label : 'nenhuma') + '.';
  document.querySelector('#btn-remover-tecla').disabled = !scanKey;
}

// ---------- Ligação dos eventos (chamada no fim do script.js) ----------
function initAcionamento() {
  // Direto: decide ao encostar ou ao soltar, conforme a preferência.
  gameArea.addEventListener('pointerdown', event => {
    pointerDownInArea = true;
    if (interactionMode === 'direto' && activateOn === 'pressionar') activateAt(event);
  });
  gameArea.addEventListener('pointerup', event => {
    if (!pointerDownInArea) return; // só conta se o toque/clique começou na área de jogo
    pointerDownInArea = false;
    if (interactionMode === 'direto' && activateOn === 'soltar') activateAt(event);
  });
  gameArea.addEventListener('pointercancel', () => { pointerDownInArea = false; });
  // Permanência no toque: só conta com o dedo encostado.
  document.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') touchDown = true; }, true);
  document.addEventListener('pointerup', e => { if (e.pointerType === 'touch') touchDown = false; }, true);
  document.addEventListener('pointercancel', e => { if (e.pointerType === 'touch') touchDown = false; }, true);

  // Varredura: teclas aceitas e captura da tecla extra.
  document.addEventListener('keydown', event => {
    if (capturingScanKey) {
      event.preventDefault();
      if (event.code !== 'Escape' && event.code !== 'Tab') {
        scanKey = { code: event.code, label: describeKey(event) };
        savePreferences();
      }
      capturingScanKey = false;
      refreshScanKeyText();
      return;
    }
    if (interactionMode !== 'varredura' || !isScanKey(event) || event.altKey || event.ctrlKey || event.metaKey ||
        document.querySelector('#jogo').hidden || document.hidden) return;
    const focado = document.activeElement;
    if (focado && focado.matches('input, select, textarea, [contenteditable="true"]')) return;
    event.preventDefault(); // evita que Enter/Espaço também acionem o botão em foco
    if (event.repeat) return;
    scanPress();
  });
  // Espaço aciona botões ao soltar a tecla: bloqueamos também, para não acionar duas vezes.
  document.addEventListener('keyup', event => {
    if (interactionMode === 'varredura' && isScanKey(event) && !document.querySelector('#jogo').hidden) event.preventDefault();
  });
  document.querySelector('#btn-escolher-tecla').addEventListener('click', () => {
    capturingScanKey = true;
    refreshScanKeyText();
  });
  document.querySelector('#btn-remover-tecla').addEventListener('click', () => {
    scanKey = null;
    savePreferences();
    refreshScanKeyText();
  });
  scanOptionsButton().addEventListener('click', () => setScanContext('opcoes'));
  scanBackButton().addEventListener('click', () => setScanContext('jogo'));
  refreshScanKeyText();
}
