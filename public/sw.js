// =========================================================================
// SERVICE WORKER - ADAPTAEDU ESCOLAR (PWA & OFFLINE-FIRST)
// Colégio Estadual Olynto Pereira de Castro - SEDUC/GO
// =========================================================================

const CACHE_NAME = 'adaptaedu-shell-v2';
const APP_ICON = '/branding/logo-escola-2026.png';
const APP_BADGE = '/branding/logo-escola-2026.png';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/branding/logo-escola-2026.png',
  '/branding/logo-escola-2026.svg'
];

// Instalação: Pré-cache do App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação: Limpeza de caches obsoletos e controle imediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        );
      })
    ])
  );
});

// Estratégia de Fetch:
// 1. /api/*: Network-First (com resposta vazia segura caso offline)
// 2. Navegação (HTML): Cache com fallback para Network
// 3. Recursos estáticos: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Não intercepta chamadas externas ou métodos não-GET
  if (request.method !== 'GET') return;

  // Chamadas de API: Rede primeiro
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ offline: true, error: 'Dispositivo desconectado da rede' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Navegação de páginas HTML (SPA fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Assets estáticos (JS, CSS, Imagens, Fontes): Cache First com atualização em segundo plano
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualiza cache em segundo plano se online
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return networkResponse;
      });
    })
  );
});

// Manipulador de Notificações Push Remotas (Web Push API)
self.addEventListener('push', (event) => {
  let data = {
    title: 'AdaptaEdu - Lembrete de Acompanhamento',
    body: 'Você possui registros diários de alunos de apoio pendentes de preenchimento.',
    icon: APP_ICON,
    badge: APP_BADGE,
    tag: 'adaptaedu-lembrete-apoio',
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'preencher_agora', title: 'Preencher Agora' },
      { action: 'fechar', title: 'Lembrar mais tarde' }
    ]
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || APP_ICON,
      badge: data.badge || APP_BADGE,
      tag: data.tag || 'adaptaedu-lembrete-apoio',
      renotify: data.renotify !== undefined ? data.renotify : true,
      requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : false,
      data: data.data || { url: '/' },
      actions: data.actions || []
    })
  );
});

// Manipulador de Clique na Notificação
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;

  notification.close();
  if (action === 'fechar') return;

  const targetUrl = (notification.data && notification.data.url) ? notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Manipulador de Mensagens da Página Principal (Comunicação Bidirecional)
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type, payload } = event.data;

  if (type === 'SHOW_LOCAL_NOTIFICATION') {
    self.registration.showNotification(payload.title || 'AdaptaEdu - Lembrete de Apoio', {
      body: payload.body || 'Existem registros de acompanhamento aguardando preenchimento.',
      icon: APP_ICON,
      badge: APP_BADGE,
      tag: payload.tag || 'adaptaedu-lembrete-apoio',
      renotify: true,
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || { url: '/' },
      actions: payload.actions || [{ action: 'preencher_agora', title: 'Preencher Diário' }]
    });
  }
});
