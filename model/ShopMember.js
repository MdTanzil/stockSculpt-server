const mongoose = require("mongoose");

// A staff membership: a user who works in a shop they do not own. The shop
// owner is NOT a ShopMember — ownership comes from Shop.owner (role
// "owner"). Roles, weakest to strongest: viewer (read-only), staff (sell +
// adjust stock), manager (everything except staff management and shop
// settings). One membership per user per shop.
const shopMemberSchema = new mongoose.Schema({
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["manager", "staff", "viewer"],
    required: true,
  },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

shopMemberSchema.index({ shop: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("ShopMember", shopMemberSchema);
