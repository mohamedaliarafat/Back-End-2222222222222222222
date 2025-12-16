// // controllers/orderController.js
// const Order = require('../models/Order');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// // ========= Fuel Helper =========
// function getFuelTypeName(type) {
//   switch (type) {
//     case '91':
//       return 'بنزين 91';
//     case '95':
//       return 'بنزين 95';
//     case 'diesel':
//     case 'ديزل':
//       return 'ديزل';
//     case '98':
//       return 'بنزين 98';
//     case 'premium_diesel':
//       return 'ديزل ممتاز';
//     case 'كيروسين':
//       return 'كيروسين';
//     default:
//       return 'نوع وقود غير معروف';
//   }
// }

// // ⛽ إنشاء طلب وقود
// exports.createOrder = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const {
//       fuelType,
//       fuelLiters,
//       deliveryLocation,
//       vehicleInfo,
//       customerNotes,
//       notes
//     } = req.body;

//     console.log('📥 استقبال طلب وقود:', {
//       userId,
//       fuelType,
//       fuelLiters,
//       deliveryLocation,
//       vehicleInfo
//     });

//     // إنشاء طلب الوقود
//     const order = new Order({
//       customerId: userId,
//       serviceType: 'fuel',
//       description: `طلب وقود ${fuelType} - ${fuelLiters} لتر`,
      
//       // معلومات التسليم
//       deliveryLocation: {
//         address: deliveryLocation?.address || '',
//         coordinates: {
//           lat: deliveryLocation?.coordinates?.lat || 0,
//           lng: deliveryLocation?.coordinates?.lng || 0
//         },
//         contactName: deliveryLocation?.contactName || '',
//         contactPhone: deliveryLocation?.contactPhone || '',
//         instructions: deliveryLocation?.instructions || ''
//       },

//       // معلومات الوقود
//       fuelDetails: {
//         fuelType: fuelType || '',
//         fuelLiters: fuelLiters || 0,
//         fuelTypeName: getFuelTypeName(fuelType)
//       },

//       // معلومات المركبة
//       vehicleInfo: vehicleInfo || {
//         type: '',
//         model: '',
//         licensePlate: '',
//         color: ''
//       },

//       // التسعير
//       pricing: {
//         estimatedPrice: 0,
//         finalPrice: 0,
//         priceVisible: false,
//         fuelPricePerLiter: 0,
//         serviceFee: 0
//       },

//       // الدفع
//       payment: {
//         status: 'hidden',
//         proof: {
//           image: '',
//           bankName: '',
//           accountNumber: '',
//           amount: 0
//         }
//       },

//       // الملاحظات
//       customerNotes: customerNotes || notes || '',
//       notes: notes || '',

//       // الحالة
//       status: 'pending',
//       submittedAt: new Date()
//     });

//     // حساب السعر التقديري
//     order.calculateEstimatedPrice();

//     // حفظ في قاعدة البيانات
//     await order.save();

//     console.log('✅ تم حفظ طلب الوقود في قاعدة البيانات:', {
//       id: order._id,
//       orderNumber: order.orderNumber,
//       estimatedPrice: order.pricing.estimatedPrice
//     });

//     // إرسال إشعار للمشرفين
//     await sendNotificationToSupervisors(order);

//     res.status(201).json({
//       success: true,
//       message: 'تم إنشاء طلب الوقود بنجاح',
//       order: {
//         id: order._id,
//         orderNumber: order.orderNumber,
//         estimatedPrice: order.pricing.estimatedPrice,
//         finalPrice: order.pricing.finalPrice,
//         status: order.status,
//         fuelType: order.fuelDetails.fuelType,
//         fuelLiters: order.fuelDetails.fuelLiters,
//         fuelTypeName: order.fuelDetails.fuelTypeName,
//         createdAt: order.createdAt
//       }
//     });

//   } catch (error) {
//     console.error('❌ خطأ في إنشاء طلب الوقود:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message,
//       message: 'فشل في إنشاء طلب الوقود'
//     });
//   }
// };

// // 📋 جلب طلبات الوقود (مع الفلترة)
// exports.getOrders = async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const userType = req.user.userType;
//     const { 
//       status, 
//       page = 1, 
//       limit = 10 
//     } = req.query;

//     let query = { serviceType: 'fuel' };

//     // بناء الاستعلام حسب نوع المستخدم
//     if (userType === 'customer') {
//       query.customerId = userId;
//     } else if (userType === 'driver') {
//       query.driverId = userId;
//     }
//     // المشرفين والإدمن يشوفوا كل الطلبات

//     if (status) query.status = status;

//     const orders = await Order.find(query)
//       .populate('customerId', 'name phone profile')
//       .populate('driverId', 'name phone profile')
//       .populate('approvedBy', 'name')
//       .populate('confirmedBy', 'name')
//       .sort({ createdAt: -1 })
//       .limit(limit * 1)
//       .skip((page - 1) * limit);

//     const total = await Order.countDocuments(query);

//     res.json({
//       success: true,
//       orders,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / limit)
//       }
//     });

//   } catch (error) {
//     console.error('❌ خطأ في جلب طلبات الوقود:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 👁️ جلب طلب وقود محدد
// exports.getOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const userId = req.user.userId;
//     const userType = req.user.userType;

//     const order = await Order.findOne({ 
//       _id: orderId, 
//       serviceType: 'fuel' 
//     })
//     .populate('customerId', 'name phone profile')
//     .populate('driverId', 'name phone profile')
//     .populate('approvedBy', 'name')
//     .populate('confirmedBy', 'name');

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'طلب الوقود غير موجود'
//       });
//     }

//     // التحقق من الصلاحية (العميل يشوف طلباته فقط)
//     if (userType === 'customer' && 
//         order.customerId._id.toString() !== userId) {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بالوصول لهذا الطلب'
//       });
//     }

//     res.json({
//       success: true,
//       order
//     });

//   } catch (error) {
//     console.error('❌ خطأ في جلب طلب الوقود:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // ✅ تحديث حالة طلب الوقود (للمشرفين)
// exports.updateOrderStatus = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { status, notes } = req.body;
//     const userId = req.user.userId;
//     const userType = req.user.userType;

//     // التحقق من الصلاحية (المشرفين والإدمن فقط)
//     if (!['approval_supervisor', 'admin', 'monitoring'].includes(userType)) {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بتغيير حالة الطلب'
//       });
//     }

//     const updateData = { status };

//     // إضافة ملاحظات المشرف
//     if (notes) {
//       updateData.supervisorNotes = notes;
//     }

//     // تحديث وقت الموافقة إذا كانت الحالة approved
//     if (status === 'approved') {
//       updateData.approvedBy = userId;
//       updateData.approvedAt = new Date();
//     }

//     const order = await Order.findOneAndUpdate(
//       { _id: orderId, serviceType: 'fuel' }, 
//       updateData, 
//       { new: true }
//     )
//     .populate('customerId', 'name phone')
//     .populate('approvedBy', 'name');

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'طلب الوقود غير موجود'
//       });
//     }

//     // إرسال إشعار للعميل
//     await sendStatusNotification(order, status);

//     console.log('✅ تم تحديث حالة طلب الوقود:', {
//       orderId: order._id,
//       status: order.status
//     });

//     res.json({
//       success: true,
//       message: `تم تحديث حالة الطلب إلى ${getStatusText(status)}`,
//       order
//     });

//   } catch (error) {
//     console.error('❌ خطأ في تحديث حالة طلب الوقود:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 💰 تحديد سعر طلب الوقود - الإصدار المحسّن
// exports.setOrderPrice = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { finalPrice, adminNotes } = req.body;
//     const userId = req.user.userId;

//     console.log('💰 تحديث سعر الطلب:', { orderId, finalPrice });

//     // البحث عن الطلب
//     const order = await Order.findOne({ 
//       _id: orderId, 
//       serviceType: 'fuel' 
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'طلب الوقود غير موجود'
//       });
//     }

//     // 🔥 تحديث السعر والحالة معاً
//     const updateData = {
//       'pricing.finalPrice': finalPrice,
//       'pricing.priceVisible': true,
//       'pricing.priceSetAt': new Date(),
//       status: 'waiting_payment' // ✅ تغيير الحالة إلى في انتظار الدفع
//     };

//     // إضافة ملاحظات المشرف إذا وجدت
//     if (adminNotes) {
//       updateData.adminNotes = adminNotes;
//     }

//     // تحديث الطلب
//     const updatedOrder = await Order.findOneAndUpdate(
//       { _id: orderId, serviceType: 'fuel' },
//       { $set: updateData },
//       { 
//         new: true, 
//         runValidators: true 
//       }
//     )
//     .populate('customerId', 'name phone email')
//     .populate('driverId', 'name phone');

//     if (!updatedOrder) {
//       return res.status(404).json({
//         success: false,
//         error: 'فشل في تحديث سعر الطلب'
//       });
//     }

//     console.log('✅ تم تحديث سعر الطلب والحالة:', {
//       orderId: updatedOrder._id,
//       finalPrice: updatedOrder.pricing.finalPrice,
//       status: updatedOrder.status
//     });

//     // 🔥 إرسال إشعار للعميل بتحديث السعر والحالة
//     await sendPriceAndStatusNotification(updatedOrder, finalPrice);

//     res.json({
//       success: true,
//       message: 'تم تحديد السعر بنجاح والطلب الآن في انتظار الدفع',
//       order: updatedOrder
//     });

//   } catch (error) {
//     console.error('❌ خطأ في setOrderPrice:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 🔥 دالة بديلة لتحديث السعر فقط بدون تغيير الحالة
// exports.updateOrderPriceOnly = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { finalPrice, priceVisible = true } = req.body;

//     console.log('💰 تحديث السعر فقط:', { orderId, finalPrice });

//     const order = await Order.findOneAndUpdate(
//       { _id: orderId, serviceType: 'fuel' },
//       { 
//         $set: {
//           'pricing.finalPrice': finalPrice,
//           'pricing.priceVisible': priceVisible
//         }
//       },
//       { new: true, runValidators: true }
//     )
//     .populate('customerId', 'name phone');

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'الطلب غير موجود'
//       });
//     }

//     res.json({
//       success: true,
//       message: 'تم تحديث السعر بنجاح',
//       order
//     });

//   } catch (error) {
//     console.error('❌ خطأ في updateOrderPriceOnly:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 🎛️ موافقة نهائية على الطلب مع السعر
// exports.approveOrderWithPrice = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { finalPrice, adminNotes } = req.body;
//     const userId = req.user.userId;

//     console.log('🎛️ موافقة نهائية على الطلب:', { orderId, finalPrice });

//     const order = await Order.findOne({ 
//       _id: orderId, 
//       serviceType: 'fuel' 
//     });
    
//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'الطلب غير موجود'
//       });
//     }

//     // 🔥 تحديث شامل للطلب
//     const updateData = {
//       'pricing.finalPrice': finalPrice,
//       'pricing.priceVisible': true,
//       'pricing.priceSetAt': new Date(),
//       status: 'waiting_payment', // ✅ الحالة الجديدة
//       approvedBy: userId,
//       approvedAt: new Date(),
//       adminNotes: adminNotes || ''
//     };

//     const updatedOrder = await Order.findOneAndUpdate(
//       { _id: orderId, serviceType: 'fuel' },
//       { $set: updateData },
//       { new: true, runValidators: true }
//     )
//     .populate('customerId', 'name phone email')
//     .populate('approvedBy', 'name');

//     if (!updatedOrder) {
//       return res.status(404).json({
//         success: false,
//         error: 'فشل في الموافقة على الطلب'
//       });
//     }

//     // 🔥 إرسال إشعار للعميل
//     await sendPriceAndStatusNotification(updatedOrder, finalPrice);

//     console.log('✅ تمت الموافقة على الطلب مع السعر:', {
//       orderId: updatedOrder._id,
//       finalPrice: updatedOrder.pricing.finalPrice,
//       status: updatedOrder.status
//     });

//     res.json({
//       success: true,
//       message: 'تمت الموافقة على الطلب وتحديد السعر بنجاح',
//       order: updatedOrder
//     });

//   } catch (error) {
//     console.error('❌ خطأ في finalApproveOrder:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 🚗 تخصيص سائق لطلب الوقود
// exports.assignOrderDriver = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { driverId } = req.body;
//     const userId = req.user.userId;

//     // التحقق من الصلاحية (الإدمن والمشرفين)
//     if (!['admin', 'approval_supervisor'].includes(req.user.userType)) {
//       return res.status(403).json({
//         success: false,
//         error: 'غير مسموح بتخصيص السائقين'
//       });
//     }

//     // التحقق من وجود السائق
//     const driver = await User.findOne({ 
//       _id: driverId, 
//       userType: 'driver',
//       isActive: true 
//     });

//     if (!driver) {
//       return res.status(404).json({
//         success: false,
//         error: 'السائق غير موجود أو غير مفعل'
//       });
//     }

//     const updateData = {
//       driverId,
//       status: 'assigned_to_driver',
//       assignedToDriverAt: new Date()
//     };

//     const order = await Order.findOneAndUpdate(
//       { _id: orderId, serviceType: 'fuel' }, 
//       updateData, 
//       { new: true }
//     )
//     .populate('customerId', 'name phone')
//     .populate('driverId', 'name phone');

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'طلب الوقود غير موجود'
//       });
//     }

//     // إرسال إشعار للسائق
//     await sendDriverAssignmentNotification(order, driver);

//     console.log('✅ تم تخصيص سائق لطلب الوقود:', {
//       orderId: order._id,
//       driverId: order.driverId._id
//     });

//     res.json({
//       success: true,
//       message: 'تم تخصيص السائق للطلب بنجاح',
//       order
//     });

//   } catch (error) {
//     console.error('❌ خطأ في تخصيص سائق لطلب الوقود:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 📍 تحديث تتبع طلب الوقود (للسائق)
// exports.updateOrderTracking = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const { status, location, note } = req.body;
//     const userId = req.user.userId;

//     const order = await Order.findOne({ 
//       _id: orderId, 
//       serviceType: 'fuel',
//       driverId: userId 
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'طلب الوقود غير موجود أو غير مخصص لك'
//       });
//     }

//     // إضافة نقطة تتبع جديدة
//     const trackingPoint = {
//       status,
//       location: {
//         lat: location?.lat || 0,
//         lng: location?.lng || 0
//       },
//       note: note || '',
//       timestamp: new Date()
//     };

//     order.tracking.push(trackingPoint);
    
//     // تحديث الحالة إذا كانت مختلفة
//     if (status && status !== order.status) {
//       order.status = status;
      
//       // تحديث أوقات محددة
//       if (status === 'picked_up') {
//         order.pickedUpAt = new Date();
//       } else if (status === 'delivered' || status === 'completed') {
//         order.deliveredAt = new Date();
//         order.deliveryCode = generateDeliveryCode();
//       }
//     }

//     await order.save();

//     // إرسال إشعار للعميل
//     await sendTrackingNotification(order, status);

//     console.log('✅ تم تحديث تتبع طلب الوقود:', {
//       orderId: order._id,
//       status: order.status
//     });

//     res.json({
//       success: true,
//       message: 'تم تحديث التتبع بنجاح',
//       tracking: order.tracking
//     });

//   } catch (error) {
//     console.error('❌ خطأ في تحديث تتبع طلب الوقود:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // ❌ إلغاء طلب الوقود
// exports.cancelOrder = async (req, res) => {
//   try {
//     const { orderId } = req.params;
//     const userId = req.user.userId;

//     const order = await Order.findOne({ 
//       _id: orderId, 
//       serviceType: 'fuel',
//       customerId: userId 
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         error: 'طلب الوقود غير موجود'
//       });
//     }

//     if (!['pending', 'approved'].includes(order.status)) {
//       return res.status(400).json({
//         success: false,
//         error: 'لا يمكن إلغاء الطلب في حالته الحالية'
//       });
//     }

//     order.status = 'cancelled';
//     await order.save();

//     res.json({
//       success: true,
//       message: 'تم إلغاء طلب الوقود بنجاح',
//       order
//     });

//   } catch (error) {
//     console.error('❌ خطأ في إلغاء طلب الوقود:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// };

// // 🎯 دوال مساعدة
// const sendNotificationToSupervisors = async (order) => {
//   try {
//     const supervisors = await User.find({ 
//       userType: 'approval_supervisor',
//       isActive: true 
//     });

//     const notification = new Notification({
//       title: 'طلب وقود جديد',
//       body: `طلب وقود جديد #${order.orderNumber}`,
//       targetGroup: 'all_supervisors',
//       type: 'fuel_order_new',
//       data: {
//         orderId: order._id,
//         orderType: 'fuel'
//       },
//       routing: {
//         screen: 'OrderDetails',
//         params: { orderId: order._id }
//       }
//     });

//     await notification.save();
//     console.log('📨 تم إرسال إشعار للمشرفين عن طلب وقود جديد');
//   } catch (error) {
//     console.error('❌ خطأ في إرسال الإشعار:', error);
//   }
// };

// // 🔔 إرسال إشعار بتحديث السعر والحالة
// const sendPriceAndStatusNotification = async (order, price) => {
//   try {
//     const notification = new Notification({
//       title: 'تم تحديد سعر الطلب',
//       body: `تم تحديد سعر طلبك #${order.orderNumber} - ${price} ريال - الطلب في انتظار الدفع`,
//       targetUsers: [order.customerId],
//       type: 'order_price_set',
//       data: {
//         orderId: order._id,
//         orderType: 'fuel',
//         price: price,
//         status: 'waiting_payment'
//       },
//       routing: {
//         screen: 'OrderDetails',
//         params: { orderId: order._id }
//       }
//     });
    
//     await notification.save();
//     console.log('📨 تم إرسال إشعار السعر والحالة للعميل');
    
//   } catch (error) {
//     console.error('❌ خطأ في إرسال إشعار السعر والحالة:', error);
//   }
// };

// const generateDeliveryCode = () => {
//   return Math.random().toString(36).substring(2, 8).toUpperCase();
// };

// const getStatusText = (status) => {
//   const statusMap = {
//     'pending': 'معلق',
//     'approved': 'مقبول',
//     'waiting_payment': 'في انتظار الدفع',
//     'processing': 'قيد المعالجة',
//     'ready_for_delivery': 'جاهز للتوصيل',
//     'assigned_to_driver': 'مخصص للسائق',
//     'picked_up': 'تم الاستلام',
//     'in_transit': 'قيد التوصيل',
//     'delivered': 'تم التسليم',
//     'completed': 'مكتمل',
//     'cancelled': 'ملغي',
//     'on_the_way': 'في الطريق',
//     'fueling': 'قيد التعبئة'
//   };
//   return statusMap[status] || status;
// };

// // دوال إرسال الإشعارات الأساسية
// const sendStatusNotification = async (order, status) => {
//   try {
//     const notification = new Notification({
//       title: 'تحديث حالة الطلب',
//       body: `تم تحديث حالة طلبك #${order.orderNumber} إلى ${getStatusText(status)}`,
//       targetUsers: [order.customerId],
//       type: 'order_status_update',
//       data: {
//         orderId: order._id,
//         orderType: 'fuel',
//         status: status
//       }
//     });
//     await notification.save();
//   } catch (error) {
//     console.error('خطأ في إرسال إشعار الحالة:', error);
//   }
// };

// const sendPriceNotification = async (order, price) => {
//   try {
//     const notification = new Notification({
//       title: 'تم تحديد السعر',
//       body: `تم تحديد سعر طلبك #${order.orderNumber} - ${price} ريال`,
//       targetUsers: [order.customerId],
//       type: 'order_price_set',
//       data: {
//         orderId: order._id,
//         orderType: 'fuel',
//         price: price
//       }
//     });
//     await notification.save();
//   } catch (error) {
//     console.error('خطأ في إرسال إشعار السعر:', error);
//   }
// };

// const sendDriverAssignmentNotification = async (order, driver) => {
//   try {
//     // إشعار للعميل
//     const customerNotification = new Notification({
//       title: 'تم تخصيص سائق',
//       body: `تم تخصيص السائق ${driver.name} لطلبك #${order.orderNumber}`,
//       targetUsers: [order.customerId],
//       type: 'driver_assigned',
//       data: {
//         orderId: order._id,
//         orderType: 'fuel',
//         driverId: driver._id
//       }
//     });
//     await customerNotification.save();

//     // إشعار للسائق
//     const driverNotification = new Notification({
//       title: 'طلب جديد مخصص لك',
//       body: `تم تخصيص طلب وقود #${order.orderNumber} لك`,
//       targetUsers: [driver._id],
//       type: 'new_assigned_order',
//       data: {
//         orderId: order._id,
//         orderType: 'fuel'
//       }
//     });
//     await driverNotification.save();
//   } catch (error) {
//     console.error('خطأ في إرسال إشعار تخصيص السائق:', error);
//   }
// };

// const sendTrackingNotification = async (order, status) => {
//   try {
//     const notification = new Notification({
//       title: 'تحديث التتبع',
//       body: `تم تحديث حالة التوصيل لطلبك #${order.orderNumber} إلى ${getStatusText(status)}`,
//       targetUsers: [order.customerId],
//       type: 'order_tracking_update',
//       data: {
//         orderId: order._id,
//         orderType: 'fuel',
//         status: status
//       }
//     });
//     await notification.save();
//   } catch (error) {
//     console.error('خطأ في إرسال إشعار التتبع:', error);
//   }
// };


// controllers/orderController.js
const Order = require('../models/Order');
const NotificationService = require('../services/notificationService');
const User = require('../models/User');

// ========= Fuel Helper =========
function getFuelTypeName(type) {
  switch (type) {
    case '91':
      return 'بنزين 91';
    case '95':
      return 'بنزين 95';
    case 'diesel':
    case 'ديزل':
      return 'ديزل';
    case '98':
      return 'بنزين 98';
    case 'premium_diesel':
      return 'ديزل ممتاز';
    case 'كيروسين':
      return 'كيروسين';
    default:
      return 'نوع وقود غير معروف';
  }
}

// ========= Notification Integration =========

// ⛽ إنشاء طلب وقود مع الإشعارات التلقائية
exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      fuelType,
      fuelLiters,
      deliveryLocation,
      vehicleInfo,
      customerNotes,
      notes
    } = req.body;

    console.log('📥 استقبال طلب وقود:', {
      userId,
      fuelType,
      fuelLiters,
      deliveryLocation,
      vehicleInfo
    });

    // 🛑 تحقق مبدئي
    if (!fuelType || !fuelLiters || !deliveryLocation) {
      return res.status(400).json({
        success: false,
        message: 'بيانات الطلب غير مكتملة'
      });
    }

    let order;
    let attempts = 0;
    const MAX_RETRIES = 3;

    // 🔁 Retry loop لحل مشكلة duplicate orderNumber
    while (attempts < MAX_RETRIES) {
      try {
        order = new Order({
          customerId: userId,
          serviceType: 'fuel',

          description: `طلب وقود ${fuelType} - ${fuelLiters} لتر`,

          // 📍 معلومات التسليم
          deliveryLocation: {
            address: deliveryLocation.address || '',
            coordinates: {
              lat: deliveryLocation.coordinates?.lat || 0,
              lng: deliveryLocation.coordinates?.lng || 0
            },
            contactName: deliveryLocation.contactName || '',
            contactPhone: deliveryLocation.contactPhone || '',
            instructions: deliveryLocation.instructions || ''
          },

          // ⛽ معلومات الوقود
          fuelDetails: {
            fuelType,
            fuelLiters,
            fuelTypeName: getFuelTypeName(fuelType)
          },

          // 🚗 معلومات المركبة
          vehicleInfo: vehicleInfo || {
            type: '',
            model: '',
            licensePlate: '',
            color: ''
          },

          // 💰 التسعير
          pricing: {
            estimatedPrice: 0,
            finalPrice: 0,
            priceVisible: false,
            fuelPricePerLiter: 0,
            serviceFee: 0
          },

          // 💳 الدفع
          payment: {
            status: 'hidden'
          },

          // 📝 الملاحظات
          customerNotes: customerNotes || notes || '',
          notes: notes || '',

          // 📊 الحالة
          status: 'pending',
          submittedAt: new Date()
        });

        // 🔢 حساب السعر التقديري
        order.calculateEstimatedPrice();

        // 💾 حفظ الطلب
        await order.save();

        // ✅ لو نجح الحفظ نخرج فورًا
        break;

      } catch (err) {
        // ❌ Duplicate key → جرّب مرة أخرى
        if (err.code === 11000 && err.keyPattern?.orderNumber) {
          attempts++;
          console.warn(
            `⚠️ Duplicate orderNumber detected, retry ${attempts}/${MAX_RETRIES}`
          );
          continue;
        }

        // ❌ أي خطأ آخر
        throw err;
      }
    }

    // 🛑 فشل بعد retries
    if (!order || !order._id) {
      return res.status(500).json({
        success: false,
        message: 'تعذر إنشاء الطلب، حاول مرة أخرى'
      });
    }

    console.log('✅ تم حفظ طلب الوقود:', {
      id: order._id,
      orderNumber: order.orderNumber,
      estimatedPrice: order.pricing.estimatedPrice
    });

    // 🔔 إشعار للعميل
    await NotificationService.sendOrderNotification(
      order._id,
      'order_confirmed',
      {
        fuelType: order.fuelDetails.fuelTypeName,
        liters: order.fuelDetails.fuelLiters
      }
    );

    // 🔔 إشعار للإدارة
    await NotificationService.sendOrderNotification(
      order._id,
      'order_new'
    );

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب الوقود بنجاح',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        estimatedPrice: order.pricing.estimatedPrice,
        finalPrice: order.pricing.finalPrice,
        status: order.status,
        fuelType: order.fuelDetails.fuelType,
        fuelLiters: order.fuelDetails.fuelLiters,
        fuelTypeName: order.fuelDetails.fuelTypeName,
        createdAt: order.createdAt
      }
    });

  } catch (error) {
    console.error('❌ خطأ في إنشاء طلب الوقود:', error);

    return res.status(500).json({
      success: false,
      message: 'فشل في إنشاء طلب الوقود',
      error: error.message
    });
  }
};

// 📋 جلب طلبات الوقود (مع الفلترة)
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.userType;
    const { 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;

    let query = { serviceType: 'fuel' };

    // بناء الاستعلام حسب نوع المستخدم
    if (userType === 'customer') {
      query.customerId = userId;
    } else if (userType === 'driver') {
      query.driverId = userId;
    }
    // المشرفين والإدمن يشوفوا كل الطلبات

    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('customerId', 'name phone profile')
      .populate('driverId', 'name phone profile')
      .populate('approvedBy', 'name')
      .populate('confirmedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

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
    console.error('❌ خطأ في جلب طلبات الوقود:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 👁️ جلب طلب وقود محدد
exports.getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userType = req.user.userType;

    const order = await Order.findOne({ 
      _id: orderId, 
      serviceType: 'fuel' 
    })
    .populate('customerId', 'name phone profile')
    .populate('driverId', 'name phone profile')
    .populate('approvedBy', 'name')
    .populate('confirmedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    // التحقق من الصلاحية (العميل يشوف طلباته فقط)
    if (userType === 'customer' && 
        order.customerId._id.toString() !== userId) {
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
    console.error('❌ خطأ في جلب طلب الوقود:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ تحديث حالة طلب الوقود (للمشرفين) مع الإشعارات
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
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

    const order = await Order.findOneAndUpdate(
      { _id: orderId, serviceType: 'fuel' }, 
      updateData, 
      { new: true }
    )
    .populate('customerId', 'name phone')
    .populate('approvedBy', 'name');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    // 🔔 إرسال إشعار تلقائي حسب الحالة
    let notificationType;
    switch (status) {
      case 'approved':
        notificationType = 'order_confirmed';
        break;
      case 'processing':
        notificationType = 'order_processing';
        break;
      case 'ready_for_delivery':
        notificationType = 'order_ready_for_delivery';
        break;
      case 'cancelled':
        notificationType = 'order_cancelled';
        break;
      default:
        notificationType = 'order_status_updated';
    }

    await NotificationService.sendOrderNotification(
      order._id,
      notificationType,
      {
        status: status,
        notes: notes || '',
        ...(notificationType === 'order_cancelled' && { reason: notes })
      }
    );

    console.log('✅ تم تحديث حالة طلب الوقود:', {
      orderId: order._id,
      status: order.status
    });

    res.json({
      success: true,
      message: `تم تحديث حالة الطلب إلى ${getStatusText(status)}`,
      order
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث حالة طلب الوقود:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 💰 تحديد سعر طلب الوقود مع الإشعارات التلقائية
exports.setOrderPrice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { finalPrice, adminNotes } = req.body;
    const userId = req.user.userId;

    console.log('💰 تحديث سعر الطلب:', { orderId, finalPrice });

    // البحث عن الطلب
    const order = await Order.findOne({ 
      _id: orderId, 
      serviceType: 'fuel' 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    // 🔥 تحديث السعر والحالة معاً
    const updateData = {
      'pricing.finalPrice': finalPrice,
      'pricing.priceVisible': true,
      'pricing.priceSetAt': new Date(),
      status: 'waiting_payment' // ✅ تغيير الحالة إلى في انتظار الدفع
    };

    // إضافة ملاحظات المشرف إذا وجدت
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    // تحديث الطلب
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, serviceType: 'fuel' },
      { $set: updateData },
      { 
        new: true, 
        runValidators: true 
      }
    )
    .populate('customerId', 'name phone email')
    .populate('driverId', 'name phone');

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'فشل في تحديث سعر الطلب'
      });
    }

    console.log('✅ تم تحديث سعر الطلب والحالة:', {
      orderId: updatedOrder._id,
      finalPrice: updatedOrder.pricing.finalPrice,
      status: updatedOrder.status
    });

    // 🔔 إرسال إشعار تلقائي للعميل
    await NotificationService.sendOrderNotification(
      updatedOrder._id,
      'order_price_set',
      {
        amount: finalPrice,
        notes: adminNotes || ''
      }
    );

    // 🔔 إرسال إشعار في انتظار الدفع
    await NotificationService.sendOrderNotification(
      updatedOrder._id,
      'order_waiting_payment',
      {
        amount: finalPrice
      }
    );

    res.json({
      success: true,
      message: 'تم تحديد السعر بنجاح والطلب الآن في انتظار الدفع',
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ خطأ في setOrderPrice:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔥 دالة بديلة لتحديث السعر فقط بدون تغيير الحالة
exports.updateOrderPriceOnly = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { finalPrice, priceVisible = true } = req.body;

    console.log('💰 تحديث السعر فقط:', { orderId, finalPrice });

    const order = await Order.findOneAndUpdate(
      { _id: orderId, serviceType: 'fuel' },
      { 
        $set: {
          'pricing.finalPrice': finalPrice,
          'pricing.priceVisible': priceVisible
        }
      },
      { new: true, runValidators: true }
    )
    .populate('customerId', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // 🔔 إرسال إشعار تلقائي
    await NotificationService.sendOrderNotification(
      order._id,
      'order_price_set',
      {
        amount: finalPrice
      }
    );

    res.json({
      success: true,
      message: 'تم تحديث السعر بنجاح',
      order
    });

  } catch (error) {
    console.error('❌ خطأ في updateOrderPriceOnly:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎛️ موافقة نهائية على الطلب مع السعر والإشعارات
exports.finalApproveOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { finalPrice, adminNotes } = req.body;
    const userId = req.user.userId;

    console.log('🎛️ موافقة نهائية على الطلب:', { orderId, finalPrice });

    const order = await Order.findOne({ 
      _id: orderId, 
      serviceType: 'fuel' 
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'الطلب غير موجود'
      });
    }

    // 🔥 تحديث شامل للطلب
    const updateData = {
      'pricing.finalPrice': finalPrice,
      'pricing.priceVisible': true,
      'pricing.priceSetAt': new Date(),
      status: 'waiting_payment', // ✅ الحالة الجديدة
      approvedBy: userId,
      approvedAt: new Date(),
      adminNotes: adminNotes || ''
    };

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, serviceType: 'fuel' },
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .populate('customerId', 'name phone email')
    .populate('approvedBy', 'name');

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        error: 'فشل في الموافقة على الطلب'
      });
    }

    // 🔔 إرسال إشعارات تلقائية متعددة
    await Promise.all([
      // إشعار الموافقة
      NotificationService.sendOrderNotification(
        updatedOrder._id,
        'order_confirmed',
        { adminNotes: adminNotes || '' }
      ),
      
      // إشعار تحديد السعر
      NotificationService.sendOrderNotification(
        updatedOrder._id,
        'order_price_set',
        { amount: finalPrice }
      ),
      
      // إشعار في انتظار الدفع
      NotificationService.sendOrderNotification(
        updatedOrder._id,
        'order_waiting_payment',
        { amount: finalPrice }
      )
    ]);

    console.log('✅ تمت الموافقة على الطلب مع السعر:', {
      orderId: updatedOrder._id,
      finalPrice: updatedOrder.pricing.finalPrice,
      status: updatedOrder.status
    });

    res.json({
      success: true,
      message: 'تمت الموافقة على الطلب وتحديد السعر بنجاح',
      order: updatedOrder
    });

  } catch (error) {
    console.error('❌ خطأ في finalApproveOrder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.assignOrderDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId, allowReplace = false } = req.body;

    // ✅ صلاحيات
    if (!['admin', 'approval_supervisor'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتخصيص السائقين'
      });
    }

    // ✅ تحقق من السائق
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

    // 🔍 1) البحث عن طلب نشط للسائق
    const activeOrder = await Order.findOne({
      driverId,
      serviceType: 'fuel',
      status: {
        $in: [
          'assigned_to_driver',
          'picked_up',
          'in_transit',
          'on_the_way',
          'fueling'
        ]
      }
    });

    // 🛑 2) لو فيه طلب نشط ومش مسموح استبدال
    if (activeOrder && !allowReplace) {
      return res.status(400).json({
        success: false,
        code: 'DRIVER_HAS_ACTIVE_ORDER',
        message: 'السائق لديه طلب نشط بالفعل'
      });
    }

    // 🔁 3) لو فيه طلب نشط ومسموح الاستبدال
    if (activeOrder && allowReplace) {
      activeOrder.driverId = null;
      activeOrder.status = 'approved'; // أو pending حسب نظامك
      activeOrder.unassignedAt = new Date();
      await activeOrder.save();
    }

    // ✅ 4) تعيين الطلب الجديد
    const order = await Order.findOneAndUpdate(
      { _id: orderId, serviceType: 'fuel' },
      {
        driverId,
        status: 'assigned_to_driver',
        assignedToDriverAt: new Date()
      },
      { new: true }
    )
    .populate('customerId', 'name phone')
    .populate('driverId', 'name phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    // 🔔 إشعار تلقائي
    await NotificationService.sendOrderNotification(
      order._id,
      'order_assigned_to_driver',
      {
        driverName: driver.name,
        driverPhone: driver.phone
      }
    );

    console.log('✅ تم تخصيص سائق:', {
      orderId: order._id,
      driverId: driver._id,
      replaced: !!activeOrder
    });

    return res.json({
      success: true,
      message: activeOrder
        ? 'تم استبدال الطلب القديم وتعيين السائق للطلب الجديد'
        : 'تم تخصيص السائق للطلب بنجاح',
      order
    });

  } catch (error) {
    console.error('❌ خطأ في تخصيص السائق:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// 📍 تحديث تتبع طلب الوقود (للسائق) مع الإشعارات
exports.updateOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, note } = req.body;
    const userId = req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      serviceType: 'fuel',
      driverId: userId 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود أو غير مخصص لك'
      });
    }

    // إضافة نقطة تتبع جديدة
    const trackingPoint = {
      status,
      location: {
        lat: location?.lat || 0,
        lng: location?.lng || 0
      },
      note: note || '',
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

    // 🔔 إرسال إشعار تلقائي حسب الحالة
    let notificationType;
    switch (status) {
      case 'picked_up':
        notificationType = 'order_picked_up';
        break;
      case 'in_transit':
        notificationType = 'order_in_transit';
        break;
      case 'delivered':
        notificationType = 'order_delivered';
        break;
      case 'completed':
        notificationType = 'order_completed';
        break;
      default:
        notificationType = 'order_status_updated';
    }

    await NotificationService.sendOrderNotification(
      order._id,
      notificationType,
      {
        note: note || '',
        location: location || {}
      }
    );

    console.log('✅ تم تحديث تتبع طلب الوقود:', {
      orderId: order._id,
      status: order.status
    });

    res.json({
      success: true,
      message: 'تم تحديث التتبع بنجاح',
      tracking: order.tracking
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث تتبع طلب الوقود:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ❌ إلغاء طلب الوقود مع الإشعارات
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const { reason } = req.body;

    const order = await Order.findOne({ 
      _id: orderId, 
      serviceType: 'fuel',
      customerId: userId 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    if (!['pending', 'approved'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكن إلغاء الطلب في حالته الحالية'
      });
    }

    order.status = 'cancelled';
    order.cancellationReason = reason || '';
    await order.save();

    // 🔔 إرسال إشعار إلغاء الطلب
    await NotificationService.sendOrderNotification(
      order._id,
      'order_cancelled',
      {
        reason: reason || 'تم الإلغاء من قبل العميل'
      }
    );

    res.json({
      success: true,
      message: 'تم إلغاء طلب الوقود بنجاح',
      order
    });

  } catch (error) {
    console.error('❌ خطأ في إلغاء طلب الوقود:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 💳 التحقق من الدفع مع الإشعارات
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, proof } = req.body;
    const userId = req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      serviceType: 'fuel' 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    // تحديث حالة الدفع
    order.payment.status = 'verified';
    order.payment.proof = {
      image: proof?.image || '',
      bankName: proof?.bankName || '',
      accountNumber: proof?.accountNumber || '',
      amount: amount || order.pricing.finalPrice,
      verifiedAt: new Date(),
      verifiedBy: userId
    };

    // تغيير حالة الطلب
    order.status = 'processing';
    await order.save();

    // 🔔 إرسال إشعارات تلقائية
    await Promise.all([
      // إشعار التحقق من الدفع
      NotificationService.sendOrderNotification(
        order._id,
        'order_payment_verified',
        {
          amount: amount || order.pricing.finalPrice
        }
      ),
      
      // إشعار جاري المعالجة
      NotificationService.sendOrderNotification(
        order._id,
        'order_processing',
        {}
      ),
      
      // إشعار للسائقين أن الطلب جاهز للتسليم
      NotificationService.sendOrderNotification(
        order._id,
        'order_ready_for_delivery',
        {}
      )
    ]);

    res.json({
      success: true,
      message: 'تم التحقق من الدفع بنجاح',
      order
    });

  } catch (error) {
    console.error('❌ خطأ في التحقق من الدفع:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 دوال مساعدة
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
    'cancelled': 'ملغي',
    'on_the_way': 'في الطريق',
    'fueling': 'قيد التعبئة'
  };
  return statusMap[status] || status;
};

// دالة لإرسال إشعار تلقائي لتحديث حالة الطلب
const sendOrderStatusNotification = async (order, oldStatus, newStatus) => {
  try {
    // إرسال إشعار تحديث الحالة العام
    await NotificationService.sendOrderNotification(
      order._id,
      'order_status_updated',
      {
        oldStatus: oldStatus,
        newStatus: newStatus,
        statusText: getStatusText(newStatus)
      }
    );

    console.log(`📨 إشعار حالة الطلب: ${oldStatus} → ${newStatus}`);
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار تحديث الحالة:', error);
  }
};

// دالة لمتابعة تحديثات الطلب
exports.updateOrderWithNotifications = async (req, res) => {
  try {
    const { orderId } = req.params;
    const updates = req.body;
    const userId = req.user.userId;

    // جلب الطلب الحالي
    const oldOrder = await Order.findById(orderId);
    if (!oldOrder) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    // حفظ الحالة القديمة
    const oldStatus = oldOrder.status;

    // تحديث الطلب
    const order = await Order.findOneAndUpdate(
      { _id: orderId, serviceType: 'fuel' },
      { $set: updates },
      { new: true, runValidators: true }
    )
    .populate('customerId', 'name phone')
    .populate('driverId', 'name phone')
    .populate('approvedBy', 'name');

    // 🔔 إرسال إشعار إذا تغيرت الحالة
    if (updates.status && updates.status !== oldStatus) {
      await sendOrderStatusNotification(order, oldStatus, updates.status);
    }

    res.json({
      success: true,
      message: 'تم تحديث الطلب بنجاح',
      order
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// دالة الحصول على سجل الإشعارات للطلب
exports.getOrderNotifications = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ 
      _id: orderId, 
      serviceType: 'fuel' 
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'طلب الوقود غير موجود'
      });
    }

    // التحقق من صلاحية الوصول
    const canAccess = 
      order.customerId.toString() === userId ||
      (order.driverId && order.driverId.toString() === userId) ||
      ['admin', 'approval_supervisor', 'monitoring'].includes(req.user.userType);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول لإشعارات هذا الطلب'
      });
    }

    // الحصول على الإحصائيات
    const stats = await NotificationService.getNotificationStats(userId, req.user.userType);

    res.json({
      success: true,
      stats,
      orderId,
      orderNumber: order.orderNumber
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إشعارات الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};