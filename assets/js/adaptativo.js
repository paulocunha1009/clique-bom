'use strict';
// =============================================================================
// Clique Bom — dificuldade adaptativa (Etapa 6)
// -----------------------------------------------------------------------------
// Dois modos, escolhidos pelo profissional (exige o PIN):
//   • 'fases' (padrão): as 6 fases de sempre, com tamanhos de 160 a 60 px.
//   • 'adaptativo': rodadas de 10 figuras em que o tamanho se ajusta sozinho:
//       - 3 acertos seguidos  → figura 10% menor;
//       - 2 erros seguidos    → figura 15% maior (na hora, sem mudar de lugar);
//       - nunca menor que o tamanho mínimo configurado (ou 60 px),
//         nunca maior que 190 px.
//     O tamanho alcançado fica salvo e a rodada seguinte continua dele.
//     A fase do modo padrão continua guardada e não é alterada.
//
// Carregado antes do script.js; as funções usam variáveis dele só quando chamadas.
// =============================================================================

const DIFFICULTY_MODES = ['fases', 'adaptativo'];
const ADAPTIVE = {
  total: 10,          // figuras por rodada
  hitsToShrink: 3,    // acertos seguidos para diminuir
  missesToGrow: 2,    // erros seguidos para aumentar
  shrinkFactor: 0.9,  // 10% menor
  growFactor: 1.15,   // 15% maior
  floorPx: 60,        // menor tamanho quando não há mínimo configurado
  maxPx: 190
};

// ---------- Preferências (salvas por jogador pelo script.js) ----------
let difficultyMode = 'fases';
let adaptiveSizePx = null; // tamanho atual no modo adaptativo (null = ainda não começou)

// ---------- Estado da rodada ----------
let adaptiveHitStreak = 0;
let adaptiveMissStreak = 0;
let adaptiveRound = { inicialPx: null, reducoes: 0, aumentos: 0 };

function isAdaptive() { return difficultyMode === 'adaptativo'; }
// Limites: respeita o tamanho mínimo escolhido em Configurações.
function adaptiveMinPx() {
  return customSize ? Math.max(ADAPTIVE.floorPx, CUSTOM_MINIMUMS[targetSize] || ADAPTIVE.floorPx) : ADAPTIVE.floorPx;
}
function clampAdaptive(px) {
  return Math.round(Math.min(ADAPTIVE.maxPx, Math.max(adaptiveMinPx(), px)));
}
// Tamanho atual; na primeira vez, começa pelo tamanho da fase em que o aluno está.
function currentAdaptiveSize() {
  if (!Number.isFinite(adaptiveSizePx)) adaptiveSizePx = effectiveTargetDiameter();
  adaptiveSizePx = clampAdaptive(adaptiveSizePx);
  return adaptiveSizePx;
}
// Diâmetro que o jogo deve usar agora, em qualquer modo.
function currentTargetDiameter() {
  return isAdaptive() ? currentAdaptiveSize() : effectiveTargetDiameter();
}
// No modo adaptativo, o rótulo de dificuldade (Fácil/Médio/Avançado) segue o tamanho.
function difficultyForSize(px) {
  return px >= 130 ? 'facil' : px >= 90 ? 'medio' : 'avancado';
}

function startAdaptiveRound() {
  adaptiveHitStreak = 0;
  adaptiveMissStreak = 0;
  adaptiveRound = { inicialPx: isAdaptive() ? currentAdaptiveSize() : null, reducoes: 0, aumentos: 0 };
}

// Aplica um novo tamanho: atualiza a figura atual mantendo o centro no mesmo lugar.
function setAdaptiveSize(px) {
  const novo = clampAdaptive(px);
  if (novo === adaptiveSizePx) return false;
  adaptiveSizePx = novo;
  // Mede o tamanho ANTES de mudar, para manter o centro da figura no mesmo lugar.
  const area = gameArea.getBoundingClientRect();
  const tamanhoAntes = currentTarget ? currentTarget.offsetWidth : null;
  document.documentElement.style.setProperty('--target-diameter', `${novo}px`);
  if (currentTarget && tamanhoAntes) {
    const size = currentTarget.offsetWidth; // já com o novo tamanho
    const meio = (size - tamanhoAntes) / 2;  // desloca metade do quanto cresceu/diminuiu
    const borda = parseFloat(getComputedStyle(gameArea).borderLeftWidth) + 8; // mesma margem de placeTarget
    const x = Math.min(Math.max(borda, parseFloat(currentTarget.style.left) - meio), Math.max(borda, area.width - size - borda));
    const y = Math.min(Math.max(borda, parseFloat(currentTarget.style.top) - meio), Math.max(borda, area.height - size - borda));
    currentTarget.style.left = `${Math.round(x)}px`;
    currentTarget.style.top = `${Math.round(y)}px`;
    movimento.atualizarAlvo(targetGeometry(currentTarget));
  }
  savePreferences();
  return true;
}

// Chamado a cada acerto (antes de criar a próxima figura).
function adaptiveOnHit() {
  if (!isAdaptive()) return;
  adaptiveMissStreak = 0;
  adaptiveHitStreak += 1;
  if (adaptiveHitStreak >= ADAPTIVE.hitsToShrink) {
    adaptiveHitStreak = 0;
    if (setAdaptiveSize(currentAdaptiveSize() * ADAPTIVE.shrinkFactor)) adaptiveRound.reducoes += 1;
  }
}
// Chamado a cada erro.
function adaptiveOnMiss() {
  if (!isAdaptive()) return;
  adaptiveHitStreak = 0;
  adaptiveMissStreak += 1;
  if (adaptiveMissStreak >= ADAPTIVE.missesToGrow) {
    adaptiveMissStreak = 0;
    if (setAdaptiveSize(currentAdaptiveSize() * ADAPTIVE.growFactor)) adaptiveRound.aumentos += 1;
  }
}
// Resumo da rodada, guardado no histórico.
function adaptiveSummary() {
  if (!isAdaptive()) return null;
  return { inicialPx: adaptiveRound.inicialPx, finalPx: currentAdaptiveSize(), reducoes: adaptiveRound.reducoes,
    aumentos: adaptiveRound.aumentos, minimoPx: adaptiveMinPx() };
}
