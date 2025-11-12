// controllers/companyController.js
const Company = require('../models/Company');
const User = require('../models/User');
const Notification = require('../models/Notification');



const companyController = {};

// 🏢 إنشاء شركة جديدة
companyController.createCompany = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const {
      name,
      commercialName,
      contactInfo,
      location,
      companyType,
      businessHours,
      services,
      fleetInfo,
      documents,
      images,
      description,
      serviceSettings
    } = req.body;

    // التحقق من أن المستخدم ليس لدى شركة بالفعل
    const existingCompany = await Company.findOne({ owner: ownerId });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        error: 'لديك شركة مسجلة بالفعل'
      });
    }

    const company = new Company({
      name,
      commercialName,
      contactInfo,
      location,
      companyType,
      businessHours: businessHours || getDefaultBusinessHours(),
      services: services || [],
      fleetInfo: fleetInfo || {},
      documents,
      images,
      description,
      serviceSettings: serviceSettings || {
        acceptsOnlineOrders: true,
        hasDelivery: true,
        hasPickup: false,
        minimumOrder: 0,
        deliveryFee: 0
      },
      owner: ownerId,
      verification: 'Pending'
    });

    await company.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الشركة بنجاح وجاري المراجعة',
      company
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 جلب الشركات (مع الفلترة)
companyController.getCompanies = async (req, res) => {
  try {
    const {
      companyType,
      verification,
      featured,
      isActive,
      page = 1,
      limit = 10,
      search,
      nearLocation // { lat, lng, radius }
    } = req.query;

    let query = { isActive: true };

    // الفلترة
    if (companyType) query.companyType = companyType;
    if (verification) query.verification = verification;
    if (featured !== undefined) query.featured = featured === 'true';
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // البحث
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { commercialName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'contactInfo.city': { $regex: search, $options: 'i' } }
      ];
    }

    // البحث الجغرافي
    if (nearLocation) {
      const { lat, lng, radius = 10 } = JSON.parse(nearLocation);
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // تحويل لـ meters
        }
      };
    }

    const companies = await Company.find(query)
      .populate('owner', 'name email phone')
      .select('-documents') // لا نرجع المستندات في القائمة
      .sort({ featured: -1, rating: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      companies,
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

// 👁️ جلب شركة محددة
companyController.getCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await Company.findById(companyId)
      .populate('owner', 'name email phone profile')
      .populate('verifiedBy', 'name');

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'الشركة غير موجودة'
      });
    }

    res.json({
      success: true,
      company
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// 🏪 جلب منتجات الشركة
companyController.getCompanyProducts = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { 
      productType, 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;

    let query = { company: companyId };

    if (productType) query.productType = productType;
    if (status) query.status = status;

    const products = await Product.find(query)
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
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

// 👤 جلب شركات المستخدم
companyController.getUserCompanies = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const companies = await Company.find({ owner: ownerId })
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      companies
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✏️ تحديث بيانات الشركة
companyController.updateCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const ownerId = req.user.userId;
    const updateData = req.body;

    // البحث عن الشركة والتحقق من الملكية
    const company = await Company.findOne({ _id: companyId, owner: ownerId });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'الشركة غير موجودة أو لا تملك صلاحية التعديل'
      });
    }

    // لا يمكن تعديل بعض الحقول بعد الإنشاء
    delete updateData.owner;
    delete updateData.code;
    delete updateData.verification;
    delete updateData.verifiedBy;
    delete updateData.verifiedAt;

    // إذا تم تحديث المستندات، نغير حالة التحقق لـ Pending
    if (updateData.documents) {
      updateData.verification = 'Pending';
      updateData.verificationMessage = 'تم تحديث المستندات وجاري المراجعة';
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true, runValidators: true }
    ).populate('owner', 'name email phone');

    res.json({
      success: true,
      message: 'تم تحديث بيانات الشركة بنجاح',
      company: updatedCompany
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ التحقق من الشركة (للإدمن)
companyController.verifyCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { verification, verificationMessage } = req.body;
    const adminId = req.user.userId;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالتحقق من الشركات'
      });
    }

    const company = await Company.findById(companyId).populate('owner');

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'الشركة غير موجودة'
      });
    }

    company.verification = verification;
    company.verificationMessage = verificationMessage || company.verificationMessage;
    company.verifiedBy = adminId;
    company.verifiedAt = new Date();

    if (verification === 'Verified') {
      company.isActive = true;
    } else if (verification === 'Rejected') {
      company.isActive = false;
    }

    await company.save();

    // إرسال إشعار لمالك الشركة
    await sendCompanyVerificationNotification(company, verification, verificationMessage);

    res.json({
      success: true,
      message: `تم ${verification === 'Verified' ? 'التحقق من' : 'رفض'} الشركة بنجاح`,
      company
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ⭐ إضافة خدمة للشركة
companyController.addService = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { service } = req.body;
    const ownerId = req.user.userId;

    const company = await Company.findOne({ _id: companyId, owner: ownerId });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'الشركة غير موجودة أو لا تملك صلاحية التعديل'
      });
    }

    company.services.push(service);
    await company.save();

    res.json({
      success: true,
      message: 'تم إضافة الخدمة بنجاح',
      services: company.services
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📊 إحصائيات الشركات
companyController.getCompanyStats = async (req, res) => {
  try {
    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للإحصائيات'
      });
    }

    const totalCompanies = await Company.countDocuments();
    const verifiedCompanies = await Company.countDocuments({ verification: 'Verified' });
    const pendingCompanies = await Company.countDocuments({ verification: 'Pending' });
    const featuredCompanies = await Company.countDocuments({ featured: true });

    const companiesByType = await Company.aggregate([
      {
        $group: {
          _id: '$companyType',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentCompanies = await Company.find()
      .select('name commercialName companyType verification createdAt')
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalCompanies,
        verifiedCompanies,
        pendingCompanies,
        featuredCompanies,
        companiesByType,
        recentCompanies
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🎯 دوال مساعدة
const getDefaultBusinessHours = () => {
  return {
    sunday: { open: "08:00", close: "22:00", isOpen: true },
    monday: { open: "08:00", close: "22:00", isOpen: true },
    tuesday: { open: "08:00", close: "22:00", isOpen: true },
    wednesday: { open: "08:00", close: "22:00", isOpen: true },
    thursday: { open: "08:00", close: "22:00", isOpen: true },
    friday: { open: "08:00", close: "22:00", isOpen: true },
    saturday: { open: "08:00", close: "22:00", isOpen: true }
  };
};

const sendCompanyVerificationNotification = async (company, verification, message) => {
  try {
    let title, body;

    if (verification === 'Verified') {
      title = 'تم التحقق من شركتك';
      body = `تم التحقق من شركتك "${company.name}" ويمكنك الآن استقبال الطلبات`;
    } else {
      title = 'ملاحظات على شركتك';
      body = `يوجد ملاحظات على شركتك: ${message}`;
    }

    const notification = new Notification({
      title,
      body,
      user: company.owner._id,
      type: 'profile_approved',
      data: {
        companyId: company._id,
        verification,
        message
      },
      routing: {
        screen: 'CompanyDetails',
        params: { companyId: company._id }
      }
    });

    await notification.save();
  } catch (error) {
    console.error('خطأ في إرسال إشعار التحقق:', error);
  }
};

module.exports = companyController;