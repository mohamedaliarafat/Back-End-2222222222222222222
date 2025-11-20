// controllers/webrtcController.js
const activeCalls = new Map(); // تخزين المكالمات النشطة


const webrtcController = {};

// 🔄 معالجة إشارات WebRTC
webrtcController.handleWebRTCSignal = async (req, res) => {
  try {
    const { from, to, signal, type, roomId } = req.body;

    // تخزين معلومات المكالمة
    if (type === 'offer') {
      activeCalls.set(roomId, {
        caller: from,
        callee: to,
        offer: signal,
        status: 'waiting',
        startTime: new Date()
      });
    }

    // في الواقع، سيتم إرسال الإشارة عبر Socket.io
    // هذا للتوثيق فقط

    res.json({ 
      success: true, 
      message: 'تم استلام الإشارة بنجاح' 
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 🔍 جلب معلومات المكالمة
webrtcController.getCallInfo = async (req, res) => {
  try {
    const { callId } = req.params;

    const callInfo = activeCalls.get(callId);
    if (!callInfo) {
      return res.status(404).json({
        success: false,
        error: 'المكالمة غير موجودة'
      });
    }

    res.json({
      success: true,
      call: callInfo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ❌ إنهاء المكالمة
webrtcController.endCall = async (req, res) => {
  try {
    const { callId } = req.params;
    const { duration } = req.body;

    const callInfo = activeCalls.get(callId);
    if (callInfo) {
      // تحديث مدة المكالمة في قاعدة البيانات إذا لزم الأمر
      activeCalls.delete(callId);
    }

    res.json({
      success: true,
      message: 'تم إنهاء المكالمة بنجاح'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = webrtcController;