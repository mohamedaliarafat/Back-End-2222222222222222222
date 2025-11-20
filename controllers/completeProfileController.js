const mongoose = require('mongoose');
const CompleteProfile = require('../models/CompleteProfile');
const User = require('../models/User');
const bucket = require('../config/firebase'); // bucket من config/firebase.js
const path = require('path');
const fs = require('fs');

// ==========================================================
// دالة رفع ملف على Firebase
// ==========================================================
async function uploadFileToFirebase(localFilePath, destinationPath) {
  try {
    const file = await bucket.upload(localFilePath, {
      destination: destinationPath,
    });
    const uploadedFile = file[0];

    const [url] = await uploadedFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2030',
    });

    return url;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

// ==========================================================
// إنشاء أو تحديث الملف الشخصي
// ==========================================================
exports.createOrUpdateProfile = async (req, res) => {
  try {
    console.log('🟢 START: createOrUpdateProfile');
    console.log('🔐 User from JWT:', req.user);
    
    // ✅ دعم كلا الحالتين: userId و id
    const userId = req.user.id || req.user.userId;
    
    if (!userId) {
      console.log('❌ No user ID found in JWT');
      return res.status(400).json({ success: false, message: 'معرف المستخدم غير صالح' });
    }

    console.log('👤 User ID to use:', userId);

    // البحث عن المستخدم في MongoDB باستخدام _id
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'المستخدم غير موجود في قاعدة البيانات' });
    }

    const { companyName, email, contactPerson, contactPhone, contactPosition, documents } = req.body;

    // رفع الملفات إلى Firebase
    const cleanedDocuments = {};
    if (documents && typeof documents === 'object') {
      for (const key of Object.keys(documents)) {
        const doc = documents[key];
        let filePath = '';
        if (typeof doc === 'string') {
          filePath = doc; // URL موجود مسبقاً
        } else if (doc && doc.file) {
          filePath = doc.file;
        }

        if (filePath) {
          if (fs.existsSync(filePath)) {
            const fileName = path.basename(filePath);
            const firebasePath = `profiles/${userId}/${Date.now()}-${fileName}`;
            const url = await uploadFileToFirebase(filePath, firebasePath);
            cleanedDocuments[key] = { file: url, verified: false };
          } else {
            cleanedDocuments[key] = { file: filePath, verified: false };
          }
        }
      }
    }

    const profileData = {
      companyName: companyName || '',
      email: email || '',
      contactPerson: contactPerson || '',
      contactPhone: contactPhone || '',
      contactPosition: contactPosition || '',
      documents: cleanedDocuments,
      profileStatus: 'submitted'
    };

    // تحديث أو إنشاء الملف الشخصي
    let profile = await CompleteProfile.findOne({ user: userId });
    if (profile) {
      profile = await CompleteProfile.findOneAndUpdate(
        { user: userId },
        { $set: profileData },
        { new: true, runValidators: true }
      );
    } else {
      profile = new CompleteProfile({ user: userId, ...profileData });
      await profile.save();
    }

    res.status(200).json({
      success: true,
      message: 'تم إرسال الملف الشخصي للمراجعة بنجاح',
      data: profile
    });

  } catch (error) {
    console.error('❌ createOrUpdateProfile error:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حفظ الملف الشخصي',
      error: error.message
    });
  }
};


// ==========================================================
// رفع ملف واحد (مرن)
// ==========================================================
exports.uploadDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    let uploadedFile = req.file || (req.files && Object.values(req.files)[0][0]);

    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: 'لم يتم رفع أي ملف' });
    }

    // رفع الملف على Firebase
    const fileName = path.basename(uploadedFile.path);
    const firebasePath = `profiles/${userId}/${Date.now()}-${fileName}`;
    const url = await uploadFileToFirebase(uploadedFile.path, firebasePath);

    // حذف الملف المحلي بعد الرفع
    fs.unlinkSync(uploadedFile.path);

    res.status(200).json({
      success: true,
      message: 'تم رفع الملف بنجاح',
      data: { file: url }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'فشل في رفع الملف', error: error.message });
  }
};

// ==========================================================
// رفع عدة ملفات
// ==========================================================
exports.uploadDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ success: false, message: 'لم يتم رفع أي ملفات' });

    const uploadedUrls = [];

    for (const file of files) {
      const fileName = path.basename(file.path);
      const firebasePath = `profiles/${userId}/${Date.now()}-${fileName}`;
      const url = await uploadFileToFirebase(file.path, firebasePath);
      fs.unlinkSync(file.path);
      uploadedUrls.push({ originalName: file.originalname, url });
    }

    res.status(200).json({ success: true, message: 'تم رفع الملفات بنجاح', data: uploadedUrls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'فشل في رفع الملفات', error: error.message });
  }
};

// ==========================================================
// رفع ملف وتحديث الملف الشخصي تلقائياً
// ==========================================================
exports.uploadAndUpdateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const documentType = req.body.documentType;
    let uploadedFile = req.file || (req.files && Object.values(req.files)[0][0]);

    if (!uploadedFile) return res.status(400).json({ success: false, message: 'لم يتم رفع أي ملف' });

    // رفع الملف على Firebase
    const fileName = path.basename(uploadedFile.path);
    const firebasePath = `profiles/${userId}/${Date.now()}-${fileName}`;
    const url = await uploadFileToFirebase(uploadedFile.path, firebasePath);
    fs.unlinkSync(uploadedFile.path);

    // تحديث الملف الشخصي في Mongo
    const updateData = {};
    if (documentType) {
      updateData[`documents.${documentType}.file`] = url;
      updateData[`documents.${documentType}.verified`] = false;
    }

    const updatedProfile = await CompleteProfile.findOneAndUpdate(
      { user: userId },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'تم رفع الملف وتحديث الملف الشخصي بنجاح',
      data: updatedProfile
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'فشل في رفع الملف', error: error.message });
  }
};

// ==========================================================
// ✅ الحصول على الملف الشخصي للمستخدم
// ==========================================================
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const completeProfile = await CompleteProfile.findOne({ user: userId })
      .populate('user', 'name email phone')
      .populate('reviewedBy', 'name');

    if (!completeProfile) {
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الملف الشخصي'
      });
    }

    res.status(200).json({
      success: true,
      data: completeProfile
    });

  } catch (error) {
    console.error('ERROR in getUserProfile:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الملف الشخصي',
      error: error.message
    });
  }
};


// ==========================================================
// ✅ للمسؤول: الحصول على جميع الملفات الشخصية
// ==========================================================
exports.getAllProfiles = async (req, res) => {
  try {
    console.log('🟢 START: getAllProfiles');
    const { status, page = 1, limit = 10 } = req.query;
    console.log('📋 Query params:', { status, page, limit });

    let query = {};
    if (status) query.profileStatus = status;

    const profiles = await CompleteProfile.find(query)
      .populate('user', 'name email phone')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CompleteProfile.countDocuments(query);

    console.log(`✅ Found ${profiles.length} profiles out of ${total}`);

    res.status(200).json({
      success: true,
      data: profiles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });

  } catch (error) {
    console.error('❌ ERROR in getAllProfiles:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الملفات الشخصية',
      error: error.message
    });
  }
};

// ==========================================================
// ✅ للمسؤول: مراجعة الملف الشخصي
// ==========================================================
exports.reviewProfile = async (req, res) => {
  try {
    console.log('🟢 START: reviewProfile');
    const { profileId } = req.params;
    const { status, rejectionReason, adminNotes } = req.body;
    const adminId = req.user.id;

    console.log('📋 Review data:', { profileId, status, rejectionReason, adminNotes });

    if (req.user.role !== 'admin') {
      console.log('❌ Unauthorized - User is not admin');
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتنفيذ هذا الإجراء'
      });
    }

    const validStatuses = ['approved', 'rejected', 'needs_correction'];
    if (!validStatuses.includes(status)) {
      console.log('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: 'حالة غير صالحة'
      });
    }

    const updateData = {
      profileStatus: status,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      adminNotes: adminNotes || ''
    };

    if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    console.log('🔧 Update data:', updateData);

    const updatedProfile = await CompleteProfile.findByIdAndUpdate(
      profileId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email phone')
      .populate('reviewedBy', 'name');

    if (!updatedProfile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الملف الشخصي'
      });
    }

    console.log('✅ Profile reviewed successfully:', profileId);

    res.status(200).json({
      success: true,
      message:
        status === 'approved'
          ? 'تمت الموافقة على الملف الشخصي'
          : status === 'rejected'
          ? 'تم رفض الملف الشخصي'
          : 'تم طلب تصحيح الملف الشخصي',
      data: updatedProfile
    });

  } catch (error) {
    console.error('❌ ERROR in reviewProfile:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في مراجعة الملف الشخصي',
      error: error.message
    });
  }
};

// ==========================================================
// ✅ تحديث حالة المستند
// ==========================================================
exports.updateDocumentStatus = async (req, res) => {
  try {
    console.log('🟢 START: updateDocumentStatus');
    const { profileId } = req.params;
    const { documentType, verified } = req.body;

    console.log('📋 Update data:', { profileId, documentType, verified });

    if (req.user.role !== 'admin') {
      console.log('❌ Unauthorized - User is not admin');
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتنفيذ هذا الإجراء'
      });
    }

    const validDocuments = [
      'commercialLicense',
      'energyLicense',
      'commercialRecord',
      'taxNumber',
      'nationalAddressDocument',
      'civilDefenseLicense'
    ];

    if (!validDocuments.includes(documentType)) {
      console.log('❌ Invalid document type:', documentType);
      return res.status(400).json({
        success: false,
        message: 'نوع المستند غير صالح'
      });
    }

    const updateField = `documents.${documentType}.verified`;

    console.log('🔧 Update field:', updateField);

    const updatedProfile = await CompleteProfile.findByIdAndUpdate(
      profileId,
      { [updateField]: verified },
      { new: true }
    );

    if (!updatedProfile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الملف الشخصي'
      });
    }

    console.log('✅ Document status updated successfully');

    res.status(200).json({
      success: true,
      message: `تم ${verified ? 'توثيق' : 'إلغاء توثيق'} المستند`,
      data: updatedProfile
    });

  } catch (error) {
    console.error('❌ ERROR in updateDocumentStatus:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في تحديث حالة المستند',
      error: error.message
    });
  }
};

// ==========================================================
// ✅ حذف الملف الشخصي
// ==========================================================
exports.deleteProfile = async (req, res) => {
  try {
    console.log('🟢 START: deleteProfile');
    const { profileId } = req.params;

    if (req.user.role !== 'admin') {
      console.log('❌ Unauthorized - User is not admin');
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتنفيذ هذا الإجراء'
      });
    }

    const deletedProfile = await CompleteProfile.findByIdAndDelete(profileId);

    if (!deletedProfile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الملف الشخصي'
      });
    }

    console.log('✅ Profile deleted successfully:', profileId);

    res.status(200).json({
      success: true,
      message: 'تم حذف الملف الشخصي بنجاح'
    });

  } catch (error) {
    console.error('❌ ERROR in deleteProfile:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في حذف الملف الشخصي',
      error: error.message
    });
  }
};

// ==========================================================
// ✅ إحصائيات الملفات الشخصية
// ==========================================================
exports.getProfileStats = async (req, res) => {
  try {
    console.log('🟢 START: getProfileStats');

    if (req.user.role !== 'admin') {
      console.log('❌ Unauthorized - User is not admin');
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتنفيذ هذا الإجراء'
      });
    }

    const stats = await CompleteProfile.aggregate([
      {
        $group: {
          _id: '$profileStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await CompleteProfile.countDocuments();

    const statusStats = {};
    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    console.log('📊 Profile stats:', { total, statusStats });

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: statusStats
      }
    });

  } catch (error) {
    console.error('❌ ERROR in getProfileStats:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      error: error.message
    });
  }
};