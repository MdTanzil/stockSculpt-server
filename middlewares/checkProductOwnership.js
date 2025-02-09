const Product = require("../model/Product");
const Shop = require("../model/Shop");

const checkProductOwnership = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const shop = await Shop.findById(product.shop);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    //  not shop owner or not admin send error
    if (
      shop.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkProductOwnership };
