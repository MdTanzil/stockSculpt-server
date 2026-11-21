const mongoose = require("mongoose");

// One record per successful Stripe payment. The transactionId is the
// Stripe PaymentIntent id (pi_...) and is unique, so the same payment
// can never be recorded (or a plan activated) twice.
const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  email: { type: String, required: true },
  // The plan name the customer bought (Starter / Company / Enterprise).
  // Every paid plan maps to the "premium" subscriptionPlan on the shop.
  plan: { type: String },
  interval: {
    type: String,
    enum: ["monthly", "yearly"],
    default: "monthly",
  },
  price: { type: Number, required: true },
  transactionId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "paid",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
