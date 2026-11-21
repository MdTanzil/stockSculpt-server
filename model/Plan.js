const mongoose = require("mongoose");

// A subscription plan, managed by the admin (see the Manage Plans page)
// instead of being hardcoded in the client. The subscription page, the
// home page pricing section and the Stripe payment flow all read from
// here, so an admin price change takes effect everywhere at once.
// price is the monthly price in USD; yearlyPrice is the optional price
// for a full year (conventionally 10x the monthly price — 2 months free).
// productLimit is the number of products the plan allows (0 = none).
// Every plan includes all app features — only the limit changes.
const planSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 0 },
  yearlyPrice: { type: Number, min: 0 },
  productLimit: { type: Number, required: true, min: 0 },
  features: [{ type: String }],
  popular: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
});

module.exports = mongoose.model("Plan", planSchema);
