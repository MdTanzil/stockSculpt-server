const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  plan: { type: String, enum: ["free", "premium"], required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date }, // Only for premium users
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
