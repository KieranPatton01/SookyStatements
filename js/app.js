// ============================================================
//  SOOKY STATEMENTS — app.js
// ============================================================

import { CONFIG } from './config.js';

import { initializeApp }        from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, onValue, push, set }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getMessaging, getToken, onMessage }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js';

let db        = null;
let messaging = null;
let swReg     = null;

const FUNCTION_URL = 'https://europe-west1-sookystatements.cloudfunctions.net/sendMessage';

/* ── Boot ────────────────────────────────────────────────── */
async function boot() {
  if ('serviceWorker' in navigator) {
    try {
      swReg = await navigator.serviceWorker.register('/SookyStatements/sw.js', {
        scope: '/SookyStatements/'
      });
    } catch (e) {
      console.warn('[SW] Registration failed:', e);
    }
  }

  const app = initializeApp(CONFIG.firebase);
  db        = getDatabase(app);
  messaging = getMessaging(app);

  onMessage(messaging, (payload) => {
    showToast(payload.notification?.body ?? 'New message 💌');
  });

  const notifPerm = Notification.permission;
  if (notifPerm === 'granted') {
    await registerFcmToken();
    showScreen('screen-messages');
    listenToMessages();
  } else {
    showScreen('screen-welcome');
  }
}

/* ── FCM token ───────────────────────────────────────────── */
async function registerFcmToken() {
  try {
    const token = await getToken(messaging, {
      vapidKey: CONFIG.vapidKey,
      serviceWorkerRegistration: swReg,
    });
    if (token) {
      await set(ref(db, 'recipient/fcmToken'), token);
      console.log('[FCM] Token saved');
    }
  } catch (e) {
    console.warn('[FCM] Token failed:', e);
  }
}

/* ── Grant permissions ───────────────────────────────────── */
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

/* ── Listen to messages ──────────────────────────────────── */
function listenToMessages() {
  onValue(ref(db, 'messages'), (snapshot) => {
    const messages = [];
    snapshot.forEach(child => {
      messages.push({ key: child.key, text: child.val() });
    });
    renderMessages(messages.reverse());
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
    card.innerHTML = `
      <div class="message-lily">🌸</div>
      <p class="message-text">${escapeHtml(msg.text)}</p>
    `;
    list.appendChild(card);
  });
}

/* ── Helpers ─────────────────────────────────────────────── */
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

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-allow').addEventListener('click', grantPermissions);
  boot().catch(console.error);
});