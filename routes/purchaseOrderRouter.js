const router = require("express").Router();
const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
} = require("../controllers/purchaseOrder/purchaseOrderController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const {
  checkPurchaseOrderAccess,
} = require("../middlewares/checkPurchaseOrderAccess");

router.post("/", authenticateUser, createPurchaseOrder); // Create purchase order
router.get("/", authenticateUser, getPurchaseOrders); // List own shop's purchase orders
router.get("/:id", authenticateUser, checkPurchaseOrderAccess, getPurchaseOrder); // Get purchase order by ID
router.put("/:id", authenticateUser, checkPurchaseOrderAccess, updatePurchaseOrder); // Update purchase order by ID
router.post(
  "/:id/receive",
  authenticateUser,
  checkPurchaseOrderAccess,
  receivePurchaseOrder
); // Receive an ordered purchase order (adds stock)
router.delete("/:id", authenticateUser, checkPurchaseOrderAccess, deletePurchaseOrder); // Delete purchase order by ID

module.exports = router;
