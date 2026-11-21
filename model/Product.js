const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  name: { type: String, required: true },
  image: { type: String },
  rating: { type: Number, default: 4 },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  category: { type: String },
  // Optional barcode (EAN/UPC/QR content). Unique per shop so a scan
  // always finds one product; sparse so products without a barcode
  // don't collide. Clear it by sending an empty string (see controller).
  barcode: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

productSchema.index({ shop: 1, barcode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Product", productSchema);
