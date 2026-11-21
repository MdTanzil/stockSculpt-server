const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  name: { type: String, required: true },
  image: { type: String },
  rating: { type: Number, default: 4 },
  description: { type: String },
  price: { type: Number, required: true },
  // Optional sale price. When set below `price`, customers pay this
  // instead — POS totals, reports and receipts all use the effective
  // price (see utils/effectivePrice.js). Must be >= 0 and below the
  // regular price (validated in the controller); clear it by sending
  // an empty string or null.
  discountPrice: { type: Number, min: 0 },
  stock: { type: Number, required: true },
  category: { type: String },
  // Optional barcode (EAN/UPC/QR content). Unique per shop so a scan
  // always finds one product. Clear it by sending an empty string
  // (see controller).
  barcode: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

// Unique per shop, but only for products that actually HAVE a barcode.
// NOTE: do NOT use `sparse` here — a sparse compound index still includes
// documents that have ANY indexed field (every product has `shop`), with
// the missing barcode treated as null, so the index build fails with a
// duplicate-key error on the 8 barcode-less demo products. A partial
// index excludes them entirely (missing or null barcodes are not strings).
productSchema.index(
  { shop: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: { barcode: { $type: "string" } },
  }
);

module.exports = mongoose.model("Product", productSchema);
