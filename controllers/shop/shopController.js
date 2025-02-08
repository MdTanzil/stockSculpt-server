const Shop = require("../../model/Shop");

// Create a new shop
const createShop = async (req, res) => {
  try {
    const shop = new Shop(req.body);
    await shop.save();
    res.status(201).json(shop);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all shops
const getShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate("owner", "name email");
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a shop by ID
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

  Object.assign(shop, req.body);
  await shop.save();
  res.json(shop);
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

module.exports = { createShop, getShops, updateShop, deleteShop };
