const router = require("express").Router();

const {
  createShop,
  getShops,
  updateShop,
  updateShopPlan,
  deleteShop,
  getShop,
  getShopProducts,
  getShopOrders,
  getShopByUserID,
} = require("../controllers/shop/shopController");
const {
  getAuditLogs,
} = require("../controllers/auditLog/auditLogController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requireShopRole } = require("../middlewares/shopRole");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

router.get("/user", authenticateUser, getShopByUserID); // Get the caller's shop (owned or staff)
router.get("/", authenticateUser, authorizeRoles(["admin"]), getShops); // Get all shops
router.post("/", authenticateUser, createShop); // Create shop
router.get("/:id", authenticateUser, requireShopRole("viewer"), getShop); // Get a shop
router.put("/:id", authenticateUser, requireShopRole("owner"), updateShop); // Update shop by ID (owner only)
router.put(
  "/:id/plan",
  authenticateUser,
  authorizeRoles(["admin"]),
  updateShopPlan
); // Update a shop's subscription plan (admin only)
router.delete("/:id", authenticateUser, requireShopRole("owner"), deleteShop); // Delete shop by ID (owner only)
router.get(
  "/:id/orders",
  authenticateUser,
  requireShopRole("viewer"),
  getShopOrders
); // Get all shop orders
router.get(
  "/:id/products",
  authenticateUser,
  requireShopRole("viewer"),
  getShopProducts
); // Get all shop products
router.get(
  "/:id/audit-logs",
  authenticateUser,
  requireShopRole("viewer"),
  getAuditLogs
); // Get a shop's audit log (any team member)

module.exports = router;
