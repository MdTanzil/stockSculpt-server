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
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Shop", shopSchema);
