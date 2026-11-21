const router = require("express").Router();
const {
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} = require("../controllers/shopMember/shopMemberController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requireShopRole } = require("../middlewares/shopRole");

// Staff management is owner-only (platform admins pass too, as with the
// other owner-level shop routes). Mounted under /api/shop in routes/index.js.
router.get(
  "/:id/members",
  authenticateUser,
  requireShopRole("owner"),
  getMembers
);
router.post(
  "/:id/members",
  authenticateUser,
  requireShopRole("owner"),
  addMember
);
router.put(
  "/:id/members/:memberId",
  authenticateUser,
  requireShopRole("owner"),
  updateMemberRole
);
router.delete(
  "/:id/members/:memberId",
  authenticateUser,
  requireShopRole("owner"),
  removeMember
);

module.exports = router;
