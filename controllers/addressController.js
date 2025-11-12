// controllers/addressController.js
const Address = require('../models/Address');
const User = require('../models/User');

// 📍 إنشاء عنوان جديد
exports.createAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      country,
      postalCode,
      addressType,
      contactName,
      contactPhone,
      coordinates,
      deliveryInstructions,
      isDefault
    } = req.body;

    // إذا كان العنوان افتراضي، نلغي العناوين الافتراضية الأخرى
    if (isDefault) {
      await Address.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    const address = new Address({
      userId,
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      country: country || 'Saudi Arabia',
      postalCode,
      addressType: addressType || 'home',
      contactName,
      contactPhone,
      coordinates,
      deliveryInstructions,
      isDefault: isDefault || false
    });

    await address.save();

    res.status(201).json({
      success: true,
      message: 'تم إنشاء العنوان بنجاح',
      address
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 📋 جلب عناوين المستخدم
exports.getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { isDefault } = req.query;

    let query = { userId, isActive: true };

    if (isDefault !== undefined) {
      query.isDefault = isDefault === 'true';
    }

    const addresses = await Address.find(query)
      .sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      addresses
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 👁️ جلب عنوان محدد
exports.getAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.userId;

    const address = await Address.findOne({
      _id: addressId,
      userId,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        error: 'العنوان غير موجود'
      });
    }

    res.json({
      success: true,
      address
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✏️ تحديث العنوان
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    // إذا كان سيكون افتراضي، نلغي العناوين الافتراضية الأخرى
    if (updateData.isDefault) {
      await Address.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        error: 'العنوان غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تحديث العنوان بنجاح',
      address
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🗑️ حذف العنوان
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.userId;

    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId },
      { isActive: false },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        error: 'العنوان غير موجود'
      });
    }

    // إذا كان العنوان المحذوف هو الافتراضي، نجعل أول عنوان نشط افتراضي
    if (address.isDefault) {
      const firstActiveAddress = await Address.findOne({
        userId,
        isActive: true,
        _id: { $ne: addressId }
      });

      if (firstActiveAddress) {
        firstActiveAddress.isDefault = true;
        await firstActiveAddress.save();
      }
    }

    res.json({
      success: true,
      message: 'تم حذف العنوان بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ⭐ تعيين عنوان افتراضي
exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.userId;

    // نلغي كل العناوين الافتراضية أولاً
    await Address.updateMany(
      { userId, isDefault: true },
      { isDefault: false }
    );

    // نعين العنوان المطلوب كافتراضي
    const address = await Address.findOneAndUpdate(
      { _id: addressId, userId, isActive: true },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        error: 'العنوان غير موجود'
      });
    }

    res.json({
      success: true,
      message: 'تم تعيين العنوان كافتراضي بنجاح',
      address
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};