// ============================================================
//  SOOKY STATEMENTS — functions/index.js
// ============================================================

const { onRequest }     = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase }   = require('firebase-admin/database');
const { getMessaging }  = require('firebase-admin/messaging');

initializeApp();
const rtdb      = getDatabase();
const messaging = getMessaging();

const SOOKY_URL = 'https://kieranpatton01.github.io/SookyStatements';

// HTTP function — called from the app when a message is added
exports.sendMessage = onRequest(
  { region: 'europe-west1', cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const text = req.body?.text;
    if (!text) {
      res.status(400).send('Missing text');
      return;
    }

    console.log('[Sooky] Sending message:', text.slice(0, 40));

    // Get FCM token
    const tokenSnap = await rtdb.ref('recipient/fcmToken').get();
    const fcmToken  = tokenSnap.val();

    if (!fcmToken) {
      console.warn('[Sooky] No FCM token found');
      res.status(404).send('No recipient token');
      return;
    }

    const body = text.length > 80 ? text.slice(0, 77) + '…' : text;

    const msg = {
      token: fcmToken,
      notification: {
        title: '🌸 Sooky Statements',
        body,
      },
      data: { type: 'new_message' },
      webpush: {
        notification: {
          icon:     `${SOOKY_URL}/icons/icon-192.png`,
          badge:    `${SOOKY_URL}/icons/badge-96.png`,
          vibrate:  [200, 100, 200, 100, 200],
          requireInteraction: false,
        },
        fcmOptions: { link: SOOKY_URL },
      },
      apns: {
        payload: {
          aps: {
            alert: { title: '🌸 Sooky Statements', body },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      await messaging.send(msg);
      console.log('[Sooky] Notification sent');
      res.status(200).send('OK');
    } catch (e) {
      console.error('[Sooky] Send failed:', e.message);
      if (e.code === 'messaging/registration-token-not-registered' ||
          e.code === 'messaging/invalid-registration-token') {
        await rtdb.ref('recipient/fcmToken').remove();
      }
      res.status(500).send(e.message);
    }
  }
);