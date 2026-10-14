'use strict';
// =============================================================================
// Clique Bom — service worker (Etapa 7: funcionar sem internet)
// -----------------------------------------------------------------------------
// Guarda uma cópia dos arquivos do jogo no navegador. Assim, depois da primeira
// visita ao endereço publicado (https), o jogo abre mesmo sem internet.
//
// Como as atualizações chegam:
//   • O jogo abre sempre com a cópia guardada (rápido e sem internet) e, em
//     segundo plano, busca a versão nova. Ela aparece na PRÓXIMA vez que abrir.
//   • Ao publicar uma versão nova, aumente CACHE_VERSAO abaixo. Isso descarta
//     a cópia antiga por completo.
//
// Importante: os DADOS dos alunos não ficam aqui (ficam no LocalStorage e no
// IndexedDB). Trocar a versão do cache não apaga nenhum dado.
// =============================================================================

const CACHE_VERSAO = 'clique-bom-v3';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/style.css',
  './assets/js/dados.js',
  './assets/js/movimento.js',
  './assets/js/relatorio-movimento.js',
  './assets/js/acionamento.js',
  './assets/js/protecao.js',
  './assets/js/adaptativo.js',
  './assets/js/planilha.js',
  './assets/js/interface.js',
  './assets/js/script.js',
  './assets/icons/icone.svg',
  './assets/icons/icone-180.png',
  './assets/icons/icone-192.png',
  './assets/icons/icone-512.png',
  './assets/icons/icone-maskable-512.png'
];

// Instalação: guarda todos os arquivos do jogo.
self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CACHE_VERSAO).then(cache => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

// Ativação: apaga cópias de versões anteriores.
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n.startsWith('clique-bom-') && n !== CACHE_VERSAO).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Pedidos: responde com a cópia guardada e atualiza em segundo plano.
self.addEventListener('fetch', evento => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSAO);
    const guardado = await cache.match(pedido, { ignoreSearch: true }) ||
      (pedido.mode === 'navigate' ? await cache.match('./index.html') : undefined);
    const daRede = fetch(pedido).then(resposta => {
      if (resposta && resposta.ok && resposta.type === 'basic') cache.put(pedido, resposta.clone());
      return resposta;
    }).catch(() => undefined);
    if (guardado) {
      evento.waitUntil(daRede); // atualiza a cópia sem atrasar a abertura
      return guardado;
    }
    return (await daRede) || new Response('Sem conexão e sem cópia guardada deste arquivo.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
