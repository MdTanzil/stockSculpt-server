const mongoose = require("mongoose");

const purchaseOrderSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true,
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: { type: Number, required: true, min: 1 },
      unitCost: { type: Number, required: true, min: 0 },
    },
  ],
  totalCost: { type: Number, required: true },
  status: {
    type: String,
    enum: ["draft", "ordered", "received", "canceled"],
    default: "draft",
  },
  orderDate: { type: Date },
  receivedDate: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
