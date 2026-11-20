const Supplier = require("../model/Supplier");
const Shop = require("../model/Shop");

// Same rule as checkOrderAccess: the shop owner or an admin. If the
// supplier's shop no longer exists (orphaned record), admins can still
// manage it; everyone else is denied instead of getting a misleading 404.
const checkSupplierAccess = async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }

    const shop = await Shop.findById(supplier.shop);
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

module.exports = { checkSupplierAccess };
