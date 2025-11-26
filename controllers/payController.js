// controllers/payController.js
const Payment = require('../models/Pay');
const FuelTransfer = require('../models/FuelTransfer');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const payController = {};

// 💳 إنشاء Payment Intent
payController.createPaymentIntent = async (req, res) => {
  try {
    const { orderId, amount, currency = 'SAR' } = req.body;
    const customerId = req.user.id;

    console.log('💳 بدء إنشاء Payment Intent:', { orderId, amount, currency, customerId });

    // ✅ التحقق من البيانات
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'orderId و amount مطلوبان'
      });
    }

    // ✅ التحقق من وجود الطلب
    const order = await FuelTransfer.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // ✅ التحقق من أن الطلب للمستخدم الصحيح
    if (order.customer.toString() !== customerId) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالدفع لهذا الطلب'
      });
    }

    // ✅ التحقق من حالة الطلب
    if (order.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'الطلب غير جاهز للدفع'
      });
    }

    // ✅ التحقق من عدم وجود دفع سابق
    const existingPayment = await Payment.findOne({ order: orderId });
    if (existingPayment) {
      if (existingPayment.status === 'succeeded') {
        return res.status(400).json({
          success: false,
          error: 'تم الدفع لهذا الطلب مسبقاً'
        });
      }
      
      // إذا كان هناك payment فاشل، نعيد استخدامه
      if (existingPayment.stripePaymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          existingPayment.stripePaymentIntentId
        );

        return res.json({
          success: true,
          data: {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency
          }
        });
      }
    }

    // 💰 إنشاء Payment Intent في Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // تحويل لـ cents
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        orderId: orderId,
        customerId: customerId,
        orderNumber: order.orderNumber || orderId
      },
      description: `دفع طلب وقود - ${order.orderNumber || orderId}`
    });

    console.log('✅ تم إنشاء Payment Intent:', paymentIntent.id);

    // 💾 حفظ بيانات الدفع في قاعدة البيانات
    const payment = new Payment({
      order: orderId,
      customer: customerId,
      amount: amount,
      currency: currency,
      paymentMethod: 'stripe',
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      status: paymentIntent.status
    });

    await payment.save();

    res.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency,
        orderNumber: order.orderNumber
      }
    });

  } catch (error) {
    console.error('❌ خطأ في إنشاء Payment Intent:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء عملية الدفع: ' + error.message
    });
  }
};

// ✅ تأكيد الدفع الناجح
payController.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    const customerId = req.user.id;

    console.log('✅ تأكيد الدفع:', { paymentIntentId, orderId, customerId });

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'paymentIntentId و orderId مطلوبان'
      });
    }

    // ✅ جلب Payment Intent من Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: `حالة الدفع غير مكتملة: ${paymentIntent.status}`
      });
    }

    // ✅ البحث عن الدفع في قاعدة البيانات
    const payment = await Payment.findOne({ 
      stripePaymentIntentId: paymentIntentId,
      order: orderId 
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'عملية الدفع غير موجودة'
      });
    }

    // ✅ تحديث حالة الدفع
    payment.status = 'succeeded';
    payment.paidAt = new Date();
    
    // ✅ حفظ تفاصيل البطاقة إذا وجدت
    if (paymentIntent.payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method
      );
      
      if (paymentMethod.card) {
        payment.cardDetails = {
          last4: paymentMethod.card.last4,
          brand: paymentMethod.card.brand,
          country: paymentMethod.card.country,
          funding: paymentMethod.card.funding
        };
      }
    }

    await payment.save();

    // ✅ تحديث حالة الطلب
    await FuelTransfer.findByIdAndUpdate(orderId, {
      status: 'paid',
      'payment.status': 'paid',
      'payment.paidAt': new Date()
    });

    console.log('✅ تم تأكيد الدفع بنجاح:', paymentIntentId);

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        orderId: orderId,
        amount: payment.amount,
        paidAt: payment.paidAt,
        transactionId: paymentIntentId
      },
      message: 'تم الدفع بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في تأكيد الدفع:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في تأكيد الدفع: ' + error.message
    });
  }
};

// 📊 جلب حالة الدفع
payController.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;

    const payment = await Payment.findOne({ 
      order: orderId,
      customer: customerId 
    })
    .populate('order', 'orderNumber company quantity totalAmount status')
    .populate('customer', 'name email phone');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'عملية الدفع غير موجودة'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('❌ خطأ في جلب حالة الدفع:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب حالة الدفع: ' + error.message
    });
  }
};

// 👤 جلب مدفوعات المستخدم
payController.getMyPayments = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    let query = { customer: customerId };
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('order', 'orderNumber company quantity totalAmount')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب المدفوعات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب المدفوعات: ' + error.message
    });
  }
};

// ↩️ استرداد المبلغ
payController.refundPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    const customerId = req.user.id;

    const payment = await Payment.findOne({ 
      _id: paymentId,
      customer: customerId 
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'عملية الدفع غير موجودة'
      });
    }

    if (payment.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن استرداد مبلغ غير مدفوع'
      });
    }

    if (payment.refund.status === 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'تم استرداد المبلغ مسبقاً'
      });
    }

    // 💰 إنشاء refund في Stripe
    const refundAmount = amount ? Math.round(amount * 100) : Math.round(payment.amount * 100);
    
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: refundAmount,
      reason: reason || 'requested_by_customer'
    });

    // 💾 تحديث حالة الاسترداد
    payment.refund = {
      amount: refundAmount / 100,
      reason: reason || 'طلب من العميل',
      requestedAt: new Date(),
      status: refund.status
    };

    if (refund.status === 'succeeded') {
      payment.refund.processedAt = new Date();
    }

    await payment.save();

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refundAmount / 100,
        status: refund.status,
        reason: reason
      },
      message: 'تم طلب استرداد المبلغ بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في استرداد المبلغ:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في استرداد المبلغ: ' + error.message
    });
  }
};

// 📈 إحصائيات الدفع
payController.getPaymentStats = async (req, res) => {
  try {
    const customerId = req.user.id;

    const [
      totalPayments,
      successfulPayments,
      totalSpent,
      recentPayments
    ] = await Promise.all([
      Payment.countDocuments({ customer: customerId }),
      Payment.countDocuments({ customer: customerId, status: 'succeeded' }),
      Payment.aggregate([
        { $match: { customer: mongoose.Types.ObjectId(customerId), status: 'succeeded' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.find({ customer: customerId })
        .populate('order', 'company')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.json({
      success: true,
      data: {
        total: totalPayments,
        successful: successfulPayments,
        failed: totalPayments - successfulPayments,
        totalSpent: totalSpent[0]?.total || 0,
        recentPayments: recentPayments
      }
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات الدفع:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في جلب الإحصائيات: ' + error.message
    });
  }
};

module.exports = payController;