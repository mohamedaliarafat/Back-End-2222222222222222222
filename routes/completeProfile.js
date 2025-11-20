const express = require('express');
const router = express.Router();
const completeProfileController = require('../controllers/completeProfileController');
const { authenticate } = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const upload = require('../middleware/upload'); // Multer middleware

// 🔹 Routes للمستخدم العادي
router.post('/profile', authenticate, completeProfileController.createOrUpdateProfile);
router.post('/profile-submit', authenticate, completeProfileController.createOrUpdateProfile);
router.get('/profile', authenticate, completeProfileController.getUserProfile);

// =========================================================================
// 🔹 رفع ملف واحد (مرن - يقبل أي اسم حقل)
// =========================================================================
router.post(
  '/upload-document',
  authenticate,
  upload.single('document'), // للحفاظ على التوافقية
  completeProfileController.uploadDocument
);

// =========================================================================
// 🔹 رفع ملف واحد مرن (يقبل أي اسم حقل)
// =========================================================================
router.post(
  '/upload-file',
  authenticate,
  upload.any(), // يقبل أي ملف بغض النظر عن اسم الحقل
  completeProfileController.uploadDocument
);

// =========================================================================
// 🔹 رفع عدة ملفات (مرن - يقبل أي أسماء حقول)
// =========================================================================
router.post(
  '/upload-documents',
  authenticate,
  upload.any(), // يقبل أي ملفات بغض النظر عن أسماء الحقول
  completeProfileController.uploadDocuments
);

// =========================================================================
// 🔹 رفع ملف وتحديث الملف الشخصي تلقائياً
// =========================================================================
router.post(
  '/upload-and-update',
  authenticate,
  upload.any(), // يقبل أي ملف بغض النظر عن اسم الحقل
  completeProfileController.uploadAndUpdateProfile
);

// =========================================================================
// 🔹 Routes للمسؤول فقط
// =========================================================================
router.get(
  '/admin/profiles',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.getAllProfiles
);

router.put(
  '/admin/profiles/:profileId/review',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.reviewProfile
);

router.put(
  '/admin/profiles/:profileId/documents',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.updateDocumentStatus
);

router.delete(
  '/admin/profiles/:profileId',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.deleteProfile
);

router.get(
  '/admin/stats',
  authenticate,
  roleMiddleware.checkRole('admin'),
  completeProfileController.getProfileStats
);

module.exports = router;