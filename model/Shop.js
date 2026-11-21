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
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Shop", shopSchema);
