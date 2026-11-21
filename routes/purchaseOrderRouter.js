const router = require("express").Router();
const {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
} = require("../controllers/purchaseOrder/purchaseOrderController");
const PurchaseOrder = require("../model/PurchaseOrder");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requireResourceRole } = require("../middlewares/shopRole");

router.post("/", authenticateUser, createPurchaseOrder); // Create purchase order (staff+)
router.get("/", authenticateUser, getPurchaseOrders); // List own shop's purchase orders
router.get(
  "/:id",
  authenticateUser,
  requireResourceRole(PurchaseOrder, "viewer", "Purchase order"),
  getPurchaseOrder
); // Get purchase order by ID
router.put(
  "/:id",
  authenticateUser,
  requireResourceRole(PurchaseOrder, "staff", "Purchase order"),
  updatePurchaseOrder
); // Update purchase order by ID (staff+)
router.post(
  "/:id/receive",
  authenticateUser,
  requireResourceRole(PurchaseOrder, "staff", "Purchase order"),
  receivePurchaseOrder
); // Receive an ordered purchase order (adds stock, staff+)
router.delete(
  "/:id",
  authenticateUser,
  requireResourceRole(PurchaseOrder, "manager", "Purchase order"),
  deletePurchaseOrder
); // Delete purchase order by ID (manager+)

module.exports = router;
