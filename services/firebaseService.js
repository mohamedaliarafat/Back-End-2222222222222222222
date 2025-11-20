// services/firebaseService.js
// هذا الملف أصبح مختصراً ويعتمد على config/firebase.js

const { 
  sendFCMNotification, 
  isFirebaseInitialized, 
  getFirebaseInfo 
} = require('../config/firebase');

// إعادة تصدير الدوال فقط
module.exports = { 
  sendFCMNotification, 
  isFirebaseInitialized,
  getFirebaseInfo
};