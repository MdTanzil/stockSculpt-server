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
const { requirePremium } = require("../middlewares/requirePremium");
const { requireResourceRole } = require("../middlewares/shopRole");

// Purchase orders are a paid feature: every route here needs a signed-in user
// on a premium plan.
router.use(authenticateUser, requirePremium);

router.post("/", createPurchaseOrder); // Create purchase order (staff+)
router.get("/", getPurchaseOrders); // List own shop's purchase orders
router.get(
  "/:id",
  requireResourceRole(PurchaseOrder, "viewer", "Purchase order"),
  getPurchaseOrder
); // Get purchase order by ID
router.put(
  "/:id",
  requireResourceRole(PurchaseOrder, "staff", "Purchase order"),
  updatePurchaseOrder
); // Update purchase order by ID (staff+)
router.post(
  "/:id/receive",
  requireResourceRole(PurchaseOrder, "staff", "Purchase order"),
  receivePurchaseOrder
); // Receive an ordered purchase order (adds stock, staff+)
router.delete(
  "/:id",
  requireResourceRole(PurchaseOrder, "manager", "Purchase order"),
  deletePurchaseOrder
); // Delete purchase order by ID (manager+)

module.exports = router;
