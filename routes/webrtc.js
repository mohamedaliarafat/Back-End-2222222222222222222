// routes/webrtc.js
const express = require('express');
const {
  handleWebRTCSignal,
  getCallInfo,
  endCall
} = require('../controllers/webrtcController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/signal', authenticateToken, handleWebRTCSignal);
router.get('/call/:callId', authenticateToken, getCallInfo);
router.post('/call/:callId/end', authenticateToken, endCall);

module.exports = router;