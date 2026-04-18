// ============================================================
//  SOOKY STATEMENTS — app.js
// ============================================================

import { CONFIG } from './config.js';

import { initializeApp }     from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast, serverTimestamp, set }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getMessaging, getToken, onMessage }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

let db        = null;
let messaging = null;
let swReg     = null;

/* ── Boot ────────────────────────────────────────────────── */
async function boot() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      swReg = await navigator.serviceWorker.register('/SookyStatements/sw.js', {
        scope: '/SookyStatements/'
      });
    } catch (e) {
      console.warn('[SW] Registration failed:', e);
    }
  }

  // Init Firebase
  const app = initializeApp(CONFIG.firebase);
  db        = getDatabase(app);
  messaging = getMessaging(app);

  // Handle foreground FCM messages
  onMessage(messaging, (payload) => {
    showToast(payload.notification?.body ?? 'New message 💌');
    // Messages update via the realtime listener automatically
  });

  // Check if permissions already granted
  const notifPerm = Notification.permission;
  if (notifPerm === 'granted') {
    await registerFcmToken();
    showScreen('screen-messages');
    listenToMessages();
  } else {
    showScreen('screen-welcome');
  }
}

/* ── FCM token registration ──────────────────────────────── */
async function registerFcmToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: CONFIG.vapidKey,
      serviceWorkerRegistration: swReg,
    });
    if (token) {
      // Store token under 'recipient' in Realtime DB
      await set(ref(db, 'recipient/fcmToken'), token);
      console.log('[FCM] Token saved');
    }
  } catch (e) {
    console.warn('[FCM] Token failed:', e);
  }
}

/* ── Grant permissions flow ──────────────────────────────── */
async function grantPermissions() {
  const btn = document.getElementById('btn-allow');
  btn.textContent = 'Just a moment…';
  btn.disabled = true;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      btn.textContent = 'Allow Notifications 🌸';
      btn.disabled = false;
      showToast('Notifications are needed to receive messages');
      return;
    }
    await registerFcmToken();
    showScreen('screen-messages');
    listenToMessages();
  } catch (e) {
    console.error(e);
    btn.textContent = 'Allow Notifications 🌸';
    btn.disabled = false;
  }
}

/* ── Listen to messages in Realtime DB ───────────────────── */
function listenToMessages() {
  const messagesRef = query(
    ref(db, 'messages'),
    orderByChild('timestamp'),
  );

  onValue(messagesRef, (snapshot) => {
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ id: child.key, ...child.val() });
    });
    renderMessages(messages.reverse()); // newest first
  });
}

/* ── Render messages ─────────────────────────────────────── */
function renderMessages(messages) {
  const list    = document.getElementById('message-list');
  const empty   = document.getElementById('empty-state');
  const counter = document.getElementById('message-count');

  list.innerHTML = '';

  if (messages.length === 0) {
    empty.classList.remove('hidden');
    counter.textContent = '';
    return;
  }

  empty.classList.add('hidden');
  counter.textContent = `${messages.length} message${messages.length !== 1 ? 's' : ''}`;

  messages.forEach((msg, index) => {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.style.animationDelay = `${index * 0.06}s`;

    const date = msg.timestamp
      ? formatDate(msg.timestamp)
      : '';

    card.innerHTML = `
      <div class="message-lily">🌸</div>
      <p class="message-text">${escapeHtml(msg.text)}</p>
      ${date ? `<span class="message-date">${date}</span>` : ''}
    `;

    list.appendChild(card);
  });
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now  = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60_000);
  const hrs  = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  if (days <  7)  return date.toLocaleDateString('en-GB', { weekday: 'long' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === id);
  });
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
}

/* ── Wire up events ──────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-allow').addEventListener('click', grantPermissions);
  boot().catch(console.error);
});
