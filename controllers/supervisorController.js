// controllers/supervisorController.js
const Order = require('../models/Order');
const Petrol = require('../models/Petrol');
const User = require('../models/User');
const CompleteProfile = require('../models/CompleteProfile');

// 📋 لوحة تحكم المشرف
exports.getSupervisorDashboard = async (req, res) => {
  try {
    if (req.user.userType !== 'approval_supervisor') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للوحة المشرف'
      });
    }

    // الطلبات المعلقة
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const pendingFuelOrders = await Petrol.countDocuments({ status: 'pending' });
    
    // الملفات المعلقة
    const pendingProfiles = await CompleteProfile.countDocuments({ 
      profileStatus: 'submitted' 
    });

    // الطلبات الجديدة
    const newOrders = await Order.find({ status: 'pending' })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);

    const newFuelOrders = await Petrol.find({ status: 'pending' })
      .populate('user', 'name phone')
      .sort({ createdAt: -1 })
      .limit(10);

    // الملفات المعلقة
    const pendingUserProfiles = await CompleteProfile.find({ 
      profileStatus: 'submitted' 
    })
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      dashboard: {
        stats: {
          pendingOrders,
          pendingFuelOrders,
          pendingProfiles
        },
        pendingApprovals: {
          orders: newOrders,
          fuelOrders: newFuelOrders,
          profiles: pendingUserProfiles
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ الموافقة على طلب
exports.approveOrder = async (req, res) => {
  try {
    const supervisorId = req.user.userId;
    const { orderId, orderType, notes } = req.body;

    if (req.user.userType !== 'approval_supervisor') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالموافقة على الطلبات'
      });
    }

    let order;
    const updateData = {
      status: 'approved',
      approvedBy: supervisorId,
      approvedAt: new Date()
    };

    if (notes) {
      updateData.supervisorNotes = notes;
    }

    if (orderType === 'fuel') {
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

    res.json({
      success: true,
      message: 'تمت الموافقة على الطلب بنجاح',
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ❌ رفض طلب
exports.rejectOrder = async (req, res) => {
  try {
    const supervisorId = req.user.userId;
    const { orderId, orderType, reason } = req.body;

    if (req.user.userType !== 'approval_supervisor') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح برفض الطلبات'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'سبب الرفض مطلوب'
      });
    }

    let order;
    const updateData = {
      status: 'cancelled',
      approvedBy: supervisorId,
      approvedAt: new Date(),
      supervisorNotes: reason
    };

    if (orderType === 'fuel') {
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

    res.json({
      success: true,
      message: 'تم رفض الطلب بنجاح',
      order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 👤 مراجعة الملفات الشخصية
exports.reviewProfile = async (req, res) => {
  try {
    const supervisorId = req.user.userId;
    const { profileId, status, notes } = req.body;

    if (req.user.userType !== 'approval_supervisor') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بمراجعة الملفات'
      });
    }

    const profile = await CompleteProfile.findById(profileId)
      .populate('user', 'name email phone userType');

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'الملف غير موجود'
      });
    }

    profile.profileStatus = status;
    profile.reviewedBy = supervisorId;
    profile.reviewedAt = new Date();
    
    if (notes) {
      profile.adminNotes = notes;
    }

    if (status === 'rejected' && !notes) {
      return res.status(400).json({
        success: false,
        error: 'ملاحظات الرفض مطلوبة'
      });
    }

    if (status === 'rejected') {
      profile.rejectionReason = notes;
    }

    await profile.save();

    // إذا كانت الموافقة، نفعّل المستخدم
    if (status === 'approved') {
      await User.findByIdAndUpdate(profile.user._id, { isActive: true });
    }

    res.json({
      success: true,
      message: status === 'approved' ? 'تمت الموافقة على الملف' : 'تم رفض الملف',
      profile
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};