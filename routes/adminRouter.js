const router = require("express").Router();
const { getAdminState } = require("../controllers/admin/adminController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

router.get(
  "/state",
  authenticateUser,
  authorizeRoles(["admin"]),
  getAdminState
); // Admin overview stats

module.exports = router;
