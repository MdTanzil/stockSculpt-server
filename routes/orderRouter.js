const router = require("express").Router();

const {
  createOrder,
  createPOSSale,
  getOrders,
  updateOrder,
  deleteOrder,
  getOrder,
} = require("../controllers/order/orderController");
const Order = require("../model/Order");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requirePremium } = require("../middlewares/requirePremium");
const { requireResourceRole } = require("../middlewares/shopRole");

router.post("/", authenticateUser, createOrder); // Create order (staff+)
router.post("/pos", authenticateUser, requirePremium, createPOSSale); // Counter sale: checks stock, decrements it, records payment (staff+)
router.get("/", authenticateUser, getOrders); // Get all orders
router.get("/:id", authenticateUser, getOrder); // Get an order by ID
router.put(
  "/:id",
  authenticateUser,
  requireResourceRole(Order, "staff", "Order"),
  updateOrder
); // Update order by ID (staff+)
router.delete(
  "/:id",
  authenticateUser,
  requireResourceRole(Order, "manager", "Order"),
  deleteOrder
); // Delete order by ID (manager+)

module.exports = router;
