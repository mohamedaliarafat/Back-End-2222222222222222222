// config/firebase.js
require('dotenv').config();
const admin = require('firebase-admin');

let firebaseInitialized = false;
let bucket = null;
let messaging = null;

try {
  // ✅ Firebase via Environment Variables (Render / Production)
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      });
    }

    firebaseInitialized = true;

    console.log('🔥 Firebase initialized (ENV)');
    console.log(`📧 ${process.env.FIREBASE_CLIENT_EMAIL}`);
    console.log(`🏢 ${process.env.FIREBASE_PROJECT_ID}`);
  } else {
    console.warn('⚠ Firebase ENV variables missing — running in LOCAL mode');
  }
} catch (error) {
  console.error('❌ Firebase init failed:', error.message);
}

if (firebaseInitialized) {
  try { bucket = admin.storage().bucket(); } catch { bucket = null; }
  try { messaging = admin.messaging(); } catch { messaging = null; }
}

// ===============================
//   🔥 FCM FUNCTION (SDK v11+)
// ===============================
async function sendFCMNotification(tokens, notification, data = {}) {
  if (!firebaseInitialized || !messaging) {
    console.log("📱 [LOCAL MODE] Simulated FCM:", { tokens, notification, data });
    return { success: true };
  }

  try {
    if (typeof tokens === "string") tokens = [tokens];
    if (!Array.isArray(tokens) || tokens.length === 0) {
      console.log("⚠ No FCM tokens provided");
      return { success: false };
    }

    const payloads = tokens.map(token => ({
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...convertToStringData(data),
        notificationId: String(notification._id || ''),
        type: String(notification.type || ''),
      },
      android: { priority: "high" },
      apns: {
        payload: {
          aps: { sound: "default", badge: 1 },
        },
      },
    }));

    const rawResult = await messaging.sendEach(payloads);

    const results =
      Array.isArray(rawResult) ? rawResult :
      rawResult.responses ? rawResult.responses :
      rawResult.results ? rawResult.results :
      [rawResult];

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`📨 FCM sent => success: ${successCount}, failed: ${failureCount}`);

    results.forEach((r, i) => {
      if (!r.success) {
        console.log(`❌ Token Failed [${i}]`, tokens[i], r.error || r);
      }
    });

    return { success: true, result: { successCount, failureCount } };

  } catch (error) {
    console.error("❌ FCM Error:", error);
    return { success: false, error };
  }
}

function convertToStringData(obj) {
  const result = {};
  for (const key in obj) {
    if (obj[key] === undefined || obj[key] === null) result[key] = "";
    else if (typeof obj[key] === "object") result[key] = JSON.stringify(obj[key]);
    else result[key] = String(obj[key]);
  }
  return result;
}

module.exports = {
  admin,
  bucket,
  messaging,
  sendFCMNotification,
  isFirebaseInitialized: () => firebaseInitialized,
};
