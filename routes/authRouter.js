const {
  refreshAccessToken,
} = require("../controllers/auth/refreshTokenController");

const router = require("express").Router();

router.post("/refresh", refreshAccessToken);

module.exports = router;
