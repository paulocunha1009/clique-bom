'use strict';
// =============================================================================
// Clique Bom — interface responsiva e acessível (Etapa 9)
// -----------------------------------------------------------------------------
//   • Abas do Histórico (Resumo, Movimento, Gráficos, Partidas, Exportar):
//     mostram uma parte por vez, para a tela não ficar enorme no celular.
//     Seguem o padrão de acessibilidade de abas (setas, Home e End no teclado).
//   • Cartões de indicador com o valor em destaque e a explicação em
//     "O que é isso?", que abre ao tocar.
//   • Seletor "Qual gráfico ver?" e lista de partidas mostrada aos poucos.
// Carregado antes do script.js; initInterface() é chamada no fim dele.
// =============================================================================

// Explicações simples dos indicadores gerais (aparecem em "O que é isso?").
const KPI_AJUDA = {
  'Partidas registradas': 'Quantas partidas foram jogadas no filtro escolhido e em quantos dias diferentes.',
  'Fases concluídas': 'Partidas em que a meta de figuras foi atingida. As outras foram encerradas antes.',
  'Precisão geral': 'Porcentagem de acertos entre todas as tentativas (acertos + cliques fora da figura).',
  'Tempo ativo total': 'Tempo de jogo somado, sem contar pausas nem os momentos com a aba escondida.',
  'Tempo ativo médio': 'Quanto dura, em média, uma partida.',
  'Resposta média por alvo': 'Quanto tempo, em média, a pessoa leva para acertar cada figura.',
  'Ritmo médio': 'Quantas figuras a pessoa acerta por minuto de jogo.',
  'Acertos sem precisar do destaque': 'Acertos feitos antes de a figura começar a piscar. Um aumento pode indicar mais autonomia para encontrar a figura.',
  'Tamanho alcançado (adaptativo)': 'Tamanho da figura ao fim da rodada adaptativa mais recente. Quanto menor, mais precisão a pessoa demonstrou.',
  'Maior fase registrada': 'A fase mais avançada já jogada (não necessariamente concluída).'
};

// Cria um cartão de indicador: título, valor grande, detalhe curto e ajuda recolhível.
function criarCartaoIndicador(container, { titulo, valor, detalhe = '', ajuda = '', base = '' }) {
  const card = document.createElement('div');
  card.className = 'report-kpi';
  const t = document.createElement('span'); t.className = 'kpi-title'; t.textContent = titulo;
  const v = document.createElement('strong'); v.className = 'kpi-value'; v.textContent = valor;
  card.append(t, v);
  if (detalhe) { const d = document.createElement('small'); d.className = 'kpi-detail'; d.textContent = detalhe; card.appendChild(d); }
  if (base) { const b = document.createElement('small'); b.className = 'kpi-base'; b.textContent = base; card.appendChild(b); }
  if (ajuda) {
    const det = document.createElement('details'); det.className = 'kpi-help';
    const s = document.createElement('summary'); s.textContent = 'O que é isso?';
    s.setAttribute('aria-label', `O que é ${titulo}?`);
    const p = document.createElement('p'); p.textContent = ajuda;
    det.append(s, p);
    card.appendChild(det);
  }
  container.appendChild(card);
  return card;
}

// ---------- Abas acessíveis ----------
const ABA_KEY = 'cliquebom-aba-historico';
function iniciarAbas(lista) {
  const abas = [...lista.querySelectorAll('[role="tab"]')];
  const selecionar = (aba, focar = false) => {
    for (const a of abas) {
      const ativa = a === aba;
      a.setAttribute('aria-selected', String(ativa));
      a.tabIndex = ativa ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !ativa;
    }
    if (focar) aba.focus();
    try { localStorage.setItem(ABA_KEY, aba.id); } catch (_) { /* sem armazenamento: só não lembra a aba */ }
  };
  for (const aba of abas) {
    aba.addEventListener('click', () => selecionar(aba));
    // Teclado: setas mudam de aba; Home/End vão para a primeira/última.
    aba.addEventListener('keydown', e => {
      const i = abas.indexOf(aba);
      const destino = { ArrowRight: abas[(i + 1) % abas.length], ArrowLeft: abas[(i - 1 + abas.length) % abas.length],
        ArrowDown: abas[(i + 1) % abas.length], ArrowUp: abas[(i - 1 + abas.length) % abas.length],
        Home: abas[0], End: abas[abas.length - 1] }[e.key];
      if (destino) { e.preventDefault(); selecionar(destino, true); }
    });
  }
  let salva = null;
  try { salva = localStorage.getItem(ABA_KEY); } catch (_) {}
  selecionar(abas.find(a => a.id === salva) || abas[0]);
}

// ---------- Escolha do gráfico ----------
function aplicarEscolhaGrafico() {
  const escolha = document.querySelector('#escolha-grafico').value;
  for (const g of document.querySelectorAll('.history-chart[data-grafico]')) {
    g.hidden = escolha !== 'todos' && g.dataset.grafico !== escolha;
  }
}

// ---------- Lista de partidas mostrada aos poucos ----------
const PARTIDAS_POR_VEZ = 10;
let partidasVisiveis = PARTIDAS_POR_VEZ;
function reiniciarPaginacao() { partidasVisiveis = PARTIDAS_POR_VEZ; }
function aplicarPaginacao() {
  const linhas = [...document.querySelectorAll('#historico-corpo > tr')];
  linhas.forEach((tr, i) => { tr.hidden = i >= partidasVisiveis; });
  const botao = document.querySelector('#btn-mais-partidas');
  const restam = linhas.length - Math.min(partidasVisiveis, linhas.length);
  botao.hidden = restam <= 0;
  botao.textContent = `Mostrar mais partidas (mostrando ${Math.min(partidasVisiveis, linhas.length)} de ${linhas.length})`;
  const contador = document.querySelector('#partidas-contador');
  contador.textContent = linhas.length ? `${linhas.length} partida(s), da mais recente para a mais antiga.` : 'Nenhuma partida neste filtro.';
}

// Conteúdo recolhível dentro de uma célula (usado em "Movimento" e "Configuração").
function celulaRecolhivel(td, resumo, linhas) {
  const det = document.createElement('details');
  det.className = 'cell-details';
  const s = document.createElement('summary');
  s.textContent = resumo;
  det.appendChild(s);
  for (const l of linhas) { const span = document.createElement('span'); span.textContent = l; det.appendChild(span); }
  td.appendChild(det);
  return det;
}

function initInterface() {
  iniciarAbas(document.querySelector('#abas-historico'));
  // No celular, a análise em texto começa fechada (abre ao tocar), para a tela ficar curta.
  if (window.matchMedia && window.matchMedia('(max-width: 600px)').matches) {
    document.querySelector('#painel-resumo .report-analysis').removeAttribute('open');
  }
  document.querySelector('#escolha-grafico').addEventListener('change', aplicarEscolhaGrafico);
  document.querySelector('#btn-mais-partidas').addEventListener('click', () => {
    const primeiraNova = document.querySelectorAll('#historico-corpo > tr')[partidasVisiveis];
    partidasVisiveis += PARTIDAS_POR_VEZ;
    aplicarPaginacao();
    // Leva o foco para a primeira partida nova (ajuda quem usa teclado ou leitor de tela).
    if (primeiraNova) { primeiraNova.tabIndex = -1; primeiraNova.focus(); }
  });
  // Ao trocar o filtro, a lista volta a mostrar só as 10 mais recentes.
  for (const id of ['#filtro-perfil-relatorio', '#filtro-historico']) {
    document.querySelector(id).addEventListener('change', reiniciarPaginacao, true);
  }
}
