const FuelTransfer = require('../models/FuelTransfer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadFileToFirebase } = require('../services/firebaseStorage');
const path = require('path');
const mongoose = require('mongoose'); // ⬅️ أضف هذا

const fuelTransferController = {};

fuelTransferController.createRequest = async (req, res) => {
  try {
    console.log('📦 استلام طلب نقل وقود جديد:', req.body);
    
    const {
      company,
      quantity,
      paymentMethod,
      deliveryLocation,
      coordinates
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

    // ✅ إنشاء رقم طلب فريد
    const orderNumber = `FT${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    // ✅ إنشاء طلب حقيقي في MongoDB
    const fuelTransfer = new FuelTransfer({
      orderNumber,
      customer: req.user.id,
      company,
      quantity: quantityNum,
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
        coordinates: coordinates || {}
      },
      status: 'pending'
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

    // ✅ رفع الملف إلى Firebase Storage (حقيقي)
    const fileUrl = await uploadFileToFirebase(
      req.file,
      `invoices/${orderId}/${req.file.originalname}`
    );

    // ✅ تحديث الطلب في MongoDB
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      {
        $set: {
          'documents.aramcoInvoice': {
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: fileUrl,
            uploadedAt: new Date()
          },
          status: 'under_review',
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

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

    // ✅ جلب الطلبات من MongoDB مع populate للمستخدم
    const requests = await FuelTransfer.find(query)
      .populate('customer', 'name phone')
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

    // ✅ بناء query
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // ✅ حساب pagination
    const skip = (page - 1) * limit;

    // ✅ جلب الطلبات من MongoDB مع populate للمستخدم
    const requests = await FuelTransfer.find(query)
      .populate('customer', 'name phone profileImage')
      .populate('driver', 'name phone')
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

// ❌ رفض الطلب (للمشرفين) - نسخة حقيقية
fuelTransferController.rejectRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rejectionReason } = req.body;

    console.log('❌ رفض الطلب:', { orderId, rejectionReason });

    if (!['admin', 'approval_supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح برفض الطلبات'
      });
    }

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        error: 'يجب إضافة سبب الرفض'
      });
    }

    // ✅ تحديث الطلب في MongoDB
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: 'rejected',
          'review.reviewedBy': req.user.id,
          'review.reviewedAt': new Date(),
          'review.rejectionReason': rejectionReason,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    console.log('✅ تم رفض الطلب:', orderId);

    res.json({
      success: true,
      message: 'تم رفض الطلب بنجاح',
      data: {
        order: updatedOrder
      }
    });

  } catch (error) {
    console.error('❌ Reject Request Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في رفض الطلب: ' + error.message
    });
  }
};

// 🚗 تعيين سائق (للأدمن) - نسخة حقيقية
fuelTransferController.assignDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId } = req.body;

    console.log('🚗 تعيين سائق:', { orderId, driverId });

    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتعيين السائقين'
      });
    }

    // ✅ التحقق من وجود السائق
    const driver = await User.findById(driverId);
    if (!driver || driver.userType !== 'driver') {
      return res.status(400).json({
        success: false,
        error: 'السائق غير موجود أو غير صالح'
      });
    }

    // ✅ تحديث الطلب في MongoDB
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      {
        $set: {
          driver: {
            _id: driverId,
            name: driver.name,
            phone: driver.phone
          },
          status: 'driver_assigned',
          assignedAt: new Date(),
          updatedAt: new Date()
        }
      },
      { new: true }
    ).populate('driver', 'name phone');

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    console.log('✅ تم تعيين السائق:', orderId);

    res.json({
      success: true,
      message: 'تم تعيين السائق بنجاح',
      data: {
        order: updatedOrder,
        driver: updatedOrder.driver
      }
    });

  } catch (error) {
    console.error('❌ Assign Driver Error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تعيين السائق: ' + error.message
    });
  }
};

// 🔄 تحديث حالة الطلب (للسائقين والأدمن) - نسخة حقيقية
fuelTransferController.updateStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    console.log('🔄 تحديث حالة الطلب:', { orderId, status, notes });

    const allowedStatuses = [
      'fueling_from_aramco',
      'out_for_delivery',
      'arrived_at_location',
      'unloading',
      'completed'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'الحالة غير مسموحة'
      });
    }

    // ✅ بناء بيانات التحديث
    const updateData = {
      status,
      updatedAt: new Date()
    };

    // ✅ إضافة التوقيتات حسب الحالة
    switch (status) {
      case 'fueling_from_aramco':
        updateData.fuelingStartedAt = new Date();
        break;
      case 'out_for_delivery':
        updateData.outForDeliveryAt = new Date();
        break;
      case 'arrived_at_location':
        updateData.arrivedAt = new Date();
        break;
      case 'unloading':
        updateData.unloadingStartedAt = new Date();
        break;
      case 'completed':
        updateData.completedAt = new Date();
        updateData['payment.status'] = 'paid';
        updateData['payment.paidAt'] = new Date();
        break;
    }

    if (notes) {
      updateData['review.notes'] = notes;
    }

    // ✅ تحديث الطلب في MongoDB
    const updatedOrder = await FuelTransfer.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

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

// 📊 إحصائيات الطلبات - نسخة حقيقية
fuelTransferController.getStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    console.log('📊 جلب الإحصائيات للفترة:', period);

    // ✅ جلب الإحصائيات الحقيقية من MongoDB
    const total = await FuelTransfer.countDocuments();
    const pending = await FuelTransfer.countDocuments({ status: 'pending' });
    const completed = await FuelTransfer.countDocuments({ status: 'completed' });

    // ✅ جلب الإيرادات من الطلبات المكتملة
    const completedOrders = await FuelTransfer.find({ status: 'completed' });
    const revenue = completedOrders.reduce((sum, order) => {
      return sum + (order.pricing.finalPrice || order.pricing.totalAmount || 0);
    }, 0);

    // ✅ جلب إحصائيات الشركات
    const companyStats = await FuelTransfer.aggregate([
      {
        $group: {
          _id: '$company',
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$pricing.finalPrice', '$pricing.totalAmount'] },
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const stats = {
      total,
      pending,
      completed,
      revenue: parseFloat(revenue.toFixed(2)),
      companies: companyStats,
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

    const order = await FuelTransfer.findById(orderId)
      .populate('customer', 'name phone')
      .populate('driver', 'name phone')
      .populate('pricing.priceSetBy', 'name')
      .populate('review.reviewedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
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

    // ✅ التحقق من أن المستخدم هو صاحب الطلب
    const order = await FuelTransfer.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'ليس لديك صلاحية لإلغاء هذا الطلب'
      });
    }

    // ✅ إلغاء الطلب (تحديث الحالة)
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

module.exports = fuelTransferController;