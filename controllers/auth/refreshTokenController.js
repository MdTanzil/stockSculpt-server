const jwt = require("jsonwebtoken");
const User = require("../../model/User");

const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Get refresh token from cookie

  if (!refreshToken)
    return res.status(401).json({ message: "Unauthorized, no refresh token" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(401).json({ message: "User not found" });

    // Generate new access token
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    res.json({ accessToken }); // Send new access token to frontend
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Invalid or expired refresh token" });
  }
};

module.exports = { refreshAccessToken };
