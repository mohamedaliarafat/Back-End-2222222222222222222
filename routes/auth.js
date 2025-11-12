const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth'); // 🔥 تغيير الاسم

// 🔐 Routes المصادقة
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-phone', authController.verifyPhone);
router.post('/resend-verification', authController.resendVerification);

// 👤 Routes الملف الشخصي (تتطلب مصادقة)
router.post('/complete-profile', authMiddleware.authenticate, authController.completeProfile); // 🔥 استخدام .authenticate
router.post('/upload-documents', authMiddleware.authenticate, authController.uploadDocuments);
router.get('/profile', authMiddleware.authenticate, authController.getProfile);
// بدلاً من authController.getProfile، استخدم دالة مباشرة
router.get('/profile', authMiddleware.authenticate, async (req, res) => {
  try {
    console.log('📥 طلب تحميل الملف الشخصي للمستخدم:', req.user.userId);
    
    // ✅ محاكاة للبيانات
    res.json({
      success: true,
      user: {
        id: req.user.userId,
        phone: req.user.phone,
        userType: req.user.userType,
        isVerified: req.user.isVerified,
        name: 'سائق تجريبي',
        profile: 'https://a.top4top.io/p_356432nv81.png',
        isActive: true,
        completeProfile: {
          companyName: 'شركة تجريبية',
          contactPerson: 'مسؤول الشركة',
          contactPhone: '0512345678',
          contactPosition: 'مدير',
          vehicleInfo: {
            type: 'سيارة',
            model: 'مرسيدس',
            year: 2023,
            licensePlate: 'ج 12345',
            color: 'أبيض'
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'فشل في تحميل الملف الشخصي'
    });
  }
});
router.put('/update-profile', authMiddleware.authenticate, authController.updateProfile);

// 🔄 Routes إضافية
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authMiddleware.authenticate, authController.logout);
router.get('/verify-token', authMiddleware.authenticate, authController.verifyToken);

module.exports = router;