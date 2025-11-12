const express = require('express');
const router = express.Router();

// ✅ الراوترات العاملة فقط
const authRoutes = require('./auth');

// ❌ علق كل الراوترات الأخرى مؤقتاً
const usersRoutes = require('./users');
const orderRoutes = require('./orders');
const productRoutes = require('./products');
const paymentRoutes = require('./payments');
const companyRoutes = require('./companies');
// const addressRoutes = require('./addresses');
// const chatRoutes = require('./chat');
// const webrtcRoutes = require('./webrtc');
const adminRoutes = require('./admin');
const driverRoutes = require('./driver');
const supervisorRoutes = require('./supervisor');
// const notificationRoutes = require('./notifications');
// const ratingRoutes = require('./ratings');

// 🔐 المصادقة فقط (المضمونة)
router.use('/auth', authRoutes);

// ❌ علق كل الـ routes الأخرى
router.use('/users', usersRoutes);
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);
router.use('/payments', paymentRoutes);
router.use('/companies', companyRoutes);
// router.use('/addresses', addressRoutes);
// router.use('/chat', chatRoutes);
// router.use('/webrtc', webrtcRoutes);
router.use('/admin', adminRoutes);
router.use('/driver', driverRoutes);
router.use('/supervisor', supervisorRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/ratings', ratingRoutes);

// 🩹 health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'الخادم يعمل بشكل طبيعي',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 🏠 route أساسي
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'مرحباً في نظام إدارة الوقود والمنتجات',
  });
});

// ❌ handle 404
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'المسار غير موجود',
    requestedUrl: req.originalUrl
  });
});

module.exports = router;