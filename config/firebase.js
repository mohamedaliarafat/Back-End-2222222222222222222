// // config/firebase.js
// const admin = require('firebase-admin');
// const serviceAccount = require('./firebaseServiceAccount.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   storageBucket: 'gs://albuhairaalarabia2026.firebasestorage.app', // استبدل باسم bucket الحقيقي من Firebase
// });

// const bucket = admin.storage().bucket();

// module.exports = bucket;



// config/firebase.js
const admin = require('firebase-admin');
const path = require('path');

// متغير لتتبع حالة التهيئة
let firebaseInitialized = false;

try {
  // التحقق مما إذا كان Firebase مثبتاً مسبقاً
  if (admin.apps.length > 0) {
    firebaseInitialized = true;
    console.log('✅ Firebase app already exists, reusing existing instance');
  } else {
    // تحميل ملف service account
    const serviceAccount = require('./firebaseServiceAccount.json');
    
    // تهيئة Firebase مع جميع الخدمات
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'albuhairaalarabia2026.appspot.com', // استخدام الافتراضي
    });
    
    firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully for all services');
    console.log(`📧 Service Account: ${serviceAccount.client_email}`);
    console.log(`🏢 Project: ${serviceAccount.project_id}`);
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.log('📱 Firebase services will not be available');
}

// تصدير خدمات Firebase
const bucket = admin.storage().bucket();
const messaging = admin.messaging();

// دالة للتحقق من حالة Firebase
function isFirebaseInitialized() {
  return firebaseInitialized;
}

// دالة للحصول على معلومات Firebase
function getFirebaseInfo() {
  if (!firebaseInitialized) {
    return { 
      initialized: false, 
      projectId: null,
      message: 'Firebase not initialized'
    };
  }
  
  return {
    initialized: true,
    projectId: 'albuhairaalarabia2026',
    clientEmail: 'firebase-adminsdk-fbsvc@albuhairaalarabia2026.iam.gserviceaccount.com',
    message: 'Firebase services are active and ready'
  };
}

module.exports = {
  // الخدمات الأساسية
  admin,
  bucket,
  messaging,
  
  // دوال المساعدة
  isFirebaseInitialized,
  getFirebaseInfo,
  
  // دوال مختصرة للإشعارات
  async sendFCMNotification(tokens, notification, data = {}) {
    if (!firebaseInitialized) {
      console.log(`📱 [LOCAL MODE] FCM to ${Array.isArray(tokens) ? tokens.length + ' users' : 'single user'}: ${notification.title}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      return { 
        success: true, 
        result: { successCount: Array.isArray(tokens) ? tokens.length : 1, failureCount: 0 } 
      };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: {
          ...data,
          notificationId: notification._id?.toString(),
          type: notification.type,
          screen: notification.routing?.screen || '',
          action: notification.routing?.action || '',
          ...notification.data
        },
        android: {
          priority: notification.priority === 'urgent' ? 'high' : 'normal',
          ttl: 3600 * 1000,
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

      if (typeof tokens === 'string') {
        message.token = tokens;
        const result = await messaging.send(message);
        console.log(`✅ FCM sent to single device: ${notification.title}`);
        return { success: true, result };
      } else if (Array.isArray(tokens) && tokens.length > 0) {
        message.tokens = tokens;
        const result = await messaging.sendEachForMulticast(message);
        console.log(`✅ FCM sent to ${result.successCount} devices, failed: ${result.failureCount}`);
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
      return { success: false, error: error.message };
    }
  }
};