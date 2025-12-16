// controllers/pumpIntegrationController.js
const PumpIntegration = require("../models/PumpIntegration");

exports.attachIntegration = async (req, res) => {
  const integration = await PumpIntegration.create({
    pumpId: req.params.pumpId,
    ...req.body
  });
  res.json({ success: true, integration });
};
