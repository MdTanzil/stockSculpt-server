const router = require("express").Router();

const {
  createShop,
  getShops,
  updateShop,
  deleteShop,
  getShop,
  getShopProducts,
  getShopOrders,
  getShopByUserID,
} = require("../controllers/shop/shopController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const {
  checkShopOwnership,
} = require("../middlewares/checkShopOwnershipMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

router.get("/user", authenticateUser, getShopByUserID); // Get a shops by user Id
router.get("/", authenticateUser, authorizeRoles(["admin"]), getShops); // Get all shops
router.post("/", authenticateUser, createShop); // Create shop
router.get("/:id", authenticateUser, checkShopOwnership, getShop); // Get a shops

router.put("/:id", authenticateUser, checkShopOwnership, updateShop); // Update shop by ID
router.delete("/:id", authenticateUser, checkShopOwnership, deleteShop); // Delete shop by ID
router.get("/:id/orders", authenticateUser, checkShopOwnership, getShopOrders); // Get all shop products
router.get(
  "/:id/products",
  authenticateUser,
  checkShopOwnership,
  getShopProducts
); // Get all shop products
router.get(
  "/:id/products",
  authenticateUser,
  checkShopOwnership,
  getShopProducts
); // Get all shop products
router.get("/:id/orders", authenticateUser, checkShopOwnership, getShopOrders); // Get all shop products

module.exports = router;
