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
const Notification = require('../models/Notification');
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

// ========= Notification Helper =========
// دالة مساعدة للتحقق من القيم قبل إنشاء الإشعار
const validateNotificationData = (notificationData) => {
  const validTypes = [
    'system', 'auth', 'order_new', 'order_status', 'order_price',
    'order_assigned', 'order_delivered', 'payment_pending',
    'payment_verified', 'payment_failed', 'driver_assignment',
    'driver_location', 'chat_message', 'incoming_call',
    'profile_approved', 'profile_rejected', 'admin_alert',
    'supervisor_alert', 'fuel_order_new', 'fuel_order_status', 
    'fuel_delivery_started', 'fuel_delivery_completed'
  ];

  const validTargetGroups = [
    'all_customers', 'all_drivers', 'all_supervisors', 
    'all_admins', 'all_monitoring', 'specific_role'
  ];

  const validPriorities = ['low', 'normal', 'high', 'urgent'];

  // التحقق من type
  if (!validTypes.includes(notificationData.type)) {
    notificationData.type = 'system'; // قيمة افتراضية
  }

  // التحقق من targetGroup (فقط إذا كان broadcast = true)
  if (notificationData.broadcast && notificationData.targetGroup) {
    if (!validTargetGroups.includes(notificationData.targetGroup)) {
      notificationData.targetGroup = 'all_customers'; // قيمة افتراضية
    }
  } else {
    // إذا لم يكن broadcast، لا نستخدم targetGroup
    notificationData.targetGroup = undefined;
  }

  // التحقق من priority
  if (!validPriorities.includes(notificationData.priority)) {
    notificationData.priority = 'normal'; // قيمة افتراضية
  }

  return notificationData;
};

// ⛽ إنشاء طلب وقود
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

    // إنشاء طلب الوقود
    const order = new Order({
      customerId: userId,
      serviceType: 'fuel',
      description: `طلب وقود ${fuelType} - ${fuelLiters} لتر`,
      
      // معلومات التسليم
      deliveryLocation: {
        address: deliveryLocation?.address || '',
        coordinates: {
          lat: deliveryLocation?.coordinates?.lat || 0,
          lng: deliveryLocation?.coordinates?.lng || 0
        },
        contactName: deliveryLocation?.contactName || '',
        contactPhone: deliveryLocation?.contactPhone || '',
        instructions: deliveryLocation?.instructions || ''
      },

      // معلومات الوقود
      fuelDetails: {
        fuelType: fuelType || '',
        fuelLiters: fuelLiters || 0,
        fuelTypeName: getFuelTypeName(fuelType)
      },

      // معلومات المركبة
      vehicleInfo: vehicleInfo || {
        type: '',
        model: '',
        licensePlate: '',
        color: ''
      },

      // التسعير
      pricing: {
        estimatedPrice: 0,
        finalPrice: 0,
        priceVisible: false,
        fuelPricePerLiter: 0,
        serviceFee: 0
      },

      // الدفع
      payment: {
        status: 'hidden',
        proof: {
          image: '',
          bankName: '',
          accountNumber: '',
          amount: 0
        }
      },

      // الملاحظات
      customerNotes: customerNotes || notes || '',
      notes: notes || '',

      // الحالة
      status: 'pending',
      submittedAt: new Date()
    });

    // حساب السعر التقديري
    order.calculateEstimatedPrice();

    // حفظ في قاعدة البيانات
    await order.save();

    console.log('✅ تم حفظ طلب الوقود في قاعدة البيانات:', {
      id: order._id,
      orderNumber: order.orderNumber,
      estimatedPrice: order.pricing.estimatedPrice
    });

    // إرسال إشعار للمشرفين
    await sendNotificationToSupervisors(order);

    res.status(201).json({
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
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في إنشاء طلب الوقود'
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

// ✅ تحديث حالة طلب الوقود (للمشرفين)
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

    // إرسال إشعار للعميل
    await sendStatusNotification(order, status);

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

// 💰 تحديد سعر طلب الوقود - الإصدار المحسّن
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

    // 🔥 إرسال إشعار للعميل بتحديث السعر والحالة
    await sendPriceAndStatusNotification(updatedOrder, finalPrice);

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

// 🎛️ موافقة نهائية على الطلب مع السعر
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

    // 🔥 إرسال إشعار للعميل
    await sendPriceAndStatusNotification(updatedOrder, finalPrice);

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

// 🚗 تخصيص سائق لطلب الوقود
exports.assignOrderDriver = async (req, res) => {
  try {
    const { orderId } = req.params;
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

    const updateData = {
      driverId,
      status: 'assigned_to_driver',
      assignedToDriverAt: new Date()
    };

    const order = await Order.findOneAndUpdate(
      { _id: orderId, serviceType: 'fuel' }, 
      updateData, 
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

    // إرسال إشعار للسائق
    await sendDriverAssignmentNotification(order, driver);

    console.log('✅ تم تخصيص سائق لطلب الوقود:', {
      orderId: order._id,
      driverId: order.driverId._id
    });

    res.json({
      success: true,
      message: 'تم تخصيص السائق للطلب بنجاح',
      order
    });

  } catch (error) {
    console.error('❌ خطأ في تخصيص سائق لطلب الوقود:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📍 تحديث تتبع طلب الوقود (للسائق)
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

    // إرسال إشعار للعميل
    await sendTrackingNotification(order, status);

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

// ❌ إلغاء طلب الوقود
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

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
    await order.save();

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

// 🎯 دوال مساعدة للإشعارات (محدثة)
const sendNotificationToSupervisors = async (order) => {
  try {
    const supervisors = await User.find({ 
      userType: 'approval_supervisor',
      isActive: true 
    });

    // إرسال إشعار لكل مشرف
    for (const supervisor of supervisors) {
      const notificationData = validateNotificationData({
        title: 'طلب وقود جديد',
        body: `طلب وقود جديد #${order.orderNumber} يحتاج للمراجعة`,
        user: supervisor._id,
        broadcast: false,
        type: 'fuel_order_new',
        data: {
          orderId: order._id,
          orderType: 'fuel'
        },
        routing: {
          screen: 'OrderDetails',
          params: { 
            orderId: order._id.toString(),
            orderType: 'fuel'
          },
          action: 'review_order'
        },
        priority: 'high',
        sentViaFcm: true
      });

      const notification = new Notification(notificationData);
      await notification.save();
    }

    console.log('📨 تم إرسال إشعار للمشرفين عن طلب وقود جديد');
  } catch (error) {
    console.error('❌ خطأ في إرسال الإشعار للمشرفين:', error);
  }
};

// 🔔 إرسال إشعار بتحديث السعر والحالة - الإصدار المصحح
const sendPriceAndStatusNotification = async (order, price) => {
  try {
    const notificationData = validateNotificationData({
      title: 'تم تحديد سعر الطلب',
      body: `تم تحديد سعر طلبك #${order.orderNumber} - ${price} ريال - الطلب في انتظار الدفع`,
      user: order.customerId,
      broadcast: false,
      type: 'order_price',
      data: {
        orderId: order._id,
        orderType: 'fuel',
        price: price,
        status: 'waiting_payment'
      },
      routing: {
        screen: 'OrderDetails',
        params: { 
          orderId: order._id.toString(),
          orderType: 'fuel'
        },
        action: 'view_order'
      },
      priority: 'high',
      sentViaFcm: true
    });

    const notification = new Notification(notificationData);
    await notification.save();
    
    console.log('📨 تم إرسال إشعار السعر والحالة للعميل');
    
  } catch (error) {
    console.error('❌ خطأ في إرسال إشعار السعر والحالة:', error);
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
    'cancelled': 'ملغي',
    'on_the_way': 'في الطريق',
    'fueling': 'قيد التعبئة'
  };
  return statusMap[status] || status;
};

// دوال إرسال الإشعارات الأساسية المصححة
const sendStatusNotification = async (order, status) => {
  try {
    const notificationData = validateNotificationData({
      title: 'تحديث حالة الطلب',
      body: `تم تحديث حالة طلبك #${order.orderNumber} إلى ${getStatusText(status)}`,
      user: order.customerId,
      broadcast: false,
      type: 'order_status',
      data: {
        orderId: order._id,
        orderType: 'fuel',
        status: status
      },
      routing: {
        screen: 'OrderDetails',
        params: { 
          orderId: order._id.toString(),
          orderType: 'fuel'
        },
        action: 'view_order'
      },
      priority: 'normal',
      sentViaFcm: true
    });

    const notification = new Notification(notificationData);
    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار الحالة:', error);
  }
};

const sendPriceNotification = async (order, price) => {
  try {
    const notificationData = validateNotificationData({
      title: 'تم تحديد السعر',
      body: `تم تحديد سعر طلبك #${order.orderNumber} - ${price} ريال`,
      user: order.customerId,
      broadcast: false,
      type: 'order_price',
      data: {
        orderId: order._id,
        orderType: 'fuel',
        price: price
      },
      routing: {
        screen: 'OrderDetails',
        params: { 
          orderId: order._id.toString(),
          orderType: 'fuel'
        },
        action: 'view_order'
      },
      priority: 'high',
      sentViaFcm: true
    });

    const notification = new Notification(notificationData);
    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار السعر:', error);
  }
};

const sendDriverAssignmentNotification = async (order, driver) => {
  try {
    // إشعار للعميل
    const customerNotificationData = validateNotificationData({
      title: 'تم تخصيص سائق',
      body: `تم تخصيص السائق ${driver.name} لطلبك #${order.orderNumber}`,
      user: order.customerId,
      broadcast: false,
      type: 'order_assigned',
      data: {
        orderId: order._id,
        orderType: 'fuel',
        driverId: driver._id
      },
      routing: {
        screen: 'TrackOrder',
        params: { 
          orderId: order._id.toString(),
          orderType: 'fuel'
        },
        action: 'track_order'
      },
      priority: 'normal',
      sentViaFcm: true
    });

    const customerNotification = new Notification(customerNotificationData);
    await customerNotification.save();

    // إشعار للسائق
    const driverNotificationData = validateNotificationData({
      title: 'طلب جديد مخصص لك',
      body: `تم تخصيص طلب وقود #${order.orderNumber} لك`,
      user: driver._id,
      broadcast: false,
      type: 'driver_assignment',
      data: {
        orderId: order._id,
        orderType: 'fuel'
      },
      routing: {
        screen: 'OrderDetails',
        params: { 
          orderId: order._id.toString(),
          orderType: 'fuel'
        },
        action: 'view_order'
      },
      priority: 'normal',
      sentViaFcm: true
    });

    const driverNotification = new Notification(driverNotificationData);
    await driverNotification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار تخصيص السائق:', error);
  }
};

const sendTrackingNotification = async (order, status) => {
  try {
    const notificationData = validateNotificationData({
      title: 'تحديث التتبع',
      body: `تم تحديث حالة التوصيل لطلبك #${order.orderNumber} إلى ${getStatusText(status)}`,
      user: order.customerId,
      broadcast: false,
      type: 'order_status',
      data: {
        orderId: order._id,
        orderType: 'fuel',
        status: status
      },
      routing: {
        screen: 'TrackOrder',
        params: { 
          orderId: order._id.toString(),
          orderType: 'fuel'
        },
        action: 'track_order'
      },
      priority: 'normal',
      sentViaFcm: true
    });

    const notification = new Notification(notificationData);
    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار التتبع:', error);
  }
};

// تصدير الدوال المساعدة للاختبار إذا لزم الأمر
module.exports._testHelpers = {
  validateNotificationData,
  getStatusText,
  generateDeliveryCode
};