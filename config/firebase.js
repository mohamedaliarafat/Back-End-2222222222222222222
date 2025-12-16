// config/firebase.js
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const User = require('../models/User'); // ✅ مهم جدًا

let firebaseInitialized = false;
let bucket = null;
let messaging = null;

// تحميل ملف Service Account
function loadServiceAccount() {
  const localPath = path.resolve(__dirname, './firebaseServiceAccount.json');

  if (!fs.existsSync(localPath)) {
    console.error('❌ firebaseServiceAccount.json not found');
    return null;
  }

  try {
    return require(localPath);
  } catch (err) {
    console.error('❌ Failed loading service account:', err.message);
    return null;
  }
}

try {
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) throw new Error("Missing service account file");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "albuhairaalarabia2026.appspot.com"
  });

  firebaseInitialized = true;
  console.log("✅ Firebase initialized!");
} catch (error) {
  console.error("❌ Firebase init failed:", error.message);
}

if (firebaseInitialized) {
  try { bucket = admin.storage().bucket(); } catch {}
  try { messaging = admin.messaging(); } catch {}
}

// ========================================
// 🔔 SEND FCM NOTIFICATION (FINAL)
// ========================================
async function sendFCMNotification(tokens, notification, data = {}) {
  if (!firebaseInitialized || !messaging) {
    console.log("📱 [LOCAL MODE] Simulated FCM");
    return { success: true };
  }

  if (typeof tokens === "string") tokens = [tokens];
  if (!Array.isArray(tokens) || tokens.length === 0) {
    console.log("⚠ No FCM tokens provided");
    return { success: false };
  }

  const payloads = tokens.map(token => ({
    token,
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: convertToStringData({
      ...data,
      notificationId: notification._id?.toString() || '',
      type: notification.type || ''
    }),
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default", badge: 1 } } }
  }));

  const rawResult = await messaging.sendEach(payloads);
  const results = rawResult.responses || [];

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.success) {
      successCount++;
    } else {
      failureCount++;
      const token = tokens[i];
      const code = r.error?.errorInfo?.code || r.error?.code;

      console.log(`❌ Token Failed`, token, code);

      if (code === 'messaging/registration-token-not-registered') {
        await User.updateMany(
          { fcmTokens: token },
          { $pull: { fcmTokens: token } }
        );
        console.log('🧹 Invalid token removed:', token);
      }
    }
  }

  console.log(`📨 FCM sent => success: ${successCount}, failed: ${failureCount}`);
  return { success: true, result: { successCount, failureCount } };
}

function convertToStringData(obj) {
  const result = {};
  for (const k in obj) {
    result[k] =
      obj[k] === undefined || obj[k] === null
        ? ''
        : typeof obj[k] === 'object'
        ? JSON.stringify(obj[k])
        : String(obj[k]);
  }
  return result;
}

module.exports = {
  admin,
  bucket,
  messaging,
  sendFCMNotification,
  isFirebaseInitialized: () => firebaseInitialized
};
