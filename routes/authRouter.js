const router = require("express").Router();
const {
  loginUser,
  logoutUser,
  dbTest,
} = require("../controllers/auth/authController");
const {
  refreshAccessToken,
} = require("../controllers/auth/refreshTokenController");

router.post("/refresh", refreshAccessToken);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/db-test", dbTest);

module.exports = router;
