// controllers/notificationController.js
const Notification = require("../models/Notification");
const User = require("../models/User");
const Order = require("../models/Order");
const notificationService = require("../services/notificationService");

// ===============================================================
// 🔹 إنشاء إشعار جديد
// ===============================================================
async function createNotification(req, res) {
  try {
    const notification = new Notification(req.body);
    await notification.save();

    // إرسال عبر FCM إن كان لمستخدم معيّن
    if (notification.user && !notification.isScheduled) {
      const user = await User.findById(notification.user);

      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        await notificationService.sendToUser(notification.user, {
          title: notification.title,
          body: notification.body,
          type: notification.type,
          data: notification.data,
          routing: notification.routing,
          priority: notification.priority,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "تم إنشاء الإشعار بنجاح",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في إنشاء الإشعار",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 تسجيل FCM Token
// ===============================================================
async function registerFcmToken(req, res) {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, error: "FCM token is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: "User not found" });
    }

    if (!user.fcmTokens) user.fcmTokens = [];

    // منع التكرار
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
    }

    res.json({
      success: true,
      message: "FCM token registered successfully",
      tokens: user.fcmTokens,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 تعيين سائق لطلب
// ===============================================================
async function assignDriver(req, res) {
  try {
    const { orderId, driverId } = req.body;

    if (!orderId || !driverId) {
      return res.status(400).json({
        success: false,
        error: "يجب إرسال معرف الطلب ومعرف السائق",
      });
    }

    const driver = await User.findById(driverId);
    if (!driver || driver.userType !== "driver") {
      return res
        .status(404)
        .json({ success: false, error: "السائق غير موجود أو غير صالح" });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { assignedDriver: driverId, status: "assigned" },
      { new: true }
    );

    if (!order) {
      return res
        .status(404)
        .json({ success: false, error: "الطلب غير موجود" });
    }

    // إرسال إشعار للسائق
    await notificationService.sendToUser(driverId, {
      title: "تم تعيينك لطلب جديد",
      body: `تم تعيينك للطلب رقم ${order._id}`,
      type: "order",
      data: { orderId: order._id },
    });

    res.status(200).json({
      success: true,
      message: "تم تعيين السائق بنجاح",
      data: order,
    });
  } catch (error) {
    console.error("❌ assignDriver Error:", error);
    res.status(500).json({
      success: false,
      error: "حدث خطأ أثناء تعيين السائق",
      details: error.message,
    });
  }
}

// ===============================================================
// 🔹 إرسال إشعار لمستخدم معين
// ===============================================================
async function sendToUser(req, res) {
  try {
    const { userId, title, body, type, data, routing, priority } = req.body;

    const notification = await notificationService.sendToUser(userId, {
      title,
      body,
      type: type || "system",
      data: data || {},
      routing: routing || {},
      priority: priority || "normal",
    });

    res.status(201).json({
      success: true,
      message: "تم إرسال الإشعار للمستخدم بنجاح",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في إرسال الإشعار",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 إرسال إشعار جماعي
// ===============================================================
async function sendToGroup(req, res) {
  try {
    const { targetGroup, title, body, type, data, routing, priority } =
      req.body;

    const result = await notificationService.sendToGroup(targetGroup, {
      title,
      body,
      type: type || "system",
      data: data || {},
      routing: routing || {},
      priority: priority || "normal",
    });

    res.status(201).json({
      success: true,
      message: `تم إرسال الإشعار إلى ${result.sentCount} مستخدم من أصل ${result.totalUsers}`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في إرسال الإشعار الجماعي",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 إرسال إشعار طلب
// ===============================================================
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
      message: "تم إرسال إشعار الطلب بنجاح",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في إرسال إشعار الطلب",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 إرسال إشعار مصادقة
// ===============================================================
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
      message: "تم إرسال إشعار المصادقة بنجاح",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في إرسال إشعار المصادقة",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 إرسال إشعار دفع
// ===============================================================
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
      message: "تم إرسال إشعار الدفع بنجاح",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في إرسال إشعار الدفع",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 جلب إشعارات المستخدم
// ===============================================================
async function getUserNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type, read } = req.query;

    const filter = {
      $or: [
        { user: userId },
        { broadcast: true },
        {
          targetGroup: {
            $in: [
              "all_customers",
              "all_drivers",
              "all_supervisors",
              "all_admins",
              "all_monitoring",
            ],
          },
        },
      ],
    };

    if (type) filter.type = type;

    if (read !== undefined) {
      filter.readBy =
        read === "true" ? userId : { $ne: userId };
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في جلب الإشعارات",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 تحديد إشعار كمقروء
// ===============================================================
async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res
        .status(404)
        .json({ success: false, message: "الإشعار غير موجود" });
    }

    if (!notification.readBy.includes(userId)) {
      notification.readBy.push(userId);
      await notification.save();
    }

    res.json({
      success: true,
      message: "تم تحديد الإشعار كمقروء",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في تحديث حالة الإشعار",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 تحديد جميع الإشعارات كمقروءة
// ===============================================================
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    const unread = await Notification.find({
      $or: [
        { user: userId },
        { broadcast: true },
        {
          targetGroup: {
            $in: [
              "all_customers",
              "all_drivers",
              "all_supervisors",
              "all_admins",
              "all_monitoring",
            ],
          },
        },
      ],
      readBy: { $ne: userId },
    });

    for (const n of unread) {
      n.readBy.push(userId);
      await n.save();
    }

    res.json({
      success: true,
      message: `تم تحديد ${unread.length} إشعار كمقروء`,
      count: unread.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في تحديث الإشعارات",
      error: error.message,
    });
  }
}

async function getNotificationStats(req, res) {
  try {
    const userId = req.user.id;

    const filter = {
      $or: [
        { user: userId },
        { broadcast: true },
        {
          targetGroup: {
            $in: [
              "all_customers",
              "all_drivers",
              "all_supervisors",
              "all_admins",
              "all_monitoring"
            ]
          }
        }
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
      message: "فشل في جلب إحصائيات الإشعارات",
      error: error.message
    });
  }
}


async function processScheduledNotifications(req, res) {
  try {
    // TODO: إضافة كود لاحقاً لمعالجة إشعارات مجدولة
    res.json({
      success: true,
      message: "لا توجد إشعارات مجدولة للمعالجة حالياً"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في معالجة الإشعارات المجدولة",
      error: error.message
    });
  }
}


// ===============================================================
// 🔹 حذف إشعار
// ===============================================================
async function deleteNotification(req, res) {
  try {
    const { notificationId } = req.params;

    const deleted = await Notification.findByIdAndDelete(notificationId);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "الإشعار غير موجود" });
    }

    res.json({
      success: true,
      message: "تم حذف الإشعار بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في حذف الإشعار",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 حالة النظام
// ===============================================================
async function getSystemStatus(req, res) {
  try {
    const status = await notificationService.getSystemStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "فشل في جلب حالة النظام",
      error: error.message,
    });
  }
}

// ===============================================================
// 🔹 تصدير الدوال
// ===============================================================
module.exports = {
  createNotification,
  registerFcmToken,
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
  getSystemStatus,
  assignDriver,
};
