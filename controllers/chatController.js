// controllers/chatController.js
const { Chat, Message } = require('../models/Chat');
const Order = require('../models/Order');
const Petrol = require('../models/Petrol');
const User = require('../models/User');
const Notification = require('../models/Notification');


const chatController = {};

// 💬 إنشاء محادثة جديدة
chatController.createChat = async (req, res) => {
  try {
    const { orderId, orderType } = req.params;
    const userId = req.user.userId;

    let order;

    // البحث عن الطلب
    if (orderType === 'fuel') {
      order = await Petrol.findById(orderId)
        .populate('user', 'name')
        .populate('driverId', 'name');
    } else {
      order = await Order.findById(orderId)
        .populate('customerId', 'name')
        .populate('driverId', 'name');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // التحقق من صلاحية المستخدم للدخول في المحادثة
    const customerId = orderType === 'fuel' ? order.user._id : order.customerId._id;
    const driverId = order.driverId?._id;

    if (![customerId.toString(), driverId?.toString()].includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالدخول إلى هذه المحادثة'
      });
    }

    // البحث عن محادثة موجودة أو إنشاء جديدة
    let chat = await Chat.findOne({ orderId });

    if (!chat) {
      chat = new Chat({
        orderId,
        customerId,
        driverId: driverId || null,
        isActive: true
      });
      await chat.save();
    }

    res.json({
      success: true,
      chat: {
        id: chat._id,
        orderId: chat.orderId,
        customerId: chat.customerId,
        driverId: chat.driverId,
        isActive: chat.isActive
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📨 إرسال رسالة
chatController.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type, receiverId } = req.body;
    const senderId = req.user.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'المحادثة غير موجودة'
      });
    }

    // التحقق من أن المرسل مشارك في المحادثة
    if (![chat.customerId.toString(), chat.driverId?.toString()].includes(senderId)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بإرسال رسائل في هذه المحادثة'
      });
    }

    const message = new Message({
      chatId,
      senderId,
      receiverId,
      orderId: chat.orderId,
      type: type || 'text',
      content: type === 'text' ? { text: content } : content,
      status: 'sent'
    });

    await message.save();

    // تحديث آخر رسالة في المحادثة
    chat.lastMessage = {
      messageId: message._id,
      content: message.content,
      type: message.type,
      timestamp: message.timestamp,
      senderId: message.senderId
    };

    // زيادة عدد الرسائل غير المقروءة للمستقبل
    if (receiverId.toString() === chat.customerId.toString()) {
      chat.unreadCount.customer += 1;
    } else if (chat.driverId && receiverId.toString() === chat.driverId.toString()) {
      chat.unreadCount.driver += 1;
    }

    await chat.save();

    // إرسال إشعار للمستقبل (سيتم استخدام Socket.io)
    await sendMessageNotification(message, chat);

    // إرجاع الرسالة مع بيانات المرسل
    const messageWithSender = await Message.findById(message._id)
      .populate('senderId', 'name profile');

    res.json({
      success: true,
      message: messageWithSender
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📥 جلب رسائل المحادثة
chatController.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'المحادثة غير موجودة'
      });
    }

    // التحقق من صلاحية المستخدم
    if (![chat.customerId.toString(), chat.driverId?.toString()].includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بمشاهدة هذه المحادثة'
      });
    }

    const messages = await Message.find({ chatId })
      .populate('senderId', 'name profile')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // تحديث عدد الرسائل غير المقروءة
    if (userId === chat.customerId.toString()) {
      chat.unreadCount.customer = 0;
    } else if (chat.driverId && userId === chat.driverId.toString()) {
      chat.unreadCount.driver = 0;
    }
    await chat.save();

    res.json({
      success: true,
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Message.countDocuments({ chatId }),
        pages: Math.ceil(await Message.countDocuments({ chatId }) / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📞 بدء مكالمة
chatController.startCall = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { callType } = req.body;
    const callerId = req.user.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'المحادثة غير موجودة'
      });
    }

    // تحديد المستقبل
    const receiverId = callerId === chat.customerId.toString() 
      ? chat.driverId 
      : chat.customerId;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        error: 'لا يوجد مستقبل للمكالمة'
      });
    }

    // إنشاء رسالة مكالمة
    const callMessage = new Message({
      chatId,
      senderId: callerId,
      receiverId,
      orderId: chat.orderId,
      type: 'call',
      callInfo: {
        type: callType || 'audio',
        status: 'answered',
        callId: `call_${Date.now()}`
      },
      status: 'sent'
    });

    await callMessage.save();

    // تحديث المحادثة
    chat.lastMessage = {
      messageId: callMessage._id,
      content: { text: `مكالمة ${callType === 'video' ? 'فيديو' : 'صوت'}` },
      type: 'call',
      timestamp: callMessage.timestamp,
      senderId: callMessage.senderId
    };
    await chat.save();

    // إرسال إشعار المكالمة
    await sendCallNotification(callMessage, chat, callType);

    res.json({
      success: true,
      message: 'تم بدء المكالمة بنجاح',
      call: {
        callId: callMessage.callInfo.callId,
        callType: callMessage.callInfo.type,
        chatId,
        callerId,
        receiverId
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 جلب محادثات المستخدم
chatController.getUserChats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    // البحث عن المحادثات التي يشارك فيها المستخدم
    const chats = await Chat.find({
      $or: [
        { customerId: userId },
        { driverId: userId }
      ],
      isActive: true
    })
    .populate('customerId', 'name profile')
    .populate('driverId', 'name profile')
    .sort({ updatedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // جلب آخر رسالة لكل محادثة
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await Message.findOne({ chatId: chat._id })
          .populate('senderId', 'name profile')
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          ...chat.toObject(),
          lastMessage: lastMessage || null
        };
      })
    );

    res.json({
      success: true,
      chats: chatsWithLastMessage,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Chat.countDocuments({
          $or: [
            { customerId: userId },
            { driverId: userId }
          ],
          isActive: true
        }),
        pages: Math.ceil(await Chat.countDocuments({
          $or: [
            { customerId: userId },
            { driverId: userId }
          ],
          isActive: true
        }) / limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🗑️ حذف محادثة
chatController.deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'المحادثة غير موجودة'
      });
    }

    // التحقق من الصلاحية
    if (![chat.customerId.toString(), chat.driverId?.toString()].includes(userId)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بحذف هذه المحادثة'
      });
    }

    // تعطيل المحادثة بدلاً من الحذف
    chat.isActive = false;
    await chat.save();

    res.json({
      success: true,
      message: 'تم تعطيل المحادثة بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 دوال مساعدة
const sendMessageNotification = async (message, chat) => {
  try {
    const sender = await User.findById(message.senderId);
    const receiver = await User.findById(message.receiverId);

    const notification = new Notification({
      title: sender.name,
      body: message.type === 'text' 
        ? message.content.text 
        : `أرسل ${getMessageTypeText(message.type)}`,
      user: message.receiverId,
      type: 'chat_message',
      data: {
        chatId: chat._id,
        orderId: chat.orderId,
        messageId: message._id,
        senderId: message.senderId,
        messageType: message.type
      },
      routing: {
        screen: 'ChatScreen',
        params: { 
          chatId: chat._id,
          orderId: chat.orderId 
        }
      }
    });

    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار الرسالة:', error);
  }
};

const sendCallNotification = async (callMessage, chat, callType) => {
  try {
    const caller = await User.findById(callMessage.senderId);

    const notification = new Notification({
      title: 'مكالمة واردة',
      body: `${caller.name} يتصل بك`,
      user: callMessage.receiverId,
      type: 'incoming_call',
      data: {
        chatId: chat._id,
        orderId: chat.orderId,
        callId: callMessage.callInfo.callId,
        callerId: callMessage.senderId,
        callType: callType
      },
      routing: {
        screen: 'CallScreen',
        params: { 
          callId: callMessage.callInfo.callId,
          chatId: chat._id,
          isIncoming: true 
        }
      },
      priority: 'high'
    });

    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار المكالمة:', error);
  }
};

const getMessageTypeText = (type) => {
  const typeMap = {
    'text': 'رسالة',
    'image': 'صورة',
    'voice': 'رسالة صوتية',
    'video': 'فيديو',
    'file': 'ملف'
  };
  return typeMap[type] || 'رسالة';
};


module.exports = chatController;