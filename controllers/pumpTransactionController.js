// controllers/pumpTransactionController.js
const PumpTransaction = require("../models/PumpTransaction");
const AdapterFactory = require("../integrations/AdapterFactory");

exports.createTransaction = async (req, res) => {
  const adapter = AdapterFactory(req.body.integrationType);
  const normalized = await adapter.normalize(req.body);

  const tx = await PumpTransaction.create(normalized);
  res.json({ success: true, transaction: tx });
};
