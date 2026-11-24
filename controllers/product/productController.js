const Product = require("../../model/Product");
const { findCallerShop, hasRole } = require("../../utils/shopAccess");
const { getPlanProductLimit } = require("../../utils/planLimits");
const {
  logAudit,
  describeChanges,
} = require("../../utils/auditLog");

// A discount price must be a real discount: a number >= 0 and below
// the regular price. Returns an error string, or null when valid.
// An empty/missing value means "no discount" and is always valid.
const discountError = (discountPrice, price) => {
  if (
    discountPrice === undefined ||
    discountPrice === null ||
    discountPrice === ""
  ) {
    return null;
  }
  const d = Number(discountPrice);
  if (!Number.isFinite(d) || d < 0) {
    return "Discount price must be 0 or more.";
  }
  if (Number(price) <= d) {
    return "Discount price must be below the regular price.";
  }
  return null;
};

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

    // The plan's product limit. Existing products are never removed —
    // a shop over its limit (e.g. after a downgrade) simply cannot add
    // more until it is back under the limit or upgrades.
    const limit = await getPlanProductLimit(shop);
    const count = await Product.countDocuments({ shop: shop._id });
    if (count >= limit) {
      return res.status(403).json({
        error: `Your ${shop.planName || "Free"} plan allows up to ${limit} products. Remove some products or upgrade to add more.`,
        code: "PRODUCT_LIMIT_REACHED",
      });
    }

    // An empty barcode means "no barcode" — omit it so the sparse unique
    // index is not fed an empty string.
    if (typeof req.body.barcode === "string" && req.body.barcode.trim() === "") {
      delete req.body.barcode;
    }

    // An empty discount price means "no discount" — omit it, and a
    // real discount must be below the regular price.
    if (req.body.discountPrice === "" || req.body.discountPrice === null) {
      delete req.body.discountPrice;
    }
    const badDiscount = discountError(req.body.discountPrice, req.body.price);
    if (badDiscount) {
      return res.status(400).json({ error: badDiscount });
    }

    // Create product
    const product = new Product({
      ...req.body,
      shop: shop._id,
    });

    await product.save();
    await logAudit({
      shop: shop._id,
      actor: req.user._id,
      action: "product.created",
      entityType: "product",
      entityId: product._id,
      entityName: product.name,
      details: `Price $${product.price}; stock ${product.stock}`,
    });
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Another product in your shop already uses this barcode.",
      });
    }
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
    const updates = { ...req.body };
    // An empty barcode clears the stored barcode.
    if (typeof updates.barcode === "string" && updates.barcode.trim() === "") {
      delete updates.barcode;
      updates.$unset = { ...(updates.$unset || {}), barcode: "" };
    }
    // An empty discount price clears the stored discount.
    if (updates.discountPrice === "" || updates.discountPrice === null) {
      delete updates.discountPrice;
      updates.$unset = { ...(updates.$unset || {}), discountPrice: "" };
    }
    // Validate the discount against the price the product will have
    // after this update (the new price, or the stored one).
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });
    const nextPrice =
      updates.price !== undefined ? updates.price : existing.price;
    const nextDiscount =
      updates.discountPrice !== undefined
        ? updates.discountPrice
        : updates.$unset?.discountPrice !== undefined
          ? undefined
          : existing.discountPrice;
    const badDiscount = discountError(nextDiscount, nextPrice);
    if (badDiscount) {
      return res.status(400).json({ error: badDiscount });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    await logAudit({
      shop: existing.shop,
      actor: req.user._id,
      action: "product.updated",
      entityType: "product",
      entityId: product._id,
      entityName: product.name,
      details:
        describeChanges(existing, product, [
          { key: "name", label: "Name" },
          { key: "price", label: "Price", money: true },
          { key: "discountPrice", label: "Discount price", money: true },
          { key: "stock", label: "Stock" },
          { key: "category", label: "Category" },
          { key: "barcode", label: "Barcode" },
        ]) || "Updated",
    });
    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Another product in your shop already uses this barcode.",
      });
    }
    res.status(400).json({ error: error.message });
  }
};

// Find a product in the caller's shop by its barcode (scan lookup).
// Any team member may look up; only the shop's own products are visible.
const getProductByBarcode = async (req, res) => {
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    const code = String(req.params.code || "").trim();
    if (!code) {
      return res.status(400).json({ error: "A barcode is required." });
    }
    const product = await Product.findOne({ shop: shop._id, barcode: code });
    if (!product) {
      return res
        .status(404)
        .json({ error: "No product with this barcode in your shop." });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a product by ID
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    await logAudit({
      shop: product.shop,
      actor: req.user._id,
      action: "product.deleted",
      entityType: "product",
      entityId: product._id,
      entityName: product.name,
      details: `Price $${product.price}; stock ${product.stock}`,
    });
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
  getProductByBarcode,
};
