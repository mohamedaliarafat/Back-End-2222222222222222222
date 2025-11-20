const Notification = require('../models/Notification');
const User = require('../models/User');
const Order = require('../models/Order');
const { sendFCMNotification, isFirebaseInitialized, getFirebaseInfo } = require('../config/firebase'); // استيراد من config/firebase

// باقي الكود يبقى كما هو تماماً...
class NotificationService {
  async sendToUser(userId, notificationData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      const notification = new Notification({
        ...notificationData,
        user: userId,
        broadcast: false
      });

      await notification.save();

      // إرسال FCM إذا كان لدى المستخدم token
      if (user.fcmToken) {
        const fcmResult = await sendFCMNotification(
          user.fcmToken, 
          notification,
          {
            notificationId: notification._id.toString(),
            type: notification.type,
            ...notification.data
          }
        );

        if (fcmResult.success) {
          notification.sentViaFcm = true;
          await notification.save();
          console.log(`✅ Notification sent to user ${userId}: ${notification.title}`);
        }
      }

      return notification;
    } catch (error) {
      console.error('Error sending user notification:', error);
      throw error;
    }
  }


  // 🔹 إرسال إشعار لمجموعة
  async sendToGroup(targetGroup, notificationData) {
    try {
      let userQuery = {};
      const userTypeMap = {
        'all_customers': 'customer',
        'all_drivers': 'driver',
        'all_supervisors': 'approval_supervisor',
        'all_admins': 'admin',
        'all_monitoring': 'monitoring'
      };

      if (userTypeMap[targetGroup]) {
        userQuery = { 
          userType: userTypeMap[targetGroup], 
          isActive: true,
          fcmToken: { $exists: true, $ne: null }
        };
      }

      const users = await User.find(userQuery).select('fcmToken name');
      const validTokens = users.map(u => u.fcmToken).filter(token => token);

      // إنشاء إشعار رئيسي
      const notification = new Notification({
        ...notificationData,
        broadcast: true,
        targetGroup
      });

      await notification.save();

      // إرسال جماعي
      let sentCount = 0;
      let failedCount = 0;

      if (validTokens.length > 0) {
        const fcmResult = await sendFCMNotification(
          validTokens,
          notification,
          {
            notificationId: notification._id.toString(),
            type: notification.type,
            ...notification.data
          }
        );

        if (fcmResult.success) {
          notification.sentViaFcm = true;
          await notification.save();
          sentCount = fcmResult.result?.successCount || 0;
          failedCount = fcmResult.result?.failureCount || 0;
          console.log(`✅ Group notification sent to ${sentCount} users: ${notification.title}`);
        }
      } else {
        console.log(`📱 No valid FCM tokens for group ${targetGroup}, notification saved locally`);
      }

      return {
        notification,
        sentCount,
        failedCount,
        totalUsers: users.length,
        hasFCM: isFirebaseInitialized()
      };
    } catch (error) {
      console.error('Error sending group notification:', error);
      throw error;
    }
  }

  // 🔹 إشعارات دورة حياة الطلب الكاملة
  async sendOrderNotification(orderId, type, additionalData = {}) {
    try {
      const order = await Order.findById(orderId)
        .populate('customerId', 'name fcmToken')
        .populate('driverId', 'name fcmToken');
      
      if (!order) {
        throw new Error('الطلب غير موجود');
      }

      const notificationConfigs = {
        // 🔹 طلب جديد (للسائقين والمشرفين)
        order_new: {
          title: 'طلب وقود جديد 🚗',
          body: `طلب جديد #${order.orderNumber} بانتظار التعيين`,
          target: ['all_drivers', 'all_supervisors'],
          priority: 'high'
        },

        // 🔹 تم تأكيد الطلب (للمستخدم)
        order_confirmed: {
          title: 'تم تأكيد طلبك ✅',
          body: `تم تأكيد طلبك #${order.orderNumber} وسيتم تعيين سائق قريباً`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 تم تحديد السعر (للمستخدم)
        order_price_set: {
          title: 'تم تحديد سعر الطلب 💰',
          body: `تم تحديد السعر النهائي لطلبك #${order.orderNumber} - ${order.totalAmount} ر.س`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 في انتظار الدفع (للمستخدم)
        order_waiting_payment: {
          title: 'في انتظار الدفع ⏳',
          body: `الطلب #${order.orderNumber} في انتظار الدفع - ${order.totalAmount} ر.س`,
          target: 'customer',
          priority: 'high'
        },

        // 🔹 تم التحقق من الدفع (للمستخدم والإدارة)
        order_payment_verified: {
          title: 'تم التحقق من الدفع ✅',
          body: `تم التحقق من الدفع للطلب #${order.orderNumber}`,
          target: ['customer', 'all_supervisors'],
          priority: 'normal'
        },

        // 🔹 جاري المعالجة (للمستخدم)
        order_processing: {
          title: 'جاري تجهيز طلبك 🔄',
          body: `طلبك #${order.orderNumber} جاري تجهيزه للتسليم`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 جاهز للتسليم (للسائقين)
        order_ready_for_delivery: {
          title: 'طلب جاهز للتسليم 📦',
          body: `الطلب #${order.orderNumber} جاهز للتسليم`,
          target: 'all_drivers',
          priority: 'high'
        },

        // 🔹 تم تعيين سائق (للمستخدم والسائق)
        order_assigned_to_driver: {
          title: 'تم تعيين سائق 🚗',
          body: `تم تعيين السائق ${order.driverId?.name || 'سائق'} لطلبك #${order.orderNumber}`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 تم الاستلام من السائق (للمستخدم)
        order_picked_up: {
          title: 'تم استلام الطلب ✅',
          body: `تم استلام طلبك #${order.orderNumber} من قبل السائق`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 في الطريق (للمستخدم)
        order_in_transit: {
          title: 'في الطريق إليك 🛵',
          body: `السائق في طريقه لتسليم طلبك #${order.orderNumber}`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 تم التسليم (للمستخدم والإدارة)
        order_delivered: {
          title: 'تم التسليم 🎉',
          body: `تم تسليم طلبك #${order.orderNumber} بنجاح`,
          target: ['customer', 'all_supervisors'],
          priority: 'normal'
        },

        // 🔹 مكتمل (للمستخدم)
        order_completed: {
          title: 'طلب مكتمل ✅',
          body: `تم إكمال الطلب #${order.orderNumber} بنجاح. شكراً لثقتك!`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 ملغي (للمستخدم والإدارة)
        order_cancelled: {
          title: 'طلب ملغي ❌',
          body: `تم إلغاء الطلب #${order.orderNumber}`,
          target: ['customer', 'all_supervisors'],
          priority: 'high'
        }
      };

      const config = notificationConfigs[type];
      if (!config) {
        throw new Error(`نوع الإشعار غير معروف: ${type}`);
      }

      const results = [];
      const targets = Array.isArray(config.target) ? config.target : [config.target];

      for (const target of targets) {
        let result;

        if (target === 'customer' && order.customerId) {
          result = await this.sendToUser(order.customerId._id, {
            title: config.title,
            body: config.body,
            type: type,
            priority: config.priority || 'normal',
            data: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              amount: order.totalAmount,
              ...additionalData
            },
            routing: {
              screen: 'OrderDetails',
              params: { orderId: order._id.toString() }
            }
          });
        } else if (target.startsWith('all_')) {
          result = await this.sendToGroup(target, {
            title: config.title,
            body: config.body,
            type: type,
            priority: config.priority || 'normal',
            data: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              ...additionalData
            },
            routing: {
              screen: 'OrderDetails',
              params: { orderId: order._id.toString() }
            }
          });
        } else if (target === 'driver' && order.driverId) {
          result = await this.sendToUser(order.driverId._id, {
            title: config.title,
            body: config.body,
            type: type,
            priority: config.priority || 'normal',
            data: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              ...additionalData
            },
            routing: {
              screen: 'OrderDetails',
              params: { orderId: order._id.toString() }
            }
          });
        }

        if (result) results.push(result);
      }

      console.log(`✅ Order notification sent: ${type} for order #${order.orderNumber}`);
      return results;
    } catch (error) {
      console.error('Error sending order notification:', error);
      throw error;
    }
  }

  // 🔹 إشعارات المصادقة والتسجيل
  async sendAuthNotification(userId, type, additionalData = {}) {
    const notificationConfigs = {
      register_success: {
        title: 'مرحباً بك! 👋',
        body: 'تم إنشاء حسابك بنجاح. يمكنك الآن طلب الوقود والمنتجات.',
        priority: 'normal'
      },
      login_success: {
        title: 'تم تسجيل الدخول ✅',
        body: 'تم تسجيل دخولك بنجاح إلى تطبيق الوقود.',
        priority: 'low'
      },
      profile_updated: {
        title: 'تم تحديث الملف الشخصي 📝',
        body: 'تم تحديث معلومات ملفك الشخصي بنجاح.',
        priority: 'low'
      }
    };

    const config = notificationConfigs[type];
    if (!config) return;

    return await this.sendToUser(userId, {
      title: config.title,
      body: config.body,
      type: type,
      priority: config.priority,
      data: additionalData,
      routing: {
        screen: 'Profile',
        params: {}
      }
    });
  }

  // 🔹 الحصول على حالة نظام الإشعارات
  async getSystemStatus() {
    const firebaseInfo = getFirebaseInfo();
    const totalNotifications = await Notification.countDocuments();
    const totalUsers = await User.countDocuments({ fcmToken: { $exists: true, $ne: null } });
    
    return {
      firebase: firebaseInfo,
      statistics: {
        totalNotifications,
        usersWithFCM: totalUsers,
        systemStatus: firebaseInfo.initialized ? 'ACTIVE' : 'LOCAL_MODE'
      },
      timestamp: new Date().toISOString()
    };
  }

  // 🔹 إشعارات الملف الشخصي والموافقات
  async sendProfileNotification(userId, type, additionalData = {}) {
    const notificationConfigs = {
      profile_approved: {
        title: 'تمت الموافقة على ملفك الشخصي',
        body: 'تمت الموافقة على ملفك الشخصي ويمكنك الآن استخدام التطبيق بكامل الميزات.',
        priority: 'high'
      },
      profile_rejected: {
        title: 'ملاحظات على ملفك الشخصي',
        body: 'هناك بعض الملاحظات على ملفك الشخصي تحتاج إلى تصحيح.',
        priority: 'high'
      },
      profile_needs_correction: {
        title: 'يتطلب ملفك الشخصي تصحيح',
        body: 'يرجى مراجعة وتصحيح المعلومات في ملفك الشخصي.',
        priority: 'high'
      },
      document_uploaded: {
        title: 'تم رفع المستند',
        body: 'تم رفع المستند بنجاح وجاري المراجعة.',
        priority: 'normal'
      },
      document_approved: {
        title: 'تمت الموافقة على المستند',
        body: 'تمت الموافقة على المستند المرفوع.',
        priority: 'normal'
      },
      document_rejected: {
        title: 'مستند مرفوض',
        body: 'تم رفض المستند المرفوع. يرجى رفع مستند صالح.',
        priority: 'high'
      }
    };

    const config = notificationConfigs[type];
    if (!config) return;

    return await this.sendToUser(userId, {
      title: config.title,
      body: config.body,
      type: type,
      priority: config.priority,
      data: additionalData,
      routing: {
        screen: 'Profile',
        params: {}
      }
    });
  }

  // 🔹 إشعارات الدفع
  async sendPaymentNotification(userId, type, additionalData = {}) {
    const notificationConfigs = {
      payment_pending: {
        title: 'عملية دفع معلقة',
        body: `عملية الدفع للمبلغ ${additionalData.amount} ر.س قيد المراجعة`,
        priority: 'normal'
      },
      payment_verified: {
        title: 'تمت عملية الدفع',
        body: `تمت عملية الدفع بنجاح للمبلغ ${additionalData.amount} ر.س`,
        priority: 'normal'
      },
      payment_failed: {
        title: 'فشل في عملية الدفع',
        body: `فشلت عملية الدفع للمبلغ ${additionalData.amount} ر.س. يرجى المحاولة مرة أخرى.`,
        priority: 'high'
      },
      payment_refunded: {
        title: 'تم استرداد المبلغ',
        body: `تم استرداد المبلغ ${additionalData.amount} ر.س إلى حسابك`,
        priority: 'normal'
      }
    };

    const config = notificationConfigs[type];
    if (!config) return;

    return await this.sendToUser(userId, {
      title: config.title,
      body: config.body,
      type: type,
      priority: config.priority,
      data: additionalData,
      routing: {
        screen: 'PaymentHistory',
        params: {}
      }
    });
  }

  // 🔹 إشعارات إدارية
  async sendAdminNotification(type, additionalData = {}) {
    const notificationConfigs = {
      new_registration: {
        title: 'مستخدم جديد',
        body: `تم تسجيل مستخدم جديد: ${additionalData.userName || 'مستخدم'}`,
        target: 'all_admins',
        priority: 'normal'
      },
      low_stock: {
        title: 'تحذير مخزون منخفض',
        body: `المخزون من ${additionalData.productName || 'المنتج'} منخفض`,
        target: 'all_admins',
        priority: 'high'
      },
      system_maintenance: {
        title: 'صيانة النظام',
        body: 'سيتم إجراء صيانة للنظام خلال الساعات القادمة',
        target: 'all_users',
        priority: 'normal'
      }
    };

    const config = notificationConfigs[type];
    if (!config) return;

    return await this.sendToGroup(config.target, {
      title: config.title,
      body: config.body,
      type: type,
      priority: config.priority,
      data: additionalData
    });
  }

  // 🔹 إشعارات المحادثات والمكالمات
  async sendChatNotification(chatId, senderId, message, type = 'chat_message') {
    try {
      // هنا تحتاج لجلب بيانات المحادثة والمستلمين
      // هذا مثال مبسط
      return await this.sendToUser(senderId, {
        title: 'رسالة جديدة',
        body: message.substring(0, 50) + '...',
        type: type,
        data: {
          chatId: chatId,
          senderId: senderId
        },
        routing: {
          screen: 'Chat',
          params: { chatId: chatId.toString() }
        }
      });
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  }

  // 🔹 جدولة إشعارات
  async processScheduledNotifications() {
    try {
      const now = new Date();
      const scheduledNotifications = await Notification.find({
        isScheduled: true,
        sentViaFcm: false,
        scheduledFor: { $lte: now }
      });

      for (const notification of scheduledNotifications) {
        if (notification.user) {
          // إشعار لمستخدم معين
          const user = await User.findById(notification.user);
          if (user?.fcmToken) {
            await sendFCMNotification(user.fcmToken, notification);
          }
        } else if (notification.broadcast && notification.targetGroup) {
          // إشعار جماعي
          await this.sendToGroup(notification.targetGroup, notification);
        }

        notification.sentViaFcm = true;
        await notification.save();
      }

      console.log(`تم معالجة ${scheduledNotifications.length} إشعار مجدول`);
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }

  // 🔹 تحديث حالة الإشعار كمقروء
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('الإشعار غير موجود');
      }

      if (!notification.readBy.includes(userId)) {
        notification.readBy.push(userId);
        await notification.save();
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // 🔹 الحصول على إحصائيات الإشعارات
  async getNotificationStats(userId, userType) {
    try {
      const filter = {
        $or: [
          { user: userId },
          { broadcast: true },
          { targetGroup: { $in: this._getUserTargetGroups(userType) } }
        ]
      };

      const total = await Notification.countDocuments(filter);
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

      return {
        total,
        unread: unreadCount,
        today: todayCount,
        read: total - unreadCount
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  // 🔹 دالة مساعدة لتحديد المجموعات المستهدفة
  _getUserTargetGroups(userType) {
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
}

module.exports = new NotificationService();