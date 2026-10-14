'use strict';
// =============================================================================
// Clique Bom — versão do formato dos dados e migração automática
// -----------------------------------------------------------------------------
// Este arquivo é carregado ANTES do script.js.
// Ele cuida de três coisas:
//   1. Saber em qual "versão de formato" estão os dados salvos no navegador.
//   2. Antes de qualquer conversão, guardar uma cópia de segurança dos dados antigos.
//   3. Converter (migrar) os dados antigos para o formato novo, sem perder nada.
//
// Os nomes das "gavetas" do LocalStorage continuam os mesmos de antes
// (jogo-cliques-...), para que nada que já funciona deixe de funcionar.
//
// Histórico de versões do formato:
//   1 — formato original (sem campo de versão).
//   2 — cada partida ganha: v (versão), id (código único) e config
//       (configuração usada na partida). Partidas antigas recebem config: null.
//   3 — cada partida nova ganha: motor (indicadores de movimento, Etapa 2) e
//       destaque (acertos antes/depois do destaque de ajuda, Etapa 3).
//       Os detalhes de cada clique e as trajetórias ficam no IndexedDB.
//       Partidas anteriores simplesmente não têm esses campos (aparecem como "—"),
//       então não é preciso converter nada.
//   4 — cada partida nova ganha: modoDificuldade ('fases' ou 'adaptativo'),
//       adaptativo (tamanhos e ajustes) e tremorIgnorados (Etapas 4 e 6).
//       No modo adaptativo, phase = null. Partidas anteriores são de fases.
// =============================================================================

const DATA_VERSION = 4;
const DATA_VERSION_KEY = 'cliquebom-versao-dados';
const DATA_BACKUP_PREFIX = 'cliquebom-copia-seguranca-v';
const OLD_KEY_PREFIX = 'jogo-cliques-';

// Leitura e gravação protegidas: em navegação privada o armazenamento pode falhar.
function dadosLer(chave) {
  try { return localStorage.getItem(chave); } catch (_) { return null; }
}
function dadosGravar(chave, valor) {
  try { localStorage.setItem(chave, valor); return true; } catch (_) { return false; }
}

// Cria um código único para cada partida (usado para ligar resumo e detalhes).
function makeGameId() {
  return 'g-' + (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
}

// Versão dos dados atualmente salvos. Sem o campo, os dados são da versão 1.
function versaoDadosSalvos() {
  const n = Number(dadosLer(DATA_VERSION_KEY));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// Guarda uma cópia de tudo que pertence ao jogo antes de migrar.
// A cópia fica numa gaveta separada e só é feita uma vez por versão.
function copiaDeSegurancaAntesDeMigrar(versaoAntiga) {
  const chaveCopia = DATA_BACKUP_PREFIX + versaoAntiga;
  if (dadosLer(chaveCopia) !== null) return true;
  const copia = { criadaEm: new Date().toISOString(), versao: versaoAntiga, dados: {} };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave && chave.startsWith(OLD_KEY_PREFIX)) copia.dados[chave] = localStorage.getItem(chave);
    }
  } catch (_) { return false; }
  // Se não houver nada salvo ainda (primeiro uso), não é preciso cópia.
  if (!Object.keys(copia.dados).length) return true;
  return dadosGravar(chaveCopia, JSON.stringify(copia));
}

// Converte uma partida do formato 1 para o formato 2.
// Nada é apagado: apenas são acrescentados os campos que faltavam.
function migrarPartidaV1paraV2(partida) {
  if (!partida || typeof partida !== 'object') return partida;
  if (!partida.v) partida.v = 1;                 // registra que nasceu no formato antigo
  if (!partida.id) partida.id = makeGameId();     // código único, útil para os detalhes
  if (!('config' in partida)) partida.config = null; // configuração não foi registrada na época
  return partida;
}

// Executa a migração para todos os perfis cadastrados.
// Recebe a função que monta o nome da gaveta de cada perfil (definida no script.js).
// Retorna um texto curto descrevendo o que aconteceu (para depuração).
function migrarDadosSeNecessario(listaPerfis, chaveDoPerfil) {
  const versaoAtual = versaoDadosSalvos();
  if (versaoAtual > DATA_VERSION) {
    // Dados criados por uma versão mais nova do jogo: não mexe em nada.
    return 'dados-mais-novos';
  }
  if (versaoAtual === DATA_VERSION) return 'ja-atualizado';
  // Só faz cópia de segurança quando algum dado será convertido (hoje: vindo da versão 1).
  const precisaConverter = versaoAtual < 2;
  if (precisaConverter && !copiaDeSegurancaAntesDeMigrar(versaoAtual)) {
    // Sem cópia de segurança (sem espaço, por exemplo), não arrisca migrar.
    // O jogo continua lendo os dados antigos normalmente.
    return 'sem-copia';
  }
  if (versaoAtual < 2) {
    for (const perfil of listaPerfis) {
      const chave = chaveDoPerfil(perfil.id, 'history');
      try {
        const lista = JSON.parse(dadosLer(chave) || 'null');
        if (Array.isArray(lista)) dadosGravar(chave, JSON.stringify(lista.map(migrarPartidaV1paraV2)));
      } catch (_) { /* Histórico ilegível: fica como está, sem perda. */ }
    }
  }
  dadosGravar(DATA_VERSION_KEY, String(DATA_VERSION));
  return 'migrado';
}
