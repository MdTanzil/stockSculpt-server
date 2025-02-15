const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../../model/User");
const { generateTokens } = require("../../utils/generateToken");

const loginUser = async (req, res) => {
  try {
    const { email, password, provider } = req.body;
    console.log("Login request for email:", email);

    // Optimized database query
    console.time("Database Query");
    const user = await User.findOne({ email }).select("+password"); // Include password field
    console.timeEnd("Database Query");

    if (!user) {
      return res.status(401).json({ message: "No user found" });
    }

    if (!provider) {
      console.time("Password Comparison");
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      console.timeEnd("Password Comparison");

      if (!isPasswordMatch) {
        return res.status(401).json({ message: "Password match error" });
      }
    }

    console.time("Token Generation");
    const { accessToken, refreshToken } = generateTokens(user._id);
    console.timeEnd("Token Generation");

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    console.log("Login successful for user:", user._id);
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  });

  res.json({ message: "User logged out successfully" });
};

module.exports = { loginUser, logoutUser };
