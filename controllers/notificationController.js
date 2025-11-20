// controllers/notificationController.js
const Notification = require('../models/Notification');
const User = require('../models/User');
const notificationService = require('../services/notificationService'); // تم التصحيح

// 🔹 إنشاء إشعار جديد
async function createNotification(req, res) {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    
    // إذا كان الإشعار لمستخدم معين، أرسله عبر FCM
    if (notification.user && !notification.isScheduled) {
      const user = await User.findById(notification.user);
      if (user && user.fcmToken) {
        await notificationService.sendToUser(notification.user, {
          title: notification.title,
          body: notification.body,
          type: notification.type,
          data: notification.data,
          routing: notification.routing,
          priority: notification.priority
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الإشعار بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في إنشاء الإشعار',
      error: error.message
    });
  }
}

// 🔹 إرسال إشعار لمستخدم معين
async function sendToUser(req, res) {
  try {
    const { userId, title, body, type, data, routing, priority } = req.body;

    const notification = await notificationService.sendToUser(userId, {
      title,
      body,
      type: type || 'system',
      data: data || {},
      routing: routing || {},
      priority: priority || 'normal'
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال الإشعار للمستخدم بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال الإشعار',
      error: error.message
    });
  }
}

// 🔹 إرسال إشعار جماعي لمجموعة
async function sendToGroup(req, res) {
  try {
    const { targetGroup, title, body, type, data, routing, priority } = req.body;

    const result = await notificationService.sendToGroup(targetGroup, {
      title,
      body,
      type: type || 'system',
      data: data || {},
      routing: routing || {},
      priority: priority || 'normal'
    });

    res.status(201).json({
      success: true,
      message: `تم إرسال الإشعار إلى ${result.sentCount} مستخدم من أصل ${result.totalUsers}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال الإشعار الجماعي',
      error: error.message
    });
  }
}

// 🔹 إرسال إشعار طلب
async function sendOrderNotification(req, res) {
  try {
    const { orderId, type, additionalData } = req.body;

    const results = await notificationService.sendOrderNotification(
      orderId, 
      type, 
      additionalData || {}
    );

    res.status(200).json({
      success: true,
      message: 'تم إرسال إشعار الطلب بنجاح',
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال إشعار الطلب',
      error: error.message
    });
  }
}

// 🔹 إرسال إشعار مصادقة
async function sendAuthNotification(req, res) {
  try {
    const { userId, type, additionalData } = req.body;

    const notification = await notificationService.sendAuthNotification(
      userId,
      type,
      additionalData || {}
    );

    res.status(200).json({
      success: true,
      message: 'تم إرسال إشعار المصادقة بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال إشعار المصادقة',
      error: error.message
    });
  }
}

// 🔹 إرسال إشعار دفع
async function sendPaymentNotification(req, res) {
  try {
    const { userId, type, additionalData } = req.body;

    const notification = await notificationService.sendPaymentNotification(
      userId,
      type,
      additionalData || {}
    );

    res.status(200).json({
      success: true,
      message: 'تم إرسال إشعار الدفع بنجاح',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال إشعار الدفع',
      error: error.message
    });
  }
}

// 🔹 جلب إشعارات مستخدم معين
async function getUserNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, read } = req.query;

    const filter = {
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: ['all_customers', 'all_drivers', 'all_supervisors', 'all_admins', 'all_monitoring'] } }
      ]
    };

    if (type) filter.type = type;
    if (read !== undefined) {
      if (read === 'true') {
        filter.readBy = userId;
      } else {
        filter.readBy = { $ne: userId };
      }
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name phone')
      .populate('data.orderId', 'orderNumber status')
      .populate('data.driverId', 'name phone')
      .populate('data.customerId', 'name phone');

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإشعارات',
      error: error.message
    });
  }
}

// 🔹 تحديد الإشعار كمقروء
async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    // إضافة المستخدم إلى قائمة المقروءات إذا لم يكن موجوداً
    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }

    res.json({
      success: true,
      message: 'تم تحديد الإشعار كمقروء',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث حالة الإشعار',
      error: error.message
    });
  }
}

// 🔹 تحديد جميع الإشعارات كمقروءة
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    // العثور على جميع الإشعارات غير المقروءة للمستخدم
    const unreadNotifications = await Notification.find({
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: ['all_customers', 'all_drivers', 'all_supervisors', 'all_admins', 'all_monitoring'] } }
      ],
      readBy: { $ne: userId }
    });

    // تحديث جميع الإشعارات
    for (const notification of unreadNotifications) {
      if (!notification.readBy.includes(userId)) {
        notification.readBy.push(userId);
        await notification.save();
      }
    }

    res.json({
      success: true,
      message: `تم تحديد ${unreadNotifications.length} إشعار كمقروء`,
      count: unreadNotifications.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث الإشعارات',
      error: error.message
    });
  }
}

// 🔹 حذف إشعار
async function deleteNotification(req, res) {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'الإشعار غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم حذف الإشعار بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الإشعار',
      error: error.message
    });
  }
}

// 🔹 إحصائيات الإشعارات
async function getNotificationStats(req, res) {
  try {
    const userId = req.user.id;

    const filter = {
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: ['all_customers', 'all_drivers', 'all_supervisors', 'all_admins', 'all_monitoring'] } }
      ]
    };

    const totalNotifications = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      ...filter,
      readBy: { $ne: userId }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Notification.countDocuments({
      ...filter,
      createdAt: { $gte: today }
    });

    res.json({
      success: true,
      data: {
        total: totalNotifications,
        unread: unreadCount,
        today: todayCount,
        read: totalNotifications - unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب إحصائيات الإشعارات',
      error: error.message
    });
  }
}

// 🔹 معالجة الإشعارات المجدولة
async function processScheduledNotifications(req, res) {
  try {
    // هذه الدالة تحتاج إلى تنفيذ إذا كان لديك إشعارات مجدولة
    res.json({
      success: true,
      message: 'لا توجد إشعارات مجدولة للمعالجة حالياً'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في معالجة الإشعارات المجدولة',
      error: error.message
    });
  }
}

// 🔹 الحصول على حالة نظام الإشعارات
async function getSystemStatus(req, res) {
  try {
    const status = await notificationService.getSystemStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في جلب حالة النظام',
      error: error.message
    });
  }
}

module.exports = {
  createNotification,
  sendToUser,
  sendToGroup,
  sendOrderNotification,
  sendAuthNotification,
  sendPaymentNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  processScheduledNotifications,
  getSystemStatus
};