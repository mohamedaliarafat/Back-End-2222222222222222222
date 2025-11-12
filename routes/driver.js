// routes/driver.js
const express = require('express');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 👨‍💼 جميع routes تتطلب مصادقة
router.get('/profile', authMiddleware.authenticate, driverController.getDriverProfile);
router.get('/stats', authMiddleware.authenticate, driverController.getDriverStats);
router.get('/available-orders', authMiddleware.authenticate, driverController.getAvailableOrders);
router.get('/active-orders', authMiddleware.authenticate, driverController.getActiveOrders);
router.get('/completed-orders', authMiddleware.authenticate, driverController.getCompletedOrders);
router.get('/earnings', authMiddleware.authenticate, driverController.getDriverEarnings);
router.get('/dashboard', authMiddleware.authenticate, driverController.getDriverDashboard);

router.post('/accept-order', authMiddleware.authenticate, driverController.acceptOrder);
router.post('/update-location', authMiddleware.authenticate, driverController.updateLocation);
router.post('/online-status', authMiddleware.authenticate, driverController.updateOnlineStatus);
router.patch('/order-status', authMiddleware.authenticate, driverController.updateOrderStatus);

module.exports = router;