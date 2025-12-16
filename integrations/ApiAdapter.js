// integrations/ApiAdapter.js
const BaseAdapter = require("./BaseAdapter");

class ApiAdapter extends BaseAdapter {
  async normalize(data) {
    return {
      ...data,
      source: "EXTERNAL_API",
      transactionDate: new Date()
    };
  }
}

module.exports = ApiAdapter;
