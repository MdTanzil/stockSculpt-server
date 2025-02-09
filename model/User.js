const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  avatar: { type: String, required: false },
  dateOfBirth: { type: String, required: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  firebaseUid: { type: String, unique: true, sparse: true },
});

module.exports = mongoose.model("User", userSchema);
