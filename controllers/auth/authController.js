const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../../utils/generateToken");

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

   if (user && (await bcrypt.compare(password, user.password))) {
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,  
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    })

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken, 
    });
};

const logoutUser = (req, res) => {
  res.json({ message: "User logged out" });
};

module.exports = { loginUser, logoutUser };
