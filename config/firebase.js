// config/firebase.js
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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

  if (!serviceAccount) {
    throw new Error("Missing service account file");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "albuhairaalarabia2026.appspot.com"
  });

  firebaseInitialized = true;

  console.log("✅ Firebase initialized!");
  console.log(`📧 Service Account: ${serviceAccount.client_email}`);
  console.log(`🏢 Project: ${serviceAccount.project_id}`);

} catch (error) {
  console.error("❌ Firebase init failed:", error.message);
}

if (firebaseInitialized) {
  try { bucket = admin.storage().bucket(); } catch { bucket = null; }
  try { messaging = admin.messaging(); } catch { messaging = null; }
}

// ===============================
//   🔥 NEW FCM FUNCTION (SDK v11+)
// ===============================
async function sendFCMNotification(tokens, notification, data = {}) {
  if (!firebaseInitialized || !messaging) {
    console.log("📱 [LOCAL MODE] Simulated FCM:", { tokens, notification, data });
    return { success: true };
  }

  try {
    // Ensure tokens is array
    if (typeof tokens === "string") tokens = [tokens];
    if (!Array.isArray(tokens) || tokens.length === 0) {
      console.log("⚠ No FCM tokens provided");
      return { success: false };
    }

    // Prepare messages
    const payloads = tokens.map(token => ({
      token,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        ...convertToStringData(data),
        notificationId: String(notification._id || ''),
        type: String(notification.type || ''),
      },

      android: { priority: "high" },
      apns: {
        payload: {
          aps: { sound: "default", badge: 1 }
        }
      }
    }));

    // ✔ NEW — Compatible with all Firebase Admin SDK versions
    const rawResult = await messaging.sendEach(payloads);

    // Normalize results
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

    return {
      success: true,
      result: { successCount, failureCount }
    };

  } catch (error) {
    console.error("❌ FCM Error:", error);
    return { success: false, error };
  }
}


function convertToStringData(obj) {
  const result = {};

  for (const key in obj) {
    if (obj[key] === undefined || obj[key] === null) {
      result[key] = "";
    } else if (typeof obj[key] === "object") {
      result[key] = JSON.stringify(obj[key]);
    } else {
      result[key] = String(obj[key]);
    }
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
