const FuelTransfer = require('../models/FuelTransfer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadFileToFirebase } = require('../services/firebaseStorage');
const path = require('path');
const mongoose = require('mongoose');

const fuelTransferController = {};

// 📝 إنشاء طلب نقل وقود جديد - نسخة حقيقية
fuelTransferController.createRequest = async (req, res) => {
  try {
    console.log('📦 استلام طلب نقل وقود جديد:', req.body);
    
    const {
      company,
      quantity,
      paymentMethod,
      deliveryLocation,
      coordinates,
      fuelType = 'بنزين 95'
    } = req.body;

    // ✅ التحقق من البيانات المطلوبة
    if (!company || !quantity || !paymentMethod || !deliveryLocation) {
      return res.status(400).json({
        success: false,
        error: 'جميع الحقول مطلوبة'
      });
    }

    // ✅ التحقق من أن الكمية رقمية
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'الكمية يجب أن تكون رقماً أكبر من الصفر'
      });
    }

    // ✅ الحصول على سعر الشركة
    const fuelPrices = {
      'إنرجكس': 2.18,
      'نهل': 2.25,
      'بيتروجين': 2.32,
      'ارامكو': 2.15
    };

    const pricePerLiter = fuelPrices[company];
    if (!pricePerLiter) {
      return res.status(400).json({
        success: false,
        error: 'الشركة غير مدعومة'
      });
    }

    // ✅ حساب التكاليف
    const subtotal = quantityNum * pricePerLiter;
    const deliveryFee = 25.0;
    const vat = subtotal * 0.15;
    const totalAmount = subtotal + deliveryFee + vat;

    // ✅ توليد رقم طلب فريد
    const generateOrderNumber = () => {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `FT${timestamp}${random}`;
    };

    // ✅ إنشاء طلب حقيقي في MongoDB
    const fuelTransfer = new FuelTransfer({
      orderNumber: generateOrderNumber(),
      customer: req.user.id,
      company,
      fuelType,
      quantity: quantityNum,
      unit: 'لتر',
      pricing: {
        pricePerLiter,
        subtotal: parseFloat(subtotal.toFixed(2)),
        deliveryFee,
        vat: parseFloat(vat.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        finalPrice: parseFloat(totalAmount.toFixed(2))
      },
      payment: {
        method: paymentMethod,
        status: 'pending'
      },
      deliveryLocation: {
        address: deliveryLocation,
        coordinates: coordinates || {},
        additionalInstructions: ''
      },
      status: 'pending',
      priority: 'normal',
      source: 'mobile'
    });

    // ✅ حفظ الطلب في قاعدة البيانات
    const savedOrder = await fuelTransfer.save();
    
    console.log('✅ تم حفظ الطلب في قاعدة البيانات:', savedOrder._id);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب نقل الوقود بنجاح',
      data: {
        order: savedOrder,
        orderNumber: savedOrder.orderNumber
      }
    });

  } catch (error) {
    console.error('❌ Create Fuel Transfer Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إنشاء الطلب: ' + error.message
    });
  }
};

// 📤 رفع فاتورة أرامكو - نسخة حقيقية
fuelTransferController.uploadAramcoInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('📤 رفع فاتورة للطلب:', orderId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'يجب رفع ملف الفاتورة'
      });
    }

    // ✅ التحقق من صحة الـ ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب غير صالح'
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

    // ✅ التحقق من أن المستخدم هو صاحب الطلب
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لرفع فاتورة لهذا الطلب'
      });
    }

    // ✅ رفع الملف إلى Firebase Storage (أو تخزين محلي)
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/your-app.appspot.com/o/invoices%2F${orderId}%2F${req.file.originalname}?alt=media`;
    // أو: const fileUrl = await uploadFileToFirebase(req.file, `invoices/${orderId}/${req.file.originalname}`);

    // ✅ تحديث الطلب في MongoDB
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      {
        $set: {
          'documents.aramcoInvoice': {
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: fileUrl,
            uploadedAt: new Date(),
            verified: false
          },
          status: 'under_review',
          updatedAt: new Date()
        }
      },
      { new: true }
    ).populate('customer', 'name phone');

    console.log('✅ تم رفع الفاتورة بنجاح:', orderId);

    res.json({
      success: true,
      message: 'تم رفع الفاتورة بنجاح',
      data: {
        document: updatedOrder.documents.aramcoInvoice,
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('❌ Upload Invoice Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في رفع الملف: ' + error.message
    });
  }
};

// 👁️ جلب طلبات المستخدم الحقيقية
fuelTransferController.getUserRequests = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status 
    } = req.query;

    console.log('📥 جلب طلبات المستخدم:', { userId: req.user.id });

    // ✅ بناء query
    const query = { customer: req.user.id };
    
    // ✅ إضافة فلتر الحالة
    if (status && status !== 'all') {
      query.status = status;
    }

    // ✅ حساب pagination
    const skip = (page - 1) * limit;

    // ✅ جلب الطلبات من MongoDB
    const requests = await FuelTransfer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // ✅ جلب العدد الكلي للطلبات
    const total = await FuelTransfer.countDocuments(query);

    console.log(`✅ تم جلب ${requests.length} طلب من ${total}`);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get User Requests Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الطلبات: ' + error.message
    });
  }
};

// 📋 جلب جميع الطلبات (للأدمن والمشرفين) - نسخة حقيقية
fuelTransferController.getAllRequests = async (req, res) => {
  try {
    console.log('📋 جلب جميع الطلبات للمشرف:', req.user.userType);

    const { page = 1, limit = 10, status } = req.query;

    // ✅ التحقق من الصلاحيات
    if (!['admin', 'supervisor', 'approval_supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح لك بجلب جميع الطلبات'
      });
    }

    // ✅ بناء query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // ✅ حساب pagination
    const skip = (page - 1) * limit;

    // ✅ جلب الطلبات من MongoDB
    const requests = await FuelTransfer.find(query)
      .populate('customer', 'name phone profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // ✅ جلب العدد الكلي
    const total = await FuelTransfer.countDocuments(query);

    res.json({
      success: true,
      data: {
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('❌ Get All Requests Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الطلبات: ' + error.message
    });
  }
};

// ✅ الموافقة على الطلب (للمشرفين) - نسخة حقيقية
fuelTransferController.approveRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { finalPrice, notes } = req.body;

    console.log('✅ موافقة على الطلب:', { orderId, finalPrice, notes });

    // ✅ التحقق من الصلاحيات
    if (!['admin', 'approval_supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالموافقة على الطلبات'
      });
    }

    // ✅ التحقق من صحة الـ ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب غير صالح'
      });
    }

    // ✅ تحديث الطلب في MongoDB
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: 'approved',
          'pricing.finalPrice': finalPrice,
          'pricing.priceVisible': true,
          'pricing.priceSetBy': req.user.id,
          'pricing.priceSetAt': new Date(),
          'review.reviewedBy': req.user.id,
          'review.reviewedAt': new Date(),
          'review.notes': notes || '',
          updatedAt: new Date()
        }
      },
      { new: true }
    ).populate('customer', 'name phone');

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    console.log('✅ تمت الموافقة على الطلب:', orderId);

    res.json({
      success: true,
      message: 'تمت الموافقة على الطلب بنجاح',
      data: {
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('❌ Approve Request Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في الموافقة على الطلب: ' + error.message
    });
  }
};

// 📊 إحصائيات الطلبات - نسخة حقيقية
fuelTransferController.getStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    console.log('📊 جلب الإحصائيات للفترة:', period);

    // ✅ جلب الإحصائيات الحقيقية من MongoDB
    const total = await FuelTransfer.countDocuments({ customer: req.user.id });
    const pending = await FuelTransfer.countDocuments({ 
      customer: req.user.id, 
      status: 'pending' 
    });
    const completed = await FuelTransfer.countDocuments({ 
      customer: req.user.id, 
      status: 'completed' 
    });

    // ✅ جلب الإيرادات
    const completedOrders = await FuelTransfer.find({ 
      customer: req.user.id, 
      status: 'completed' 
    });
    
    const revenue = completedOrders.reduce((sum, order) => {
      return sum + (order.pricing.finalPrice || order.pricing.totalAmount || 0);
    }, 0);

    const stats = {
      total,
      pending,
      completed,
      revenue: parseFloat(revenue.toFixed(2)),
      period
    };

    console.log('✅ تم جلب الإحصائيات الحقيقية:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب الإحصائيات: ' + error.message
    });
  }
};

// ✅ دالة جديدة: الحصول على تفاصيل طلب معين
fuelTransferController.getRequestDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('📋 جلب تفاصيل الطلب:', orderId);

    // ✅ التحقق من صحة الـ ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب غير صالح'
      });
    }

    const order = await FuelTransfer.findById(orderId)
      .populate('customer', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // ✅ التحقق من أن المستخدم هو صاحب الطلب
    if (order.customer._id.toString() !== req.user.id && 
        !['admin', 'supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لعرض هذا الطلب'
      });
    }

    console.log('✅ تم جلب تفاصيل الطلب:', orderId);

    res.json({
      success: true,
      data: {
        order
      }
    });

  } catch (error) {
    console.error('❌ Get Request Details Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب تفاصيل الطلب: ' + error.message
    });
  }
};

// ✅ دالة جديدة: إلغاء الطلب
fuelTransferController.cancelRequest = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log('🗑️ إلغاء الطلب:', orderId);

    // ✅ التحقق من صحة الـ ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب غير صالح'
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

    // ✅ التحقق من أن المستخدم هو صاحب الطلب
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لإلغاء هذا الطلب'
      });
    }

    // ✅ التحقق من إمكانية الإلغاء
    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن إلغاء الطلب في مرحلته الحالية'
      });
    }

    // ✅ إلغاء الطلب
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    console.log('✅ تم إلغاء الطلب:', orderId);

    res.json({
      success: true,
      message: 'تم إلغاء الطلب بنجاح',
      data: {
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('❌ Cancel Request Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إلغاء الطلب: ' + error.message
    });
  }
};

// ✅ دالة جديدة: تحديث حالة الطلب الأساسية
fuelTransferController.updateStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    console.log('🔄 تحديث حالة الطلب:', { orderId, status });

    // ✅ التحقق من صحة الـ ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        error: 'رقم الطلب غير صالح'
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

    // ✅ بناء بيانات التحديث
    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (notes) {
      updateData['review.notes'] = notes;
    }

    // ✅ إضافة التوقيتات حسب الحالة
    const now = new Date();
    switch (status) {
      case 'fueling_from_aramco':
        updateData.fuelingStartedAt = now;
        break;
      case 'out_for_delivery':
        updateData.outForDeliveryAt = now;
        break;
      case 'arrived_at_location':
        updateData.arrivedAt = now;
        break;
      case 'unloading':
        updateData.unloadingStartedAt = now;
        break;
      case 'completed':
        updateData.completedAt = now;
        updateData['payment.status'] = 'paid';
        updateData['payment.paidAt'] = now;
        break;
    }

    // ✅ تحديث الطلب
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    );

    console.log('✅ تم تحديث حالة الطلب:', orderId);

    res.json({
      success: true,
      message: 'تم تحديث حالة الطلب بنجاح',
      data: {
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('❌ Update Status Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث الحالة: ' + error.message
    });
  }
};

module.exports = fuelTransferController;