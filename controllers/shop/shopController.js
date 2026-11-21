const Order = require("../../model/Order");
const Product = require("../../model/Product");
const Shop = require("../../model/Shop");
const { findCallerShop } = require("../../utils/shopAccess");

// Create a new shop
const createShop = async (req, res) => {
  try {
    const { subscriptionPlan, ...shopData } = req.body;
    shopData.owner = req.user._id;
    const shop = new Shop(shopData);
    await shop.save();
    res.status(201).json(shop);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all shops
const getShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate(
      "owner",
      "name email avatar lastLogin "
    );
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a shop by ID (access checked by middleware: any team member)
const getShop = async (req, res) => {
  res.json(req.shop);
};

// Get the caller's shop: the shop they own, else the first shop they are
// a staff member of. The response carries the caller's `role` in that shop
// ("owner" / "manager" / "staff" / "viewer") so the client can gate its UI.
// No shop at all means null, as before.
const getShopByUserID = async (req, res) => {
  try {
    const { shop, role } = await findCallerShop(req.user._id);
    if (!shop) return res.status(200).json(null);
    res.status(200).json({ ...shop.toObject(), role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateShop = async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) return res.status(404).json({ message: "Shop not found" });

  if (
    shop.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  // new tricks for update
  const { subscriptionPlan, ...shopData } = req.body;

  Object.assign(shop, shopData);
  await shop.save();
  res.json(shop);
};

// Update a shop's subscription plan (admin only). This is the ONLY way to
// change subscriptionPlan: createShop and updateShop strip it from the
// request body, so members can never upgrade themselves.
const updateShopPlan = async (req, res) => {
  try {
    const { subscriptionPlan } = req.body;
    if (!["free", "premium"].includes(subscriptionPlan)) {
      return res.status(400).json({
        error: "Invalid subscription plan. Must be 'free' or 'premium'.",
      });
    }
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    shop.subscriptionPlan = subscriptionPlan;
    await shop.save();
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a shop by ID
const deleteShop = async (req, res) => {
  try {
    // const shop = await Shop.findByIdAndDelete(req.params.id);
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    if (
      shop.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    const deletedShop = await Shop.findByIdAndDelete(req.params.id);
    res.json(deletedShop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get products of a specific shop
const getShopProducts = async (req, res) => {
  try {
    const shopId = req.params.id;
    const products = await Product.find({ shop: shopId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getShopOrders = async (req, res) => {
  try {
    const shopId = req.params.id;

    // Find orders for the shop
    const orders = await Order.find({ shop: shopId })
      .populate("shop")
      .populate("products.product")
      .populate("createdBy", "name email");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createShop,
  getShops,
  updateShop,
  updateShopPlan,
  deleteShop,
  getShop,
  getShopProducts,
  getShopOrders,
  getShopByUserID,
};
