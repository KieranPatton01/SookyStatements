// ============================================================
//  SOOKY STATEMENTS — functions/index.js
//  Deploy with: firebase deploy --only functions
// ============================================================

const { onValueCreated } = require('firebase-functions/v2/database');
const { initializeApp }  = require('firebase-admin/app');
const { getDatabase }    = require('firebase-admin/database');
const { getMessaging }   = require('firebase-admin/messaging');

initializeApp();
const rtdb      = getDatabase();
const messaging = getMessaging();

const SOOKY_URL = 'https://kieranpatton01.github.io/SookyStatements';

// ============================================================
//  Trigger: new message added to Realtime Database
// ============================================================
exports.onNewMessage = onValueCreated(
  { ref: 'messages/{messageId}',
    region: 'europe-west1',
    instance: 'sookystatements-default-rtdb' 
  },
  async (event) => {
    const message = event.data.val();
    if (!message?.text) return null;

    console.log('[Sooky] New message:', message.text.slice(0, 40));

    // Get her FCM token
    const tokenSnap = await rtdb.ref('recipient/fcmToken').get();
    const fcmToken  = tokenSnap.val();

    if (!fcmToken) {
      console.warn('[Sooky] No FCM token found');
      return null;
    }

    const body = message.text.length > 80
      ? message.text.slice(0, 77) + '…'
      : message.text;

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
      console.log('[Sooky] Notification sent successfully');
    } catch (e) {
      console.error('[Sooky] Send failed:', e.message);
      if (e.code === 'messaging/registration-token-not-registered' ||
          e.code === 'messaging/invalid-registration-token') {
        await rtdb.ref('recipient/fcmToken').remove();
        console.log('[Sooky] Cleared invalid token');
      }
    }

    return null;
  }
);
