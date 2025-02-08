const router = require("express").Router();

const {
  createOrder,
  getOrders,
  updateOrder,
  deleteOrder,
} = require("../controllers/order/orderController");

router.post("/", createOrder); // Create order
router.get("/", getOrders); // Get all orders
router.put("/:id", updateOrder); // Update order by ID
router.delete("/:id", deleteOrder); // Delete order by ID

module.exports = router;
