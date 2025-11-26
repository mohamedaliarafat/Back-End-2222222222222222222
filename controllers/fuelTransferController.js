// controllers/fuelTransferController.js
const FuelTransfer = require('../models/FuelTransfer');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { uploadFileToFirebase } = require('../services/firebaseStorage');
const path = require('path');

const fuelTransferController = {};



// 📝 إنشاء طلب نقل وقود جديد
fuelTransferController.createRequest = async (req, res) => {
  try {
    console.log('📦 استلام طلب نقل وقود جديد:', req.body);
    console.log('🎯 تم استدعاء createRequest بنجاح!');
    console.log('📧 المستخدم:', req.user);
    console.log('📦 البيانات:', req.body);
    
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
        error: 'جميع الحقول مطلوبة: الشركة، الكمية، طريقة الدفع، موقع التسليم'
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
        error: 'الشركة غير مدعومة. الشركات المتاحة: إنرجكس، نهل، بيتروجين، ارامكو'
      });
    }

    // ✅ حساب التكاليف
    const subtotal = quantityNum * pricePerLiter;
    const deliveryFee = 25.0;
    const vat = subtotal * 0.15;
    const totalAmount = subtotal + deliveryFee + vat;

    // ✅ إنشاء رقم طلب فريد
    const orderNumber = `FT${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();

    // ✅ إنشاء الطلب (بيانات تجريبية مؤقتة)
    const fuelTransfer = {
      _id: `mock_${Date.now()}`,
      orderNumber,
      customer: {
        _id: req.user.id,
        name: req.user.name || 'مستخدم',
        phone: req.user.phone || 'غير محدد'
      },
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
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('✅ تم إنشاء الطلب التجريبي:', fuelTransfer);

    // ✅ محاكاة حفظ في قاعدة البيانات
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب نقل الوقود بنجاح',
      data: {
        order: fuelTransfer,
        orderNumber: fuelTransfer.orderNumber
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

// 📤 رفع فاتورة أرامكو
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

    // ✅ محاكاة رفع الملف
    const fileUrl = `https://firebasestorage.googleapis.com/v0/b/your-app.appspot.com/o/invoices%2F${orderId}%2F${req.file.originalname}?alt=media`;

    // ✅ تحديث الطلب (بيانات تجريبية)
    const updatedOrder = {
      _id: orderId,
      documents: {
        aramcoInvoice: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          url: fileUrl,
          uploadedAt: new Date()
        }
      },
      status: 'under_review',
      updatedAt: new Date()
    };

    console.log('✅ تم رفع الفاتورة بنجاح:', updatedOrder);

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

// 👁️ جلب طلبات المستخدم
fuelTransferController.getUserRequests = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status 
    } = req.query;

    console.log('📥 جلب طلبات المستخدم:', { userId: req.user.id, status, page, limit });

    // ✅ بيانات تجريبية للطلبات
    const mockOrders = [
      {
        _id: 'mock_001',
        orderNumber: 'FT001',
        customer: {
          _id: req.user.id,
          name: req.user.name || 'مستخدم',
          phone: req.user.phone || 'غير محدد'
        },
        company: 'نهل',
        quantity: 5,
        pricing: {
          pricePerLiter: 2.25,
          subtotal: 11.25,
          deliveryFee: 25,
          vat: 1.69,
          totalAmount: 37.94,
          finalPrice: 37.94
        },
        payment: {
          method: 'stripe',
          status: 'pending'
        },
        deliveryLocation: {
          address: 'RHSA4979 - حي السليمانية - الرياض',
          coordinates: {}
        },
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        _id: 'mock_002',
        orderNumber: 'FT002',
        customer: {
          _id: req.user.id,
          name: req.user.name || 'مستخدم',
          phone: req.user.phone || 'غير محدد'
        },
        company: 'بيتروجين',
        quantity: 58,
        pricing: {
          pricePerLiter: 2.32,
          subtotal: 134.56,
          deliveryFee: 25,
          vat: 20.18,
          totalAmount: 179.74,
          finalPrice: 179.74
        },
        payment: {
          method: 'card',
          status: 'paid'
        },
        deliveryLocation: {
          address: 'حي النخيل - الرياض',
          coordinates: {}
        },
        status: 'completed',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 11 * 60 * 60 * 1000)
      },
      {
        _id: 'mock_003',
        orderNumber: 'FT003',
        customer: {
          _id: req.user.id,
          name: req.user.name || 'مستخدم', 
          phone: req.user.phone || 'غير محدد'
        },
        company: 'ارامكو',
        quantity: 100,
        pricing: {
          pricePerLiter: 2.15,
          subtotal: 215,
          deliveryFee: 25,
          vat: 32.25,
          totalAmount: 272.25,
          finalPrice: 272.25
        },
        payment: {
          method: 'stripe',
          status: 'paid'
        },
        deliveryLocation: {
          address: 'حي العليا - الرياض',
          coordinates: {}
        },
        status: 'approved',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    // ✅ تصفية حسب الحالة
    let filteredOrders = mockOrders;
    if (status && status !== 'all') {
      filteredOrders = mockOrders.filter(order => order.status === status);
    }

    // ✅ تطبيق الباجينيشين
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    console.log(`✅ تم جلب ${paginatedOrders.length} طلب من ${filteredOrders.length}`);

    res.json({
      success: true,
      data: {
        requests: paginatedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredOrders.length,
          pages: Math.ceil(filteredOrders.length / limit)
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

// 📋 جلب جميع الطلبات (للأدمن والمشرفين)
fuelTransferController.getAllRequests = async (req, res) => {
  try {
    console.log('📋 جلب جميع الطلبات للمشرف:', req.user.userType);

    // ✅ استخدام نفس البيانات التجريبية مع بعض الإضافات
    const mockOrders = [
      {
        _id: 'mock_001',
        orderNumber: 'FT001',
        customer: {
          _id: 'user_001',
          name: 'أحمد محمد',
          phone: '0551234567',
          profileImage: null
        },
        company: 'نهل',
        quantity: 5,
        pricing: {
          pricePerLiter: 2.25,
          subtotal: 11.25,
          deliveryFee: 25,
          vat: 1.69,
          totalAmount: 37.94,
          finalPrice: 37.94
        },
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        deliveryLocation: {
          address: 'RHSA4979 - حي السليمانية - الرياض'
        }
      },
      {
        _id: 'mock_002', 
        orderNumber: 'FT002',
        customer: {
          _id: 'user_002',
          name: 'سارة عبدالله',
          phone: '0557654321',
          profileImage: null
        },
        company: 'بيتروجين',
        quantity: 58,
        pricing: {
          pricePerLiter: 2.32,
          subtotal: 134.56,
          deliveryFee: 25,
          vat: 20.18,
          totalAmount: 179.74,
          finalPrice: 179.74
        },
        status: 'completed',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
        deliveryLocation: {
          address: 'حي النخيل - الرياض'
        }
      }
    ];

    res.json({
      success: true,
      data: {
        requests: mockOrders,
        pagination: {
          page: 1,
          limit: 10,
          total: mockOrders.length,
          pages: 1
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

// ✅ الموافقة على الطلب (للمشرفين)
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

    // ✅ محاكاة تحديث الطلب
    const updatedOrder = {
      _id: orderId,
      status: 'approved',
      pricing: {
        finalPrice: finalPrice || 37.94,
        priceVisible: true,
        priceSetBy: req.user.id,
        priceSetAt: new Date()
      },
      review: {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        notes: notes || ''
      },
      updatedAt: new Date()
    };

    console.log('✅ تمت الموافقة على الطلب:', updatedOrder);

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

// ❌ رفض الطلب (للمشرفين)
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

    // ✅ محاكاة تحديث الطلب
    const updatedOrder = {
      _id: orderId,
      status: 'rejected',
      review: {
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        rejectionReason
      },
      updatedAt: new Date()
    };

    console.log('✅ تم رفض الطلب:', updatedOrder);

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

// 🚗 تعيين سائق (للأدمن)
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

    // ✅ محاكاة تعيين السائق
    const updatedOrder = {
      _id: orderId,
      driver: {
        _id: driverId,
        name: 'سائق تجريبي',
        phone: '0550000000'
      },
      status: 'driver_assigned',
      assignedAt: new Date(),
      updatedAt: new Date()
    };

    console.log('✅ تم تعيين السائق:', updatedOrder);

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

// 🔄 تحديث حالة الطلب (للسائقين والأدمن)
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

    // ✅ محاكاة تحديث الحالة
    const updatedOrder = {
      _id: orderId,
      status,
      updatedAt: new Date()
    };

    // ✅ إضافة التوقيتات حسب الحالة
    switch (status) {
      case 'fueling_from_aramco':
        updatedOrder.fuelingStartedAt = new Date();
        break;
      case 'out_for_delivery':
        updatedOrder.outForDeliveryAt = new Date();
        break;
      case 'arrived_at_location':
        updatedOrder.arrivedAt = new Date();
        break;
      case 'unloading':
        updatedOrder.unloadingStartedAt = new Date();
        break;
      case 'completed':
        updatedOrder.completedAt = new Date();
        updatedOrder.payment = { status: 'paid', paidAt: new Date() };
        break;
    }

    if (notes) {
      updatedOrder.review = { notes };
    }

    console.log('✅ تم تحديث حالة الطلب:', updatedOrder);

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

// 📊 إحصائيات الطلبات
fuelTransferController.getStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    console.log('📊 جلب الإحصائيات للفترة:', period);

    // ✅ إحصائيات تجريبية
    const stats = {
      total: 15,
      pending: 3,
      completed: 8,
      revenue: 1850.50,
      companies: [
        { _id: 'نهل', count: 6, revenue: 750.25 },
        { _id: 'بيتروجين', count: 5, revenue: 650.75 },
        { _id: 'ارامكو', count: 4, revenue: 449.50 }
      ],
      period
    };

    console.log('✅ تم جلب الإحصائيات:', stats);

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

module.exports = fuelTransferController;