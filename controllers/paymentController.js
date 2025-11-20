// controllers/paymentController.js
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const User = require('../models/User'); // ⭐ مهم: أضف استيراد User

const paymentController = {};

// 📊 إحصائيات المدفوعات (للإدمن) - ⭐ مسار جديد
paymentController.getPaymentStats = async (req, res) => {
  try {
    console.log('📊 جلب إحصائيات المدفوعات...');

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول لإحصائيات المدفوعات'
      });
    }

    // إحصائيات أساسية
    const totalPayments = await Payment.countDocuments();
    const successfulPayments = await Payment.countDocuments({ status: 'verified' });
    const pendingPayments = await Payment.countDocuments({ status: 'under_review' });
    const failedPayments = await Payment.countDocuments({ status: 'rejected' });

    // إجمالي الإيرادات من المدفوعات المؤكدة فقط
    const revenueResult = await Payment.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // الإيرادات حسب طريقة الدفع
    const revenueByMethod = await Payment.aggregate([
      { $match: { status: 'verified' } },
      { 
        $group: { 
          _id: '$bankTransfer.bankName',
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        } 
      }
    ]);

    // المدفوعات في آخر 7 أيام
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentPaymentsStats = await Payment.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          amount: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // المدفوعات الحديثة
    const recentPayments = await Payment.find()
      .populate('userId', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const paymentStats = {
      totalPayments,
      successfulPayments,
      pendingPayments,
      failedPayments,
      totalRevenue,
      revenueByMethod: revenueByMethod.map(item => ({
        method: item._id || 'غير محدد',
        amount: item.amount,
        count: item.count
      })),
      recentPayments: recentPayments.map(payment => ({
        id: payment._id,
        userName: payment.userId?.name || 'غير محدد',
        amount: payment.totalAmount,
        status: payment.status,
        date: payment.createdAt,
        orderId: payment.orderId
      })),
      dailyStats: recentPaymentsStats
    };

    res.json({
      success: true,
      stats: paymentStats,
      message: 'تم جلب إحصائيات المدفوعات بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المدفوعات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب إحصائيات المدفوعات'
    });
  }
};

// 💳 رفع إيصال الدفع
paymentController.uploadPaymentProof = async (req, res) => {
  try {
    console.log('📤 بدء رفع إيصال الدفع...');
    console.log('Params:', req.params);
    console.log('Body:', req.body);

    const userId = req.user.userId;
    const { orderId, orderType } = req.params;
    const {
      bankName,
      accountNumber,
      transferDate,
      referenceNumber,
      amount,
      receiptFile,
      orderNumber
    } = req.body;

    // البحث عن الطلب - استخدام Order فقط
    const order = await Order.findOne({ 
      _id: orderId, 
      customerId: userId 
    });

    console.log('🔍 Order found:', order);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // إنشاء أو تحديث سجل الدفع
    let payment = await Payment.findOne({ orderId });
    console.log('💳 Payment found:', payment);

    const paymentData = {
      bankTransfer: {
        bankName: bankName || 'مصرف الراجحي',
        accountNumber: accountNumber || 'SA1234567890123456789012',
        transferDate: transferDate ? new Date(transferDate) : new Date(),
        referenceNumber: referenceNumber || orderNumber || `REF-${Date.now()}`
      },
      receipt: {
        file: receiptFile,
        fileName: `receipt_${orderId}_${Date.now()}.jpg`,
        uploadedAt: new Date()
      },
      status: 'pending',
      proofSubmittedAt: new Date()
    };

    if (payment) {
      // تحديث السجل الموجود
      payment.bankTransfer = paymentData.bankTransfer;
      payment.receipt = paymentData.receipt;
      payment.status = paymentData.status;
      payment.proofSubmittedAt = paymentData.proofSubmittedAt;
      payment.attemptCount = (payment.attemptCount || 0) + 1;
      payment.lastAttemptAt = new Date();
    } else {
      // إنشاء سجل جديد
      payment = new Payment({
        orderId,
        userId,
        userName: req.user.name || 'عميل',
        totalAmount: amount || order.totalAmount || 0,
        currency: 'SAR',
        ...paymentData,
        paymentMethod: 'bank_transfer',
        attemptCount: 1,
        lastAttemptAt: new Date()
      });
    }

    await payment.save();
    console.log('✅ Payment saved:', payment._id);

    // تحديث حالة الطلب
    await Order.findByIdAndUpdate(orderId, {
      status: 'processing',
      paymentStatus: 'verifying',
      updatedAt: new Date()
    });
    console.log('✅ Order status updated');

    res.json({
      success: true,
      message: 'تم رفع إيصال الدفع بنجاح وجاري المراجعة',
      paymentId: payment._id
    });

  } catch (error) {
    console.error('❌ خطأ في رفع إيصال الدفع:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'فشل في رفع إيصال الدفع'
    });
  }
};

// ✅ التحقق من إيصال الدفع (للإدمن)
paymentController.verifyPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, adminNotes } = req.body;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالتحقق من المدفوعات'
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'سجل الدفع غير موجود'
      });
    }

    payment.status = status;
    payment.reviewedBy = req.user.userId;
    payment.reviewedAt = new Date();
    payment.adminNotes = adminNotes;

    if (status === 'verified') {
      payment.verifiedAt = new Date();
    }

    await payment.save();

    // تحديث حالة الطلب
    let order;
    let orderType = 'normal';

    // محاولة العثور على الطلب في Order أولاً
    order = await Order.findById(payment.orderId);
    
    if (!order) {
      // إذا لم يوجد في Order، نبحث في Petrol
      order = await Petrol.findById(payment.orderId);
      orderType = 'fuel';
    }

    if (order) {
      if (status === 'verified') {
        order.status = 'ready_for_delivery';
        order.paymentVerifiedAt = new Date();
      } else if (status === 'rejected') {
        order.status = 'waiting_payment';
      }

      if (orderType === 'fuel') {
        await Petrol.findByIdAndUpdate(payment.orderId, { 
          status: order.status,
          'payment.status': status
        });
      } else {
        await Order.findByIdAndUpdate(payment.orderId, { 
          status: order.status,
          'payment.status': status
        });
      }
    }

    // إرسال إشعار للعميل
    await sendPaymentStatusNotification(payment, status, adminNotes);

    res.json({
      success: true,
      message: status === 'verified' ? 'تم التحقق من الدفع بنجاح' : 'تم رفض إيصال الدفع',
      payment
    });

  } catch (error) {
    console.error('❌ خطأ في التحقق من الدفع:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 جلب المدفوعات (مع الفلترة)
paymentController.getPayments = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;

    let query = {};

    // الإدمن يشوف كل المدفوعات، العميل يشوف مدفوعاته فقط
    if (req.user.userType === 'customer') {
      query.userId = req.user.userId;
    }

    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('orderId')
      .populate('userId', 'name email phone')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب المدفوعات:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 دوال مساعدة
const sendPaymentVerificationNotification = async (order, orderType) => {
  try {
    const admins = await User.find({ userType: 'admin', isActive: true });

    const notification = new Notification({
      title: 'إيصال دفع يحتاج مراجعة',
      body: `إيصال دفع جديد للطلب #${order.orderNumber} يحتاج مراجعة`,
      targetGroup: 'all_admins',
      type: 'payment_pending',
      data: {
        orderId: order._id,
        orderType,
        orderNumber: order.orderNumber
      },
      routing: {
        screen: 'PaymentReview',
        params: { orderId: order._id, orderType }
      }
    });

    await notification.save();
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار مراجعة الدفع:', error);
  }
};

const sendPaymentStatusNotification = async (payment, status, notes) => {
  try {
    let title, body;

    if (status === 'verified') {
      title = 'تم التحقق من الدفع';
      body = 'تم التحقق من إيصال الدفع الخاص بك وسيتم متابعة الطلب';
    } else {
      title = 'ملاحظات على إيصال الدفع';
      body = `يوجد ملاحظات على إيصال الدفع: ${notes}`;
    }

    const notification = new Notification({
      title,
      body,
      user: payment.userId,
      type: status === 'verified' ? 'payment_verified' : 'payment_failed',
      data: {
        paymentId: payment._id,
        status,
        notes
      }
    });

    await notification.save();
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار حالة الدفع:', error);
  }
};

module.exports = paymentController;