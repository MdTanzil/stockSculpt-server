const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  name: { type: String, required: true },
  contactPerson: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Supplier", supplierSchema);
