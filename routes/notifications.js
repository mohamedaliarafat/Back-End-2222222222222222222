// routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { checkRole } = require('../middleware/role');

// 🔹 Routes للمستخدمين العاديين
router.get('/my-notifications', authenticate, notificationController.getUserNotifications);
router.get('/stats', authenticate, notificationController.getNotificationStats);
router.patch('/:notificationId/read', authenticate, notificationController.markAsRead);
router.patch('/mark-all-read', authenticate, notificationController.markAllAsRead);

// 🔹 Routes للمدراء والمشرفين
router.post('/', authenticate, checkRole(['admin', 'monitoring']), notificationController.createNotification);
router.post('/send-to-user', authenticate, checkRole(['admin', 'monitoring']), notificationController.sendToUser);
router.post('/send-to-group', authenticate, checkRole(['admin', 'monitoring']), notificationController.sendToGroup);
router.post('/send-order', authenticate, checkRole(['admin', 'supervisor']), notificationController.sendOrderNotification);
router.post('/send-auth', authenticate, checkRole(['admin']), notificationController.sendAuthNotification);
router.post('/send-payment', authenticate, checkRole(['admin', 'supervisor']), notificationController.sendPaymentNotification);
router.delete('/:notificationId', authenticate, checkRole(['admin', 'monitoring']), notificationController.deleteNotification);

// 🔹 Routes للصيانة والمراقبة
router.get('/system-status', authenticate, checkRole(['admin', 'supervisor']), notificationController.getSystemStatus);
router.post('/process-scheduled', authenticate, checkRole(['admin']), notificationController.processScheduledNotifications);

module.exports = router;