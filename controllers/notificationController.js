const Notification = require('../models/Notification');
const User = require('../models/User');

// دالة مساعدة داخلية لإرسال FCM
async function _sendFCMNotification(token, notification) {
  try {
    // TODO: تنفيذ إرسال FCM فعلي
    console.log(`إرسال FCM إلى ${token}: ${notification.title}`);
    
    // محاكاة إرسال FCM
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return true;
  } catch (error) {
    console.error('فشل في إرسال FCM:', error);
    return false;
  }
}

// دالة مساعدة لتحديد المجموعات المستهدفة بناءً على نوع المستخدم
function _getUserTargetGroups(userType) {
  const groups = [];
  
  switch (userType) {
    case 'customer':
      groups.push('all_customers');
      break;
    case 'driver':
      groups.push('all_drivers');
      break;
    case 'approval_supervisor':
      groups.push('all_supervisors');
      break;
    case 'admin':
      groups.push('all_admins');
      break;
    case 'monitoring':
      groups.push('all_monitoring');
      break;
  }
  
  return groups;
}

// إنشاء إشعار جديد
async function createNotification(req, res) {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    
    // إذا كان الإشعار لمستخدم معين، أرسله عبر FCM
    if (notification.user && !notification.isScheduled) {
      const user = await User.findById(notification.user);
      if (user && user.fcmToken) {
        await _sendFCMNotification(user.fcmToken, notification);
        notification.sentViaFcm = true;
        await notification.save();
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

// إرسال إشعار لمستخدم معين
async function sendToUser(req, res) {
  try {
    const { userId, title, body, type, data, routing, priority } = req.body;

    const notification = new Notification({
      title,
      body,
      user: userId,
      broadcast: false,
      type: type || 'system',
      data: data || {},
      routing: routing || {},
      priority: priority || 'normal'
    });

    await notification.save();

    // إرسال عبر FCM
    const user = await User.findById(userId);
    if (user && user.fcmToken) {
      await _sendFCMNotification(user.fcmToken, notification);
      notification.sentViaFcm = true;
      await notification.save();
    }

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

// إرسال إشعار جماعي لمجموعة
async function sendToGroup(req, res) {
  try {
    const { targetGroup, title, body, type, data, routing, priority } = req.body;

    // تحديد الاستعلام بناءً على المجموعة
    let userQuery = {};
    switch (targetGroup) {
      case 'all_customers':
        userQuery = { userType: 'customer', isActive: true };
        break;
      case 'all_drivers':
        userQuery = { userType: 'driver', isActive: true };
        break;
      case 'all_supervisors':
        userQuery = { userType: 'approval_supervisor', isActive: true };
        break;
      case 'all_admins':
        userQuery = { userType: 'admin', isActive: true };
        break;
      case 'all_monitoring':
        userQuery = { userType: 'monitoring', isActive: true };
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'المجموعة المستهدفة غير صالحة'
        });
    }

    // جلب المستخدمين المستهدفين
    const users = await User.find(userQuery).select('fcmToken');
    
    // إنشاء إشعار رئيسي
    const notification = new Notification({
      title,
      body,
      broadcast: true,
      targetGroup,
      type: type || 'system',
      data: data || {},
      routing: routing || {},
      priority: priority || 'normal'
    });

    await notification.save();

    // إرسال الإشعار لكل مستخدم
    let sentCount = 0;
    for (const user of users) {
      if (user.fcmToken) {
        await _sendFCMNotification(user.fcmToken, notification);
        sentCount++;
      }
    }

    notification.sentViaFcm = true;
    await notification.save();

    res.status(201).json({
      success: true,
      message: `تم إرسال الإشعار إلى ${sentCount} مستخدم`,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال الإشعار الجماعي',
      error: error.message
    });
  }
}

// جلب إشعارات مستخدم معين
async function getUserNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, read } = req.query;

    const filter = {
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: _getUserTargetGroups(req.user.userType) } }
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
      .populate('data.orderId', 'orderNumber')
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

// تحديد الإشعار كمقروء
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

// تحديد جميع الإشعارات كمقروءة
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    // العثور على جميع الإشعارات غير المقروءة للمستخدم
    const unreadNotifications = await Notification.find({
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: _getUserTargetGroups(req.user.userType) } }
      ],
      readBy: { $ne: userId }
    });

    // تحديث جميع الإشعارات
    for (const notification of unreadNotifications) {
      notification.readBy.push(userId);
      await notification.save();
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

// حذف إشعار
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

// إحصائيات الإشعارات
async function getNotificationStats(req, res) {
  try {
    const userId = req.user.id;

    const totalNotifications = await Notification.countDocuments({
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: _getUserTargetGroups(req.user.userType) } }
      ]
    });

    const unreadCount = await Notification.countDocuments({
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: _getUserTargetGroups(req.user.userType) } }
      ],
      readBy: { $ne: userId }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCount = await Notification.countDocuments({
      $or: [
        { user: userId },
        { broadcast: true },
        { targetGroup: { $in: _getUserTargetGroups(req.user.userType) } }
      ],
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

// تصدير الدوال مباشرة
module.exports = {
  createNotification,
  sendToUser,
  sendToGroup,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats
};