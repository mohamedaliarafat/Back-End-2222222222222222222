const express = require('express');
const router = express.Router();
const completeProfileController = require('../controllers/completeProfileController');
const { authenticate } = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const upload = require('../middleware/upload');

// 🔹 Routes للمستخدم العادي
router.post('/profile', authenticate, completeProfileController.createOrUpdateProfile);
router.post('/profile-submit', authenticate, completeProfileController.createOrUpdateProfile);
router.get('/profile', authenticate, completeProfileController.getUserProfile);

// 🔹 رفع الملفات
router.post('/upload-document', authenticate, upload.single('document'), completeProfileController.uploadDocument);
router.post('/upload-file', authenticate, upload.any(), completeProfileController.uploadDocument);
router.post('/upload-documents', authenticate, upload.any(), completeProfileController.uploadDocuments);
router.post('/upload-and-update', authenticate, upload.any(), completeProfileController.uploadAndUpdateProfile);


router.get(
  '/profiles',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.getAllProfiles
);

// ✅ جلب ملف شخصي محدد - تأكد من وجود هذه الدالة في الـ controller
router.get(
  '/profiles/:profileId',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.getProfileById // 🔹 تأكد من اسم الدالة
);

// ✅ الإحصائيات
router.get(
  '/stats',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.getProfileStats
);

// ✅ مراجحة ملف
router.put(
  '/profiles/:profileId/review',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.reviewProfile
);

// ✅ تحديث حالة المستند
router.put(
  '/profiles/:profileId/documents',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.updateDocumentStatus
);

// ✅ حذف ملف
router.delete(
  '/profiles/:profileId',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.deleteProfile
);

module.exports = router;