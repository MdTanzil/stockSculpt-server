const router = require("express").Router();
const {
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
} = require("../controllers/shopMember/shopMemberController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requirePremium } = require("../middlewares/requirePremium");
const { requireShopRole } = require("../middlewares/shopRole");

// Staff management is owner-only (platform admins pass too, as with the
// other owner-level shop routes). Mounted under /api/shop in routes/index.js.
// Staff roles are a paid feature: every route here needs a signed-in user
// on a premium plan.
router.use(authenticateUser, requirePremium);

router.get(
  "/:id/members",
  requireShopRole("owner"),
  getMembers
);
router.post(
  "/:id/members",
  requireShopRole("owner"),
  addMember
);
router.put(
  "/:id/members/:memberId",
  requireShopRole("owner"),
  updateMemberRole
);
router.delete(
  "/:id/members/:memberId",
  requireShopRole("owner"),
  removeMember
);

module.exports = router;
