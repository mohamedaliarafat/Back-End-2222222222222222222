// routes/webrtc.js
const express = require('express');
const webrtcController = require('../controllers/webrtcController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/signal', auth.authenticate, webrtcController.handleWebRTCSignal);
router.get('/call/:callId', auth.authenticate, webrtcController.getCallInfo);
router.post('/call/:callId/end', auth.authenticate, webrtcController.endCall);

module.exports = router;