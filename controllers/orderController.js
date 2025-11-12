// controllers/orderController.js
const Order = require('../models/Order');
const Petrol = require('../models/Petrol');
const Notification = require('../models/Notification');
const User = require('../models/User');

// 📦 إنشاء طلب جديد
// 📦 إنشاء طلب منتج جديد
exports.createProductOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      productId,
      quantity,
      deliveryLocation,
      notes
    } = req.body;

    // التحقق من وجود المنتج
    const product = await Product.findById(productId);
    if (!product || product.status !== 'متاح') {
      return res.status(400).json({
        success: false,
        error: 'المنتج غير متاح'
      });
    }

    // التحقق من الكمية المتاحة
    if (product.stock.quantity < quantity) {
      return res.status(400).json({
        success: false,
        error: 'الكمية المطلوبة غير متاحة'
      });
    }

    const order = new Order({
      customerId: userId,
      serviceType: 'product_delivery',
      description: `طلب ${quantity} × ${product.productType}`,
      deliveryLocation,
      customerNotes: notes,
      status: 'pending',
      productDetails: {
        productId: product._id,
        productType: product.productType,
        quantity,
        unitPrice: product.price.current,
        totalPrice: product.price.current * quantity
      }
    });

    await order.save();

    // إرسال إشعار للمشرفين
    await sendNotificationToSupervisors(order, 'product');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب المنتج بنجاح',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalPrice: order.productDetails.totalPrice
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ⛽ إنشاء طلب وقود
exports.createFuelOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      fuelType,
      fuelLiters,
      deliveryLocation,
      vehicleInfo,
      notes
    } = req.body;

    const petrolOrder = new Petrol({
      user: userId,
      fuelType,
      fuelLiters,
      deliveryLocation,
      vehicleInfo: vehicleInfo || {},
      notes,
      status: 'pending'
    });

    // حساب السعر التقديري
    petrolOrder.calculateEstimatedPrice();
    
    await petrolOrder.save();

    // إرسال إشعار للمشرفين
    await sendNotificationToSupervisors(petrolOrder, 'fuel');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب الوقود بنجاح',
      order: {
        id: petrolOrder._id,
        orderNumber: petrolOrder.orderNumber,
        estimatedPrice: petrolOrder.pricing.estimatedPrice,
        status: petrolOrder.status
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 جلب الطلبات (مع الفلترة)
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;
    const { 
      status, 
      type, 
      page = 1, 
      limit = 10 
    } = req.query;

    let query = {};
    let orders = [];

    // بناء الاستعلام حسب نوع المستخدم
    if (userType === 'customer') {
      query.customerId = userId;
    } else if (userType === 'driver') {
      query.driverId = userId;
    }
    // المشرفين والإدمن يشوفوا كل الطلبات

    if (status) query.status = status;
    if (type) query.serviceType = type;

    if (req.query.fuel === 'true') {
      // جلب طلبات الوقود
      orders = await Petrol.find(query)
        .populate('user', 'name phone')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
    } else {
      // جلب الطلبات العادية
      orders = await Order.find(query)
        .populate('customerId', 'name phone')
        .populate('driverId', 'name phone')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);
    }

    const total = req.query.fuel === 'true' 
      ? await Petrol.countDocuments(query)
      : await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
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
      error: error.message
    });
  }
};

// 👁️ جلب طلب محدد
exports.getOrder = async (req, res) => {
  try {
    const { orderId, type } = req.params;

    let order;

    if (type === 'fuel') {
      order = await Petrol.findById(orderId)
        .populate('user', 'name phone profile')
        .populate('driverId', 'name phone profile')
        .populate('approvedBy', 'name')
        .populate('confirmedBy', 'name');
    } else {
      order = await Order.findById(orderId)
        .populate('customerId', 'name phone profile')
        .populate('driverId', 'name phone profile')
        .populate('approvedBy', 'name')
        .populate('confirmedBy', 'name');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // التحقق من الصلاحية (العميل يشوف طلباته فقط)
    if (req.user.userType === 'customer' && 
        order.customerId?._id?.toString() !== req.user.userId &&
        order.user?._id?.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول لهذا الطلب'
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ تحديث حالة الطلب (للمشرفين)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, type } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.userId;
    const userType = req.user.userType;

    // التحقق من الصلاحية (المشرفين والإدمن فقط)
    if (!['approval_supervisor', 'admin', 'monitoring'].includes(userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتغيير حالة الطلب'
      });
    }

    let order;
    const updateData = { status };

    // إضافة ملاحظات المشرف
    if (notes) {
      updateData.supervisorNotes = notes;
    }

    // تحديث وقت الموافقة إذا كانت الحالة approved
    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    if (type === 'fuel') {
      order = await Petrol.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      );
    } else {
      order = await Order.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      );
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // إرسال إشعار للعميل
    await sendStatusNotification(order, status, type);

    res.json({
      success: true,
      message: `تم تحديث حالة الطلب إلى ${getStatusText(status)}`,
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 💰 تحديد سعر الطلب (للإدمن)
exports.setOrderPrice = async (req, res) => {
  try {
    const { orderId, type } = req.params;
    const { finalPrice } = req.body;
    const userId = req.user.userId;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتحديد الأسعار'
      });
    }

    let order;
    const updateData = {
      'pricing.finalPrice': finalPrice,
      'pricing.priceVisible': true,
      'pricing.priceSetBy': userId,
      'pricing.priceSetAt': new Date(),
      'payment.status': 'pending',
      status: 'waiting_payment'
    };

    if (type === 'fuel') {
      order = await Petrol.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      );
    } else {
      order = await Order.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      );
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // إرسال إشعار للعميل
    await sendPriceNotification(order, finalPrice, type);

    res.json({
      success: true,
      message: 'تم تحديد السعر بنجاح وتم إعلام العميل',
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🚗 تخصيص سائق للطلب
exports.assignDriver = async (req, res) => {
  try {
    const { orderId, type } = req.params;
    const { driverId } = req.body;
    const userId = req.user.userId;

    // التحقق من الصلاحية (الإدمن والمشرفين)
    if (!['admin', 'approval_supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتخصيص السائقين'
      });
    }

    // التحقق من وجود السائق
    const driver = await User.findOne({ 
      _id: driverId, 
      userType: 'driver',
      isActive: true 
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'السائق غير موجود أو غير مفعل'
      });
    }

    let order;
    const updateData = {
      driverId,
      status: 'assigned_to_driver',
      assignedToDriverAt: new Date()
    };

    if (type === 'fuel') {
      order = await Petrol.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      ).populate('user', 'name phone');
    } else {
      order = await Order.findByIdAndUpdate(
        orderId, 
        updateData, 
        { new: true }
      ).populate('customerId', 'name phone');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // إرسال إشعار للسائق
    await sendDriverAssignmentNotification(order, driver, type);

    res.json({
      success: true,
      message: 'تم تخصيص السائق للطلب بنجاح',
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📍 تحديث تتبع الطلب (للسائق)
exports.updateOrderTracking = async (req, res) => {
  try {
    const { orderId, type } = req.params;
    const { status, location, note } = req.body;
    const userId = req.user.userId;

    let order;

    if (type === 'fuel') {
      order = await Petrol.findOne({ 
        _id: orderId, 
        driverId: userId 
      });
    } else {
      order = await Order.findOne({ 
        _id: orderId, 
        driverId: userId 
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود أو غير مخصص لك'
      });
    }

    // إضافة نقطة تتبع جديدة
    const trackingPoint = {
      status,
      location,
      note,
      timestamp: new Date()
    };

    order.tracking.push(trackingPoint);
    
    // تحديث الحالة إذا كانت مختلفة
    if (status && status !== order.status) {
      order.status = status;
      
      // تحديث أوقات محددة
      if (status === 'picked_up') {
        order.pickedUpAt = new Date();
      } else if (status === 'delivered' || status === 'completed') {
        order.deliveredAt = new Date();
        order.deliveryCode = generateDeliveryCode();
      }
    }

    await order.save();

    // إرسال إشعار للعميل
    await sendTrackingNotification(order, status, type);

    res.json({
      success: true,
      message: 'تم تحديث التتبع بنجاح',
      tracking: order.tracking
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 دوال مساعدة
const sendNotificationToSupervisors = async (order, type = 'normal') => {
  try {
    const supervisors = await User.find({ 
      userType: 'approval_supervisor',
      isActive: true 
    });

    const notification = new Notification({
      title: type === 'fuel' ? 'طلب وقود جديد' : 'طلب جديد',
      body: type === 'fuel' 
        ? `طلب وقود جديد #${order.orderNumber}`
        : `طلب جديد #${order.orderNumber}`,
      targetGroup: 'all_supervisors',
      type: type === 'fuel' ? 'order_new' : 'order_new',
      data: {
        orderId: order._id,
        orderType: type
      },
      routing: {
        screen: 'OrderDetails',
        params: { orderId: order._id, orderType: type }
      }
    });

    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال الإشعار:', error);
  }
};

const generateDeliveryCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const getStatusText = (status) => {
  const statusMap = {
    'pending': 'معلق',
    'approved': 'مقبول',
    'waiting_payment': 'في انتظار الدفع',
    'processing': 'قيد المعالجة',
    'ready_for_delivery': 'جاهز للتوصيل',
    'assigned_to_driver': 'مخصص للسائق',
    'picked_up': 'تم الاستلام',
    'in_transit': 'قيد التوصيل',
    'delivered': 'تم التسليم',
    'completed': 'مكتمل',
    'cancelled': 'ملغي'
  };
  return statusMap[status] || status;
};

// دوال إرسال الإشعارات (سيتم تفصيلها لاحقاً)
const sendStatusNotification = async (order, status, type) => {};
const sendPriceNotification = async (order, price, type) => {};
const sendDriverAssignmentNotification = async (order, driver, type) => {};
const sendTrackingNotification = async (order, status, type) => {};