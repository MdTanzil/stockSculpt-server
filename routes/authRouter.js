const router = require("express").Router();
const { loginUser, logoutUser } = require("../controllers/auth/authController");
const {
  refreshAccessToken,
} = require("../controllers/auth/refreshTokenController");

router.post("/refresh", refreshAccessToken);
router.post("/login", loginUser);
router.post("/login", logoutUser);

module.exports = router;
