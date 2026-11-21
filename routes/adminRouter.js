const router = require("express").Router();
const {
  getAdminState,
  getIndexes,
} = require("../controllers/admin/adminController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

router.get(
  "/state",
  authenticateUser,
  authorizeRoles(["admin"]),
  getAdminState
); // Admin overview stats

// TEMPORARY diagnostic — remove once the barcode-index issue is resolved.
router.get(
  "/indexes",
  authenticateUser,
  authorizeRoles(["admin"]),
  getIndexes
);

module.exports = router;
