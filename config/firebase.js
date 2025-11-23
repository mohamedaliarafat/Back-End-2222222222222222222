// config/firebase.js
require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseInitialized = false;
let bucket = null;
let messaging = null;

/**
 * حاول تحميل service account من (1) متغيّر بيئي base64، (2) متغيرات منفصلة، (3) ملف محلي كخيار احتياطي.
 * أعد كائن JSON صالح للاستخدام مع admin.credential.cert(...)
 */
function loadServiceAccount() {
  // 1) من متغير base64 كامل (مفضّل لمشاريع CI/CD / GitHub Secrets)
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (b64) {
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      return JSON.parse(json);
    } catch (err) {
      console.warn('⚠️ Failed to parse GOOGLE_SERVICE_ACCOUNT_B64:', err.message);
    }
  }

  // 2) من متغيرات منفصلة (مع استبدال \n في المفتاح الخاص)
  const minimal = process.env.GOOGLE_TYPE && process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_PRIVATE_KEY;
  if (minimal) {
    return {
      type: process.env.GOOGLE_TYPE,
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
    };
  }

  // 3) كخيار احتياطي: ملف محلي (فقط إذا موجود)
  const localPath = path.resolve(__dirname, './firebaseServiceAccount.json');
  if (fs.existsSync(localPath)) {
    try {
      return require(localPath);
    } catch (err) {
      console.warn('⚠️ Failed to require local firebaseServiceAccount.json:', err.message);
    }
  }

  // لا شيء وجد
  return null;
}

try {
  // إذا Firebase مهيأ مسبقًا - إعادة استخدامه
  if (admin.apps && admin.apps.length > 0) {
    firebaseInitialized = true;
    console.log('✅ Firebase app already exists, reusing existing instance');
  } else {
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      throw new Error('No Firebase service account found (env or local file).');
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'albuhairaalarabia2026.appspot.com',
    });

    firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully for all services');
    if (serviceAccount.client_email) console.log(`📧 Service Account: ${serviceAccount.client_email}`);
    if (serviceAccount.project_id) console.log(`🏢 Project: ${serviceAccount.project_id}`);
  }
} catch (error) {
  // لا تنهار العملية - فقط تُعلم أن Firebase غير متاح
  console.error('❌ Firebase initialization failed:', error.message);
  console.log('📱 Firebase services will not be available (running in local mode)');
}

// فقط إذا مهيأ فعلاً، اعطِ المراجع
if (firebaseInitialized) {
  try {
    bucket = admin.storage().bucket();
  } catch (err) {
    console.warn('⚠️ Could not initialize storage bucket:', err.message);
    bucket = null;
  }

  try {
    messaging = admin.messaging();
  } catch (err) {
    console.warn('⚠️ Could not initialize messaging:', err.message);
    messaging = null;
  }
}

/** Helpers */
function isFirebaseInitialized() {
  return firebaseInitialized;
}

function getFirebaseInfo() {
  if (!firebaseInitialized) {
    return {
      initialized: false,
      projectId: null,
      message: 'Firebase not initialized'
    };
  }

  // تأكد إن هذه القيم مناسبة أو اقرأها من service account لو رغبت
  return {
    initialized: true,
    projectId: process.env.GOOGLE_PROJECT_ID || 'albuhairaalarabia2026',
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || null,
    message: 'Firebase services are active and ready'
  };
}

/**
 * إرسال إشعار FCM
 * - tokens: string (single) OR array of tokens
 * - notification: { title, body, _id?, type?, routing?, data?, priority? }
 * - data: إضافي (object)
 */
async function sendFCMNotification(tokens, notification, data = {}) {
  // Local mode logging when Firebase غير مهيأ
  if (!firebaseInitialized || !messaging) {
    console.log('📱 [LOCAL MODE] FCM:', {
      to: Array.isArray(tokens) ? `${tokens.length} devices` : tokens,
      notification: { title: notification.title, body: notification.body },
      data
    });
    // محاكاة استجابة
    return {
      success: true,
      result: { successCount: Array.isArray(tokens) ? tokens.length : 1, failureCount: 0 }
    };
  }

  try {
    const payloadData = {
      ...data,
      notificationId: notification._id?.toString?.() || '',
      type: notification.type || '',
      screen: notification.routing?.screen || '',
      action: notification.routing?.action || '',
      ...notification.data
    };

    // إنشاء الجسم العام للإشعار
    const common = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: Object.fromEntries(Object.entries(payloadData).map(([k, v]) => [k, String(v)])), // كلها سترينغ
      android: {
        priority: notification.priority === 'urgent' ? 'high' : 'normal',
        ttl: 3600 * 1000
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        }
      }
    };

    // حالة توكن واحد
    if (typeof tokens === 'string') {
      const message = { ...common, token: tokens };
      const result = await messaging.send(message);
      console.log(`✅ FCM sent to single device: ${notification.title}`);
      return { success: true, result };
    }

    // حالة مصفوفة توكنات - استخدم sendMulticast
    if (Array.isArray(tokens) && tokens.length > 0) {
      // sendMulticast expects { tokens, notification?, data?, ... } but admin SDK provides sendMulticast({ tokens, notification, data, android, apns })
      const multicast = {
        tokens,
        notification: common.notification,
        data: common.data,
        android: common.android,
        apns: common.apns
      };

      const result = await messaging.sendMulticast(multicast);
      console.log(`✅ FCM multicast: success ${result.successCount}, failure ${result.failureCount}`);
      return {
        success: true,
        result: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          responses: result.responses
        }
      };
    }

    return { success: false, error: 'No valid tokens provided' };
  } catch (error) {
    console.error('❌ FCM Error:', error);
    return { success: false, error: error.message || String(error) };
  }
}

module.exports = {
  admin,
  bucket,
  messaging,
  isFirebaseInitialized,
  getFirebaseInfo,
  sendFCMNotification
};
