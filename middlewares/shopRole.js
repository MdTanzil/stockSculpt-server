const Shop = require("../model/Shop");
const { getShopRole, hasRole } = require("../utils/shopAccess");

// Require a minimum shop role on routes where the shop is req.params.id
// (shop routes: /:id, /:id/products, /:id/orders, /:id/members...).
// Platform admins always pass. Sets req.shop and req.shopRole.
const requireShopRole = (minimum) => async (req, res, next) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    if (req.user.role === "admin") {
      req.shop = shop;
      req.shopRole = "owner";
      return next();
    }
    const role = await getShopRole(req.user._id, shop);
    if (!hasRole(role, minimum)) {
      return res.status(403).json({ message: "Access denied" });
    }
    req.shop = shop;
    req.shopRole = role;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Require a minimum shop role on routes where a resource (product, order,
// supplier, purchase order) carries the shop id. The resource is loaded
// first (404 if missing); orphaned resources (shop deleted) are admin-only,
// as in the previous ownership middlewares.
const requireResourceRole =
  (Model, minimum, resourceName) => async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: `${resourceName} not found` });
      }
      const shop = await Shop.findById(resource.shop);
      if (!shop) {
        if (req.user.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }
        return next();
      }
      if (req.user.role === "admin") return next();
      const role = await getShopRole(req.user._id, shop);
      if (!hasRole(role, minimum)) {
        return res.status(403).json({ message: "Access denied" });
      }
      req.shop = shop;
      req.shopRole = role;
      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

module.exports = { requireShopRole, requireResourceRole };
