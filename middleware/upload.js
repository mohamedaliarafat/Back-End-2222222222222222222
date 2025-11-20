const multer = require('multer');
const path = require('path');
const fs = require('fs');

// التأكد من وجود مجلد uploads
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// تحديد مكان حفظ الملفات
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // تنظيف اسم الملف وإضافة timestamp
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + originalName);
  }
});

// فلترة الملفات للصور و PDF فقط
const fileFilter = (req, file, cb) => {
  // السماح بالصور و PDF فقط
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`نوع الملف غير مسموح: ${file.mimetype}. المسموح: ${allowedMimes.join(', ')}`), false);
  }
};

// إعداد Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB كحد أقصى
    files: 10 // أقصى عدد ملفات في الطلب الواحد
  }
});

module.exports = upload;