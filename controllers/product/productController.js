const Product = require("../../model/Product");
const { findCallerShop, hasRole } = require("../../utils/shopAccess");

const createProduct = async (req, res) => {
  try {
    // The caller's shop (owned or staff). Viewers are read-only.
    const { shop, role } = await findCallerShop(req.user._id);

    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    if (!hasRole(role, "staff")) {
      return res
        .status(403)
        .json({ message: "Viewers cannot add products." });
    }

    // Create product
    const product = new Product({
      ...req.body,
      shop: shop._id,
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all products
const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GEt a product by ID
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Update a product by ID
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a product by ID
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProduct,
};
