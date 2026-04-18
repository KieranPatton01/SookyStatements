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

const SOOKY_URL  = 'https://kieranpatton01.github.io/SookyStatements';
const SECRET_PIN = 'richard'; // !! Only place the PIN exists !!

exports.sendMessage = onRequest(
  { region: 'europe-west1', cors: true },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }

    const { text, pin, checkOnly } = req.body ?? {};

    // Always validate PIN first
    if (pin !== SECRET_PIN) {
      res.status(401).send('Unauthorised');
      return;
    }

    // PIN check only
    if (checkOnly) {
      res.status(200).send('OK');
      return;
    }

    if (!text) {
      res.status(400).send('Missing text');
      return;
    }

    // Save message to DB (function has admin access, bypasses rules)
    await rtdb.ref('messages').push(text);
    console.log('[Sooky] Message saved to DB');

    // Get FCM token
    const tokenSnap = await rtdb.ref('recipient/fcmToken').get();
    const fcmToken  = tokenSnap.val();

    if (!fcmToken) {
      console.warn('[Sooky] No FCM token found');
      res.status(200).send('Saved but no token');
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