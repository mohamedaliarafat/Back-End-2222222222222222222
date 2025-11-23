// services/notificationService.js
const Notification = require('../models/Notification');
const User = require('../models/User');
const Order = require('../models/Order');
const { sendFCMNotification, isFirebaseInitialized, getFirebaseInfo } = require('../config/firebase');

class NotificationService {
  // 🔹 إرسال إشعار لمستخدم معين
  async sendToUser(userId, notificationData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }

      // التحقق من صحة البيانات قبل الحفظ
      const notification = new Notification({
        ...notificationData,
        user: userId,
        broadcast: false,
        targetGroup: null // تأكيد تعيين null عندما broadcast = false
      });

      // التحقق من الصحة قبل الحفظ
      await notification.validate();

      await notification.save();

      // إرسال FCM إذا كان لدى المستخدم token
      if (user.fcmToken && isFirebaseInitialized()) {
        try {
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
        } catch (fcmError) {
          console.error('FCM Error:', fcmError);
          // نستمر حتى مع فشل FCM - الإشعار محفوظ محلياً
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
        'all_monitoring': 'monitoring',
        'customer': 'customer',
        'driver': 'driver',
        'admin': 'admin',
        'supervisor': 'approval_supervisor',
        'all': {} // جميع المستخدمين
      };

      if (userTypeMap[targetGroup]) {
        userQuery = { 
          ...(targetGroup !== 'all' && { userType: userTypeMap[targetGroup] }),
          isActive: true,
          fcmToken: { $exists: true, $ne: null }
        };
      }

      const users = await User.find(userQuery).select('fcmToken name userType');
      const validTokens = users.map(u => u.fcmToken).filter(token => token);

      // إنشاء إشعار رئيسي
      const notification = new Notification({
        ...notificationData,
        broadcast: true,
        targetGroup: targetGroup
      });

      // التحقق من الصحة قبل الحفظ
      await notification.validate();
      await notification.save();

      // إرسال جماعي
      let sentCount = 0;
      let failedCount = 0;

      if (validTokens.length > 0 && isFirebaseInitialized()) {
        try {
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
        } catch (fcmError) {
          console.error('FCM Group Error:', fcmError);
          failedCount = validTokens.length;
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
        .populate('customerId', 'name fcmToken userType')
        .populate('driverId', 'name fcmToken userType');
      
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
          body: `تم تحديد السعر النهائي لطلبك #${order.orderNumber} - ${order.finalPrice || order.totalAmount} ر.س`,
          target: 'customer',
          priority: 'normal'
        },

        // 🔹 في انتظار الدفع (للمستخدم)
        order_waiting_payment: {
          title: 'في انتظار الدفع ⏳',
          body: `الطلب #${order.orderNumber} في انتظار الدفع - ${order.finalPrice || order.totalAmount} ر.س`,
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
          title: order.customerId ? 'تم تعيين سائق 🚗' : 'تم تعيين طلب لك 🚗',
          body: order.customerId 
            ? `تم تعيين السائق ${order.driverId?.name || 'سائق'} لطلبك #${order.orderNumber}`
            : `تم تعيين الطلب #${order.orderNumber} لك للتسليم`,
          target: order.customerId ? ['customer', 'driver'] : 'driver',
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
        },

        // 🔹 تحديث حالة عام
        order_status_updated: {
          title: 'تم تحديث حالة الطلب 📝',
          body: `تم تحديث حالة الطلب #${order.orderNumber} إلى ${additionalData.status || 'حالة جديدة'}`,
          target: ['customer', 'driver'].filter(Boolean),
          priority: 'normal'
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
              amount: order.finalPrice || order.totalAmount,
              status: order.status,
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
              amount: order.finalPrice || order.totalAmount,
              status: order.status,
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
              amount: order.finalPrice || order.totalAmount,
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
      },
      auth: {
        title: 'تنبيه أمني 🔒',
        body: 'تم تنفيذ عملية مصادقة على حسابك.',
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
        screen: 'Profile',
        params: {}
      }
    });
  }

  // 🔹 إشعارات الملف الشخصي والموافقات
  async sendProfileNotification(userId, type, additionalData = {}) {
    const notificationConfigs = {
      profile_approved: {
        title: 'تمت الموافقة على ملفك الشخصي ✅',
        body: 'تمت الموافقة على ملفك الشخصي ويمكنك الآن استخدام التطبيق بكامل الميزات.',
        priority: 'high'
      },
      profile_rejected: {
        title: 'ملاحظات على ملفك الشخصي 📝',
        body: additionalData.reason || 'هناك بعض الملاحظات على ملفك الشخصي تحتاج إلى تصحيح.',
        priority: 'high'
      },
      profile_needs_correction: {
        title: 'يتطلب ملفك الشخصي تصحيح ⚠️',
        body: 'يرجى مراجعة وتصحيح المعلومات في ملفك الشخصي.',
        priority: 'high'
      },
      document_uploaded: {
        title: 'تم رفع المستند 📄',
        body: 'تم رفع المستند بنجاح وجاري المراجعة.',
        priority: 'normal'
      },
      document_approved: {
        title: 'تمت الموافقة على المستند ✅',
        body: 'تمت الموافقة على المستند المرفوع.',
        priority: 'normal'
      },
      document_rejected: {
        title: 'مستند مرفوض ❌',
        body: additionalData.reason || 'تم رفض المستند المرفوع. يرجى رفع مستند صالح.',
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
        title: 'عملية دفع معلقة ⏳',
        body: `عملية الدفع للمبلغ ${additionalData.amount || 0} ر.س قيد المراجعة`,
        priority: 'normal'
      },
      payment_verified: {
        title: 'تمت عملية الدفع ✅',
        body: `تمت عملية الدفع بنجاح للمبلغ ${additionalData.amount || 0} ر.س`,
        priority: 'normal'
      },
      payment_failed: {
        title: 'فشل في عملية الدفع ❌',
        body: `فشلت عملية الدفع للمبلغ ${additionalData.amount || 0} ر.س. يرجى المحاولة مرة أخرى.`,
        priority: 'high'
      },
      payment_refunded: {
        title: 'تم استرداد المبلغ 💰',
        body: `تم استرداد المبلغ ${additionalData.amount || 0} ر.س إلى حسابك`,
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
        title: 'مستخدم جديد 👤',
        body: `تم تسجيل مستخدم جديد: ${additionalData.userName || 'مستخدم'}`,
        target: 'all_admins',
        priority: 'normal'
      },
      low_stock: {
        title: 'تحذير مخزون منخفض 📦',
        body: `المخزون من ${additionalData.productName || 'المنتج'} منخفض - ${additionalData.currentStock || 0} وحدة متبقية`,
        target: 'all_admins',
        priority: 'high'
      },
      system_maintenance: {
        title: 'صيانة النظام 🛠️',
        body: additionalData.message || 'سيتم إجراء صيانة للنظام خلال الساعات القادمة',
        target: 'all',
        priority: 'normal'
      },
      admin_alert: {
        title: 'تنبيه إداري ⚠️',
        body: additionalData.message || 'تنبيه إداري مهم',
        target: 'all_admins',
        priority: 'high'
      },
      supervisor_alert: {
        title: 'تنبيه للمشرفين 📋',
        body: additionalData.message || 'تنبيه مهم للمشرفين',
        target: 'all_supervisors',
        priority: 'normal'
      },
      monitoring_alert: {
        title: 'تنبيه مراقبة 📊',
        body: additionalData.message || 'تنبيه نظام المراقبة',
        target: 'all_monitoring',
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

  // 🔹 إشعارات الوقود المحددة
  async sendFuelNotification(orderId, type, additionalData = {}) {
    const order = await Order.findById(orderId);
    if (!order) return;

    const notificationConfigs = {
      fuel_order_new: {
        title: 'طلب وقود جديد ⛽',
        body: `طلب وقود جديد #${order.orderNumber} - ${order.fuelType || 'وقود'}`,
        target: ['all_drivers', 'all_supervisors'],
        priority: 'high'
      },
      fuel_order_status: {
        title: 'تحديث حالة طلب الوقود 📝',
        body: `تم تحديث حالة طلب الوقود #${order.orderNumber} إلى ${additionalData.status || 'حالة جديدة'}`,
        target: 'customer',
        priority: 'normal'
      },
      fuel_delivery_started: {
        title: 'بدأ تسليم الوقود 🚚',
        body: `بدأ تسليم طلب الوقود #${order.orderNumber}`,
        target: 'customer',
        priority: 'normal'
      },
      fuel_delivery_completed: {
        title: 'تم تسليم الوقود ✅',
        body: `تم تسليم طلب الوقود #${order.orderNumber} بنجاح`,
        target: ['customer', 'all_supervisors'],
        priority: 'normal'
      },
      fuel_price_updated: {
        title: 'تحديث أسعار الوقود 💰',
        body: 'تم تحديث أسعار الوقود في النظام',
        target: 'all_customers',
        priority: 'normal'
      }
    };

    const config = notificationConfigs[type];
    if (!config) return;

    return await this.sendOrderNotification(orderId, type, additionalData);
  }

  // 🔹 إشعارات العروض والتخفيضات
  async sendOfferNotification(type, additionalData = {}) {
    const notificationConfigs = {
      new_offer: {
        title: 'عرض جديد! 🎉',
        body: additionalData.title || 'عرض خاص جديد متاح الآن',
        target: 'all_customers',
        priority: 'normal'
      },
      special_discount: {
        title: 'تخفيض خاص 🔥',
        body: additionalData.message || 'تخفيضات خاصة على المنتجات',
        target: 'all_customers',
        priority: 'normal'
      },
      loyalty_reward: {
        title: 'مكافأة الولاء ⭐',
        body: additionalData.message || 'لقد ربحت مكافأة ولاء جديدة',
        target: 'all_customers',
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
      data: additionalData,
      routing: {
        screen: 'Offers',
        params: {}
      }
    });
  }

  // 🔹 إشعارات المحادثات والمكالمات
  async sendChatNotification(receiverId, senderName, message, chatId, type = 'chat_message') {
    return await this.sendToUser(receiverId, {
      title: `رسالة جديدة من ${senderName}`,
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      type: type,
      priority: 'high',
      data: {
        chatId: chatId,
        senderName: senderName
      },
      routing: {
        screen: 'Chat',
        params: { chatId: chatId.toString() }
      }
    });
  }

  async sendCallNotification(receiverId, callerName, callId, type = 'incoming_call') {
    return await this.sendToUser(receiverId, {
      title: `مكالمة واردة من ${callerName}`,
      body: 'مكالمة واردة...',
      type: type,
      priority: 'urgent',
      data: {
        callId: callId,
        callerName: callerName
      },
      routing: {
        screen: 'Call',
        params: { callId: callId }
      }
    });
  }

  // 🔹 إشعارات السائقين
  async sendDriverNotification(driverId, type, additionalData = {}) {
    const notificationConfigs = {
      driver_assignment: {
        title: 'تم تعيين طلب جديد 🚗',
        body: `تم تعيين طلب جديد لك #${additionalData.orderNumber || ''}`,
        priority: 'high'
      },
      driver_location: {
        title: 'تحديث الموقع 📍',
        body: 'تم تحديث موقع التسليم',
        priority: 'normal'
      },
      driver_arrived: {
        title: 'وصل السائق ✅',
        body: 'وصل السائق إلى موقع التسليم',
        priority: 'normal'
      }
    };

    const config = notificationConfigs[type];
    if (!config) return;

    return await this.sendToUser(driverId, {
      title: config.title,
      body: config.body,
      type: type,
      priority: config.priority,
      data: additionalData,
      routing: {
        screen: 'OrderDetails',
        params: { orderId: additionalData.orderId }
      }
    });
  }

  // 🔹 إشعارات النظام العامة
  async sendSystemNotification(message, priority = 'normal', targetGroup = 'all') {
    return await this.sendToGroup(targetGroup, {
      title: 'إشعار نظام 🔔',
      body: message,
      type: 'system',
      priority: priority,
      data: {
        system: true,
        timestamp: new Date().toISOString()
      }
    });
  }

  // 🔹 معالجة الإشعارات المجدولة
  async processScheduledNotifications() {
    try {
      const now = new Date();
      const scheduledNotifications = await Notification.find({
        isScheduled: true,
        sentViaFcm: false,
        scheduledFor: { $lte: now }
      });

      console.log(`🔔 Processing ${scheduledNotifications.length} scheduled notifications...`);

      for (const notification of scheduledNotifications) {
        try {
          if (notification.user) {
            // إشعار لمستخدم معين
            const user = await User.findById(notification.user);
            if (user?.fcmToken && isFirebaseInitialized()) {
              await sendFCMNotification(user.fcmToken, notification);
              notification.sentViaFcm = true;
            }
          } else if (notification.broadcast && notification.targetGroup) {
            // إشعار جماعي
            await this.sendToGroup(notification.targetGroup, notification);
            notification.sentViaFcm = true;
          }

          await notification.save();
          console.log(`✅ Processed scheduled notification: ${notification.title}`);
        } catch (error) {
          console.error(`❌ Error processing scheduled notification ${notification._id}:`, error);
        }
      }

      return { processed: scheduledNotifications.length };
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      throw error;
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

  // 🔹 الحصول على حالة نظام الإشعارات
  async getSystemStatus() {
    const firebaseInfo = getFirebaseInfo();
    const totalNotifications = await Notification.countDocuments();
    const totalUsers = await User.countDocuments({ fcmToken: { $exists: true, $ne: null } });
    
    // إحصائيات حسب النوع
    const typeStats = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      firebase: firebaseInfo,
      statistics: {
        totalNotifications,
        usersWithFCM: totalUsers,
        systemStatus: firebaseInfo.initialized ? 'ACTIVE' : 'LOCAL_MODE',
        typeStats: typeStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      timestamp: new Date().toISOString()
    };
  }

  // 🔹 دالة مساعدة لتحديد المجموعات المستهدفة
  _getUserTargetGroups(userType) {
    const groups = ['all']; // جميع المستخدمين يرون الإشعارات العامة
    
    switch (userType) {
      case 'customer':
        groups.push('all_customers', 'customer');
        break;
      case 'driver':
        groups.push('all_drivers', 'driver');
        break;
      case 'approval_supervisor':
        groups.push('all_supervisors', 'supervisor');
        break;
      case 'admin':
        groups.push('all_admins', 'admin');
        break;
      case 'monitoring':
        groups.push('all_monitoring');
        break;
    }
    
    return groups;
  }

  // 🔹 تنظيف الإشعارات القديمة
  async cleanOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        priority: { $in: ['low', 'normal'] } // نحتفظ بالإشعارات العاجلة والهامة
      });

      console.log(`🧹 Cleaned ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning old notifications:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();