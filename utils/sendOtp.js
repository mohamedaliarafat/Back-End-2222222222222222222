const twilio = require("twilio");

// إنشاء العميل
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * إرسال كود تحقق SMS باستخدام Twilio
 * @param {string} phone - رقم الهاتف (محلي أو دولي)
 * @param {string|number} otp - كود التحقق المرسل للمستخدم
 */
const sendOtp = async (phone, otp) => {
  try {
    // تصحيح الرقم
    let formattedPhone;

    // لو الرقم يبدأ بـ "+" نتركه كما هو
    if (phone.startsWith("+")) {
      formattedPhone = phone;
    } else {
      // نحذف الأصفار في البداية ونضيف رمز الدولة (مثلاً السعودية +966)
      formattedPhone = "+966" + phone.replace(/^0+/, "");
    }

    // إرسال الرسالة عبر Messaging Service
    const message = await client.messages.create({
      body: `رمز التحقق الخاص بك هو: ${otp}`,
      messagingServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID, // من ملف .env
      to: formattedPhone,
    });

    console.log(`✅ OTP أُرسل إلى ${formattedPhone} - SID: ${message.sid}`);
  } catch (error) {
    console.error("❌ فشل إرسال OTP:", {
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo,
    });

    throw new Error("فشل إرسال رمز التحقق عبر Twilio");
  }
};

module.exports = sendOtp;
