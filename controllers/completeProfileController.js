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

exports.createOrUpdateProfile = async (req, res) => {
  let notificationSent = false;
  
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

    // التحقق مما إذا كان هناك ملف شخصي سابق
    const existingProfile = await CompleteProfile.findOne({ user: userId });
    const isNewProfile = !existingProfile;
    const isResubmission = existingProfile && 
      ['rejected', 'needs_correction'].includes(existingProfile.profileStatus);

    // تحديث أو إنشاء الملف الشخصي
    let profile;
    if (existingProfile) {
      profile = await CompleteProfile.findOneAndUpdate(
        { user: userId },
        { $set: profileData },
        { new: true, runValidators: true }
      );
    } else {
      profile = new CompleteProfile({ user: userId, ...profileData });
      await profile.save();
    }

    console.log('✅ Profile saved successfully:', {
      profileId: profile._id,
      isNewProfile,
      isResubmission,
      status: profile.profileStatus
    });

    // ============================================
    // 📨 إرسال إشعار للمسؤولين باستخدام notificationService
    // ============================================
    try {
      const notificationService = require('../services/notificationService');
      
      // إرسال إشعار للمستخدم نفسه
      const userNotification = await notificationService.sendProfileNotification(
        userId,
        isNewProfile ? 'document_uploaded' : 'profile_updated',
        {
          profileId: profile._id,
          companyName: profile.companyName,
          isNewProfile,
          isResubmission,
          documentCount: Object.keys(cleanedDocuments).length
        }
      );
      
      console.log('📨 User notification sent:', userNotification ? 'success' : 'failed');

      // إرسال إشعار للمسؤولين
      if (isNewProfile) {
        // ملف جديد - إرسال إشعار لجميع المسؤولين
        const adminNotification = await notificationService.sendAdminNotification(
          'new_registration',
          {
            userName: user.name || 'مستخدم جديد',
            companyName: profile.companyName || 'غير محدد',
            profileId: profile._id,
            email: profile.email || 'غير محدد',
            phone: profile.contactPhone || 'غير محدد',
            actionRequired: true,
            message: `ملف شخصي جديد يحتاج المراجعة من ${user.name || 'مستخدم جديد'}`
          }
        );
        notificationSent = adminNotification ? true : false;
        
      } else if (isResubmission) {
        // إعادة تقديم - إرسال إشعار للمشرفين والمسؤولين
        const supervisorNotification = await notificationService.sendToGroup(
          'all_supervisors',
          {
            title: '🔄 إعادة تقديم ملف شخصي',
            body: `تم إعادة تقديم ملف ${profile.companyName || 'شركة'} للمراجعة بعد ${existingProfile.profileStatus === 'rejected' ? 'الرفض' : 'طلب التصحيح'}.`,
            type: 'supervisor_alert',
            priority: 'high',
            data: {
              profileId: profile._id,
              userId: userId,
              userName: user.name,
              companyName: profile.companyName,
              previousStatus: existingProfile.profileStatus,
              isResubmission: true,
              actionRequired: true
            },
            routing: {
              screen: 'AdminReviewScreen',
              params: { 
                profileId: profile._id.toString(),
                highlight: 'resubmission'
              }
            }
          }
        );
        notificationSent = supervisorNotification ? true : false;
        
      } else {
        // تحديث عادي - إشعار للمشرفين
        const updateNotification = await notificationService.sendAdminNotification(
          'admin_alert',
          {
            message: `تم تحديث ملف ${profile.companyName || 'شركة'} بواسطة ${user.name || 'مستخدم'}`,
            profileId: profile._id,
            userId: userId,
            companyName: profile.companyName,
            actionRequired: false
          }
        );
        notificationSent = updateNotification ? true : false;
      }
      
      console.log('📨 Admin notifications sent:', notificationSent);

    } catch (notificationError) {
      console.error('⚠️ Failed to send notifications via service:', notificationError);
      notificationSent = false;
      // لا نوقف العملية إذا فشل إرسال الإشعار
    }

    // إرسال الرد للمستخدم
    const responseMessage = isNewProfile 
      ? 'تم إرسال الملف الشخصي للمراجعة بنجاح'
      : 'تم تحديث الملف الشخصي وإرساله للمراجعة بنجاح';
    
    res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        profile: profile,
        notificationInfo: {
          sentToAdmins: notificationSent,
          isNewProfile: isNewProfile,
          isResubmission: isResubmission,
          nextStep: 'سيتم مراجعة ملفك من قبل فريقنا خلال 24-48 ساعة عمل'
        }
      }
    });

  } catch (error) {
    console.error('❌ createOrUpdateProfile error:', error);
    
    // إرسال إشعار خطأ للمستخدم
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.sendSystemNotification(
        'عذراً، حدث خطأ أثناء محاولة حفظ ملفك الشخصي. يرجى المحاولة مرة أخرى أو الاتصال بالدعم.',
        'high',
        'customer'
      );
    } catch (notifError) {
      console.error('Failed to send error notification:', notifError);
    }
    
    res.status(500).json({
      success: false,
      message: 'فشل في حفظ الملف الشخصي',
      error: error.message,
      suggestion: 'يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى'
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

    // البحث عن الملف الشخصي أولاً للحصول على معلومات المستخدم
    const profile = await CompleteProfile.findById(profileId);
    if (!profile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الملف الشخصي'
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

    console.log('✅ Profile reviewed successfully:', profileId);

    // ============================================
    // 📨 إرسال إشعار للمستخدم باستخدام notificationService
    // ============================================
    try {
      const notificationService = require('../services/notificationService');
      
      // إرسال إشعار الحالة المناسب للمستخدم
      let notificationType;
      let additionalData = {
        profileId: profile._id,
        reviewedBy: adminId,
        reviewedAt: new Date()
      };
      
      if (status === 'approved') {
        notificationType = 'profile_approved';
        additionalData.status = 'approved';
      } else if (status === 'rejected') {
        notificationType = 'profile_rejected';
        additionalData.reason = rejectionReason || 'تم رفض الملف الشخصي';
        additionalData.status = 'rejected';
      } else if (status === 'needs_correction') {
        notificationType = 'profile_needs_correction';
        additionalData.notes = adminNotes || 'يحتاج الملف إلى تصحيح';
        additionalData.status = 'needs_correction';
      }
      
      // إرسال الإشعار للمستخدم
      const userNotification = await notificationService.sendProfileNotification(
        profile.user,
        notificationType,
        additionalData
      );
      
      console.log('📨 Profile status notification sent to user:', userNotification ? 'success' : 'failed');
      
      // إرسال إشعار للمسؤولين للمتابعة
      if (status === 'approved') {
        // إشعار للمسؤولين عند الموافقة
        await notificationService.sendAdminNotification('admin_alert', {
          message: `تمت الموافقة على ملف ${profile.companyName || 'شركة'} بواسطة ${req.user.name || 'مسؤول'}`,
          profileId: profile._id,
          userId: profile.user,
          companyName: profile.companyName,
          reviewer: req.user.name,
          status: 'approved',
          actionRequired: false
        });
      }
      
    } catch (notificationError) {
      console.error('⚠️ Failed to send notifications:', notificationError);
      // لا نوقف العملية إذا فشل إرسال الإشعار
    }

    // إرسال الرد
    const statusMessages = {
      'approved': 'تمت الموافقة على الملف الشخصي',
      'rejected': 'تم رفض الملف الشخصي',
      'needs_correction': 'تم طلب تصحيح الملف الشخصي'
    };

    res.status(200).json({
      success: true,
      message: statusMessages[status],
      data: updatedProfile,
      notificationSent: true
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

exports.sendReminderToAdmins = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتنفيذ هذا الإجراء'
      });
    }

    // حساب الملفات التي تحتاج مراجعة لمدة أكثر من 24 ساعة
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const pendingProfiles = await CompleteProfile.find({
      profileStatus: 'submitted',
      createdAt: { $lt: twentyFourHoursAgo }
    })
    .populate('user', 'name email')
    .limit(10);

    if (pendingProfiles.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'لا توجد ملفات متأخرة تحتاج مراجعة',
        data: []
      });
    }

    // إرسال إشعار للمسؤولين
    const notificationService = require('../services/notificationService');
    
    const reminderNotification = await notificationService.sendToGroup(
      'all_admins',
      {
        title: '⏰ تذكير: ملفات متأخرة تحتاج المراجعة',
        body: `يوجد ${pendingProfiles.length} ملف شخصي متأخر لم يتم مراجعته لأكثر من 24 ساعة.`,
        type: 'admin_alert',
        priority: 'high',
        data: {
          reminderType: 'pending_profiles',
          count: pendingProfiles.length,
          profiles: pendingProfiles.map(p => ({
            id: p._id,
            companyName: p.companyName,
            submittedAt: p.createdAt,
            userId: p.user._id,
            userName: p.user.name
          }))
        },
        routing: {
          screen: 'AdminDashboard',
          params: { 
            tab: 'pending',
            filter: 'overdue'
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      message: `تم إرسال تذكير للمسؤولين عن ${pendingProfiles.length} ملف متأخر`,
      data: {
        profilesCount: pendingProfiles.length,
        notificationSent: reminderNotification ? true : false,
        profiles: pendingProfiles.map(p => ({
          id: p._id,
          companyName: p.companyName,
          daysPending: Math.floor((new Date() - p.createdAt) / (1000 * 60 * 60 * 24))
        }))
      }
    });

  } catch (error) {
    console.error('❌ ERROR in sendReminderToAdmins:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في إرسال التذكير',
      error: error.message
    });
  }
};


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

    // البحث عن الملف الشخصي أولاً
    const profile = await CompleteProfile.findById(profileId);
    if (!profile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الملف الشخصي'
      });
    }

    const updateField = `documents.${documentType}.verified`;

    console.log('🔧 Update field:', updateField);

    const updatedProfile = await CompleteProfile.findByIdAndUpdate(
      profileId,
      { [updateField]: verified },
      { new: true }
    );

    console.log('✅ Document status updated successfully');

    // ============================================
    // 📨 إرسال إشعار للمستخدم باستخدام notificationService
    // ============================================
    try {
      const notificationService = require('../services/notificationService');
      
      const documentNames = {
        commercialLicense: 'الرخصة التجارية',
        energyLicense: 'رخصة الطاقة',
        commercialRecord: 'السجل التجاري',
        taxNumber: 'الرقم الضريبي',
        nationalAddressDocument: 'عنوان الوطني',
        civilDefenseLicense: 'رخصة الدفاع المدني'
      };
      
      const documentName = documentNames[documentType] || documentType;
      
      // إرسال الإشعار المناسب
      if (verified) {
        await notificationService.sendProfileNotification(
          profile.user,
          'document_approved',
          {
            profileId: profile._id,
            documentType: documentType,
            documentName: documentName,
            verified: true,
            updatedBy: req.user.id,
            message: `تم توثيق ${documentName} بنجاح`
          }
        );
      } else {
        await notificationService.sendProfileNotification(
          profile.user,
          'document_rejected',
          {
            profileId: profile._id,
            documentType: documentType,
            documentName: documentName,
            verified: false,
            updatedBy: req.user.id,
            reason: 'تم إلغاء توثيق المستند',
            message: `تم إلغاء توثيق ${documentName}. يرجى مراجعة المسؤول.`
          }
        );
      }
      
      console.log('📨 Document status notification sent to user');
      
    } catch (notificationError) {
      console.error('⚠️ Failed to send document notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: `تم ${verified ? 'توثيق' : 'إلغاء توثيق'} المستند`,
      data: updatedProfile,
      notificationSent: true
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
    console.log('🔐 User object:', req.user);

    // ✅ استخدام نفس المنطق: userType أو role
    const userRole = req.user.userType || req.user.role;
    
    console.log('👤 Effective user role:', userRole);

    if (userRole !== 'admin') {
      console.log('❌ Unauthorized - User is not admin, role:', userRole);
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

    // ... بقية الكود
  } catch (error) {
    console.error('❌ ERROR in getProfileStats:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الإحصائيات',
      error: error.message
    });
  }
};

// ==========================================================
// ✅ جلب ملف شخصي محدد بالـ ID
// ==========================================================
exports.getProfileById = async (req, res) => {
  try {
    console.log('🟢 START: getProfileById');
    const { profileId } = req.params;

    console.log('📋 Profile ID:', profileId);

    if (req.user.role !== 'admin' && req.user.userType !== 'admin') {
      console.log('❌ Unauthorized - User is not admin');
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتنفيذ هذا الإجراء'
      });
    }

    const profile = await CompleteProfile.findById(profileId)
      .populate('user', 'name email phone')
      .populate('reviewedBy', 'name');

    if (!profile) {
      console.log('❌ Profile not found:', profileId);
      return res.status(404).json({
        success: false,
        message: 'لم يتم العثور على الملف الشخصي'
      });
    }

    console.log('✅ Profile found:', profileId);

    res.status(200).json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('❌ ERROR in getProfileById:', error);
    res.status(500).json({
      success: false,
      message: 'فشل في جلب الملف الشخصي',
      error: error.message
    });
  }
};