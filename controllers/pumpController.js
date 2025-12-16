// controllers/pumpController.js
const Pump = require("../models/Pump");

exports.createPump = async (req, res) => {
  const pump = await Pump.create({
    ...req.body,
    ownerId: req.user.userId
  });
  res.json({ success: true, pump });
};

exports.getMyPumps = async (req, res) => {
  const pumps = await Pump.find({ ownerId: req.user.userId });
  res.json({ success: true, pumps });
};
