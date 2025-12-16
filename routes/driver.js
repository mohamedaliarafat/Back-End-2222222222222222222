const express = require('express');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 🔐 مصادقة
router.post('/save-fcm-token', authMiddleware.authenticate, driverController.saveFcmToken);

// 👤 بيانات السائق
router.get('/profile', authMiddleware.authenticate, driverController.getDriverProfile);
router.get('/stats', authMiddleware.authenticate, driverController.getDriverStats);
router.get('/dashboard', authMiddleware.authenticate, driverController.getDriverDashboard);
router.get('/earnings', authMiddleware.authenticate, driverController.getDriverEarnings);
router.get('/completed-orders', authMiddleware.authenticate, driverController.getCompletedOrders);

// ✅ أفعال السائق (لازم فوق)
router.post('/accept-order', authMiddleware.authenticate, driverController.acceptOrder);
router.post('/update-location', authMiddleware.authenticate, driverController.updateLocation);
router.post('/online-status', authMiddleware.authenticate, driverController.updateOnlineStatus);
router.patch('/order-status', authMiddleware.authenticate, driverController.updateOrderStatus);

// 📦 الطلبات
router.get('/orders/available', authMiddleware.authenticate, driverController.getAvailableFuelOrdersForDriver);
router.get('/orders/active', authMiddleware.authenticate, driverController.getActiveOrdersForDriver);
router.get(
  '/orders/all',
  authMiddleware.authenticate,
  driverController.getAllOrdersForDriver
);

// ❗ دايمًا آخر حاجة
router.get('/orders/:orderId', authMiddleware.authenticate, driverController.getOrderDetails);

module.exports = router;
