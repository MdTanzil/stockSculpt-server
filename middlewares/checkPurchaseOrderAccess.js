const PurchaseOrder = require("../model/PurchaseOrder");
const Shop = require("../model/Shop");

// Same rule as checkOrderAccess: the shop owner or an admin. If the
// purchase order's shop no longer exists (orphaned record), admins can
// still manage it; everyone else is denied instead of a misleading 404.
const checkPurchaseOrderAccess = async (req, res, next) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);
    if (!purchaseOrder) {
      return res.status(404).json({ error: "Purchase order not found" });
    }

    const shop = await Shop.findById(purchaseOrder.shop);
    if (!shop) {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      return next();
    }

    if (
      shop.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkPurchaseOrderAccess };
