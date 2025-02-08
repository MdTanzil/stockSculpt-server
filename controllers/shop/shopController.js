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
    const shops = await Shop.find();
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a shop by ID
const updateShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json(shop);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a shop by ID
const deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json({ message: "Shop deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createShop, getShops, updateShop, deleteShop };
