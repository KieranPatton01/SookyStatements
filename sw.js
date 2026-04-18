// ============================================================
//  SOOKY STATEMENTS — sw.js
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCD71Lc9VRoK8r0rEizSz-mjiu93c5g470",
  authDomain: "sookystatements.firebaseapp.com",
  projectId: "sookystatements",
  storageBucket: "sookystatements.firebasestorage.app",
  messagingSenderId: "890134490896",
  appId: "1:890134490896:web:0e1bee609eee0a8ae47f95"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const CACHE_NAME = 'sooky-v2';

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
    if (res.ok) {
      const copy = res.clone();
      const copy = res.clone();
caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
    }
    return res;
  })
  .catch(() => cached);
return cached || fetchPromise;
    })
  );
});

/* ── FCM background messages ─────────────────────────────── */
messaging.onBackgroundMessage((payload) => {
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
