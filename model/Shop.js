const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  name: { type: String, required: true },
  logo: { type: String },
  location: { type: String },
  subscriptionPlan: {
    type: String,
    enum: ["free", "premium"],
    default: "free",
  },
  // The specific plan the shop is on (e.g. "Free", "Starter"), matching
  // a name in the plans collection. subscriptionPlan stays the simple
  // free/paid flag the rest of the app checks; planName is what the
  // admin picks in Manage Shops and what Settings shows.
  planName: { type: String, default: "Free" },
  // The subscription's current period. Set together with the plan —
  // by a payment (from its billing period) or by the admin (from the
  // period they pick when assigning a plan). Null while the shop is on
  // the Free plan, which never expires.
  subscriptionStartDate: { type: Date, default: null },
  subscriptionEndDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Shop", shopSchema);
