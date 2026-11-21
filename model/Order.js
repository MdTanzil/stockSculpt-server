const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, required: true },
    },
  ],
  totalPrice: { type: Number, required: true },
  orderStatus: {
    type: String,
    enum: ["pending", "completed", "canceled"],
    default: "pending",
  },
  // How the sale was paid for. Recorded only — no payment is processed.
  // Null for orders created before POS or through the back-office flow.
  paymentMethod: {
    type: String,
    enum: ["cash", "card"],
    default: null,
  },
  // "pos" for counter sales (stock is decremented at sale time), "manual"
  // for back-office orders (which do not touch stock).
  source: {
    type: String,
    enum: ["manual", "pos"],
    default: "manual",
  },
  // The staff member who created the order / made the sale. Shown on the
  // invoice and the POS receipt as "Prepared by". Orders created before
  // this field existed have no value — the UI omits the line for them.
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
