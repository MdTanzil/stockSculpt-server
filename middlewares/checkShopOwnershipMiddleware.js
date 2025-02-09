const Shop = require("../model/Shop");

const checkShopOwnership = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id });
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    // Check if the user is the owner or an admin
    if (
      shop.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.shop = shop;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkShopOwnership };
