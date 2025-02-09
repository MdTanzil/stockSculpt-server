const router = require("express").Router();

const {
  createOrder,
  getOrders,
  updateOrder,
  deleteOrder,
  getOrder,
} = require("../controllers/order/orderController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { checkOrderAccess } = require("../middlewares/checkOrderAccess");

router.post("/", authenticateUser, createOrder); // Create order
router.get("/", authenticateUser, getOrders); // Get all orders
router.get("/:id", authenticateUser, getOrder); // Get all orders
router.put("/:id", authenticateUser, checkOrderAccess, updateOrder); // Update order by ID
router.delete("/:id", authenticateUser, checkOrderAccess, deleteOrder); // Delete order by ID

module.exports = router;
