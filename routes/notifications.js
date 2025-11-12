const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const Notification = require('../models/Notification');

// ⭐ دالة لجلب إحصائيات الإشعارات حسب النوع
async function getNotificationsByType() {
  try {
    return await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
  } catch (error) {
    throw new Error(`فشل في جلب الإحصائيات حسب النوع: ${error.message}`);
  }
}

// ⭐ دالة لجلب إحصائيات الإشعارات حسب الأولوية
async function getNotificationsByPriority() {
  try {
    return await Notification.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
  } catch (error) {
    throw new Error(`فشل في جلب الإحصائيات حسب الأولوية: ${error.message}`);
  }
}

// ⭐ دالة لجلب الإحصائيات الشاملة للمدراء
async function getAdminStats(req, res) {
  try {
    const totalNotifications = await Notification.countDocuments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayNotifications = await Notification.countDocuments({
      createdAt: { $gte: today }
    });

    const broadcastCount = await Notification.countDocuments({ broadcast: true });
    const scheduledCount = await Notification.countDocuments({ isScheduled: true });

    const byType = await getNotificationsByType();
    const byPriority = await getNotificationsByPriority();

    res.json({
      success: true,
      data: {
        total: totalNotifications,
        today: todayNotifications,
        broadcast: broadcastCount,
        scheduled: scheduledCount,
        byType: byType,
        byPriority: byPriority
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      error: error.message
    });
  }
}

// ⭐ Routes للمستخدمين العاديين
router.get('/my-notifications', authMiddleware, getUserNotifications);
router.get('/stats', authMiddleware, getNotificationStats);
router.patch('/:notificationId/read', authMiddleware, markAsRead);
router.patch('/mark-all-read', authMiddleware, markAllAsRead);

// ⭐ Routes للمدراء فقط
router.post('/', roleMiddleware.checkRole(['admin', 'monitoring']), createNotification);
router.post('/send-to-user', roleMiddleware.checkRole(['admin', 'monitoring']), sendToUser);
router.post('/send-to-group', roleMiddleware.checkRole(['admin', 'monitoring']), sendToGroup);
router.delete('/:notificationId', roleMiddleware.checkRole(['admin', 'monitoring']), deleteNotification);

// ⭐ Routes إضافية للمدراء
router.get('/admin/stats', roleMiddleware.checkRole(['admin', 'monitoring']), getAdminStats);

module.exports = router;