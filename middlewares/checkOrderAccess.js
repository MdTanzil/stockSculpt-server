const Order = require("../model/Order");
const Shop = require("../model/Shop");

const checkOrderAccess = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const shop = await Shop.findById(order.shop);
    if (!shop) {
      return res.status(404).json({ error: "Shop not found" });
    }

    // Allow if the user is the shop owner or an admin
    if (
      shop.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    next(); // Proceed to the next middleware/controller
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkOrderAccess };
