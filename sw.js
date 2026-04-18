// ============================================================
//  SOOKY STATEMENTS — sw.js
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey:            "AIzaSyCgp-uyjEwZYyWM3B7DTU-fT4bYqZkrkbw",
  authDomain:        "crush-compass.firebaseapp.com",
  projectId:         "crush-compass",
  storageBucket:     "crush-compass.firebasestorage.app",
  messagingSenderId: "585285811651",
  appId:             "1:585285811651:web:1bea9529c3d7ad80559176",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const CACHE_NAME = 'sooky-v1';

const STATIC_ASSETS = [
  '/SookyStatements/',
  '/SookyStatements/index.html',
  '/SookyStatements/manifest.json',
  '/SookyStatements/css/style.css',
  '/SookyStatements/icons/icon-192.png',
  '/SookyStatements/icons/icon-512.png',
];

/* ── Install ─────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

/* ── Activate ────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch ───────────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')    ||
      url.hostname.includes('firebaseio.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request)
        .then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

/* ── FCM background messages ─────────────────────────────── */
messaging.onBackgroundMessage(async (payload) => {
  // Don't show if app is already open and focused
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const appOpen = clients.some(c => c.url.includes('/SookyStatements') && c.visibilityState === 'visible');
  if (appOpen) return;

  const title = payload.notification?.title ?? '🌸 Sooky Statements';
  const body  = payload.notification?.body  ?? 'You have a new message';

  return self.registration.showNotification(title, {
    body,
    icon:     '/SookyStatements/icons/icon-192.png',
    badge:    '/SookyStatements/icons/badge-96.png',
    tag:      'sooky-message',
    renotify: true,
    vibrate:  [200, 100, 200, 100, 200],
    data:     { url: '/SookyStatements/' },
  });
});

/* ── Notification tap — open the app ────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(c => c.url.includes('/SookyStatements'));
      if (existing) return existing.focus();
      return self.clients.openWindow('/SookyStatements/');
    })
  );
});