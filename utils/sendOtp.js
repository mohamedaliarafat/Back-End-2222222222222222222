const twilio = require("twilio");

const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * إرسال كود تحقق SMS باستخدام Twilio
 */
const sendOtp = async (phone, otp) => {
  try {
    await client.messages.create({
      body: `رمز التحقق الخاص بك هو: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone, // تأكد أنه يبدأ بـ +966 أو رمز الدولة الصحيح
    });

    console.log(`✅ OTP أُرسل إلى ${phone}`);
  } catch (error) {
    console.error("❌ فشل إرسال OTP:", error);
    throw new Error("فشل إرسال رمز التحقق عبر Twilio");
  }
};

module.exports = sendOtp;
