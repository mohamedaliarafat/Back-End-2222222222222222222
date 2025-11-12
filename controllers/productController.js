// controllers/productController.js
const Product = require('../models/Product');
const User = require('../models/User');
const Company = require('../models/Company');
const Notification = require('../models/Notification');

// 🆕 إنشاء منتج جديد
exports.createProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      productType,
      liters,
      price,
      description,
      images,
      company,
      storageLocation
    } = req.body;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بإنشاء منتجات'
      });
    }

    const product = new Product({
      productType,
      liters,
      price: {
        current: price,
        previous: 0,
        currency: 'SAR'
      },
      description,
      images,
      company: company || null,
      storageLocation: storageLocation || {},
      addedBy: userId,
      stock: {
        quantity: 0,
        lowStockAlert: 10,
        isInStock: false
      },
      status: 'غير متاح'
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المنتج بنجاح',
      product
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 جلب المنتجات (مع الفلترة)
exports.getProducts = async (req, res) => {
  try {
    const {
      productType,
      liters,
      status,
      company,
      page = 1,
      limit = 10,
      search
    } = req.query;

    let query = {};

    // الفلترة
    if (productType) query.productType = productType;
    if (liters) query.liters = parseInt(liters);
    if (status) query.status = status;
    if (company) query.company = company;

    // البحث
    if (search) {
      query.$or = [
        { productType: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const products = await Product.find(query)
      .populate('addedBy', 'name')
      .populate('company', 'name commercialName')
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

// 👁️ جلب منتج محدد
exports.getProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId)
      .populate('addedBy', 'name email')
      .populate('company', 'name commercialName contactInfo');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    res.json({
      success: true,
      product
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✏️ تحديث المنتج
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بتحديث المنتجات'
      });
    }

    // إذا تم تحديث السعر، نحفظ السعر السابق
    if (updateData.price && updateData.price.current) {
      const product = await Product.findById(productId);
      if (product) {
        updateData.price.previous = product.price.current;
      }
    }

    const product = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    ).populate('addedBy', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث المنتج بنجاح',
      product
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📦 إدارة المخزون
exports.updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, action } = req.body;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بإدارة المخزون'
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    let newQuantity = product.stock.quantity;

    switch (action) {
      case 'add':
        newQuantity += quantity;
        break;
      case 'subtract':
        newQuantity = Math.max(0, newQuantity - quantity);
        break;
      case 'set':
        newQuantity = quantity;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'الإجراء غير معروف'
        });
    }

    product.stock.quantity = newQuantity;
    product.stock.isInStock = newQuantity > 0;
    product.status = newQuantity > 0 ? 'متاح' : 'نفذ من المخزون';

    await product.save();

    res.json({
      success: true,
      message: `تم ${action === 'add' ? 'إضافة' : action === 'subtract' ? 'خصم' : 'تحديد'} الكمية بنجاح`,
      stock: product.stock
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🗑️ حذف منتج
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // التحقق من الصلاحية (الإدمن فقط)
    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بحذف المنتجات'
      });
    }

    const product = await Product.findByIdAndDelete(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم حذف المنتج بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📊 إحصائيات المنتجات
exports.getProductStats = async (req, res) => {
  try {
    // التحقق من الصلاحية (الإدمن والمتابعة فقط)
    if (!['admin', 'monitoring'].includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: 'غير مسموح بالوصول للإحصائيات'
      });
    }

    const totalProducts = await Product.countDocuments();
    const availableProducts = await Product.countDocuments({ status: 'متاح' });
    const outOfStockProducts = await Product.countDocuments({ status: 'نفذ من المخزون' });

    const productsByType = await Product.aggregate([
      {
        $group: {
          _id: '$productType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$stats.totalRevenue' }
        }
      }
    ]);

    const topSellingProducts = await Product.find()
      .select('productType liters price stats')
      .sort({ 'stats.totalOrders': -1 })
      .limit(5);

    const lowStockProducts = await Product.find({
      'stock.quantity': { $lte: 10 },
      'stock.isInStock': true
    }).select('productType liters stock');

    res.json({
      success: true,
      stats: {
        totalProducts,
        availableProducts,
        outOfStockProducts,
        productsByType,
        topSellingProducts,
        lowStockProducts
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};