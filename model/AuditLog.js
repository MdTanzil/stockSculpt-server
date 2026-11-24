const mongoose = require("mongoose");

// Append-only record of who changed what in a shop: products, orders,
// suppliers, purchase orders, staff and shop settings. Entries are
// written by the controllers through utils/auditLog.js after a
// successful mutation — never by the client directly — and there is no
// endpoint that updates or deletes them, so the log cannot be rewritten
// after the fact.
const auditLogSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // e.g. "product.created", "order.status_changed", "pos.sale".
  action: { type: String, required: true, trim: true },
  entityType: {
    type: String,
    required: true,
    enum: ["product", "order", "supplier", "purchase_order", "staff", "shop"],
  },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  // Snapshot of the item's name or number at the time, so a deleted item
  // still reads sensibly in the log.
  entityName: { type: String, trim: true },
  // Short human-readable summary, e.g. "Stock 5 → 3" or
  // "Status pending → completed".
  details: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

// Newest-first reads per shop, plus the filters the Activity page offers.
auditLogSchema.index({ shop: 1, createdAt: -1 });
auditLogSchema.index({ shop: 1, entityType: 1, createdAt: -1 });
auditLogSchema.index({ shop: 1, action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
