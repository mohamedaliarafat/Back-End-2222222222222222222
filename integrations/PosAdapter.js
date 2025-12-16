// integrations/PosAdapter.js
const BaseAdapter = require("./BaseAdapter");

class PosAdapter extends BaseAdapter {
  async normalize(data) {
    return {
      ...data,
      source: "POS",
      transactionDate: new Date()
    };
  }
}

module.exports = PosAdapter;
