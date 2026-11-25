const Product = require("../../model/Product");
const { findCallerShop, hasRole } = require("../../utils/shopAccess");
const { getPlanProductLimit } = require("../../utils/planLimits");
const {
  logAudit,
  describeChanges,
} = require("../../utils/auditLog");

// Bulk import limits: a file can carry at most this many rows, so one
// import cannot run a serverless function into its timeout.
const MAX_IMPORT_ROWS = 500;

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

// Validate one CSV import row (the same rules as createProduct, minus
// the plan limit, which is checked for the whole batch). Returns
// { product } with the cleaned fields to insert, { skip: true } for a
// fully blank row, or { error } with a user-facing message.
const validateImportRow = (row) => {
  const text = (value) =>
    value === undefined || value === null ? "" : String(value).trim();
  const name = text(row.name);
  const priceRaw = text(row.price);
  const stockRaw = text(row.stock);
  const discountRaw = text(row.discountPrice);
  const category = text(row.category);
  const barcode = text(row.barcode);
  const description = text(row.description);

  if (
    !name &&
    !priceRaw &&
    !stockRaw &&
    !discountRaw &&
    !category &&
    !barcode &&
    !description
  ) {
    return { skip: true };
  }
  if (!name) return { error: "Name is required." };
  const price = Number(priceRaw);
  if (priceRaw === "" || !Number.isFinite(price) || price < 0) {
    return { error: "Price must be a number of 0 or more." };
  }
  const stock = Number(stockRaw);
  if (stockRaw === "" || !Number.isInteger(stock) || stock < 0) {
    return { error: "Stock must be a whole number of 0 or more." };
  }
  const badDiscount = discountError(
    discountRaw === "" ? undefined : discountRaw,
    price
  );
  if (badDiscount) return { error: badDiscount };

  const product = { name, price, stock };
  if (discountRaw !== "") product.discountPrice = Number(discountRaw);
  if (category) product.category = category;
  if (barcode) product.barcode = barcode;
  if (description) product.description = description;
  return { product };
};

// Bulk import products from a parsed CSV: POST /api/products/import
// with { rows: [{ name, price, discountPrice, stock, category,
// barcode, description, row }] } — the client parses the file (see
// src/utils/productCsv.js) and the server validates every row, so a
// bad row never blocks the good ones. Returns 201 with
// { created, errors: [{ row, name, error }] } when at least one product
// was created, else 400 with the same shape. Rows are inserted one by
// one so each failure is attributed to its own row (including a
// duplicate barcode that slipped past the pre-check).
const importProducts = async (req, res) => {
  try {
    const { shop, role } = await findCallerShop(req.user._id);
    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    if (!hasRole(role, "staff")) {
      return res
        .status(403)
        .json({ message: "Viewers cannot add products." });
    }

    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows to import." });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return res.status(400).json({
        error: `A file can import at most ${MAX_IMPORT_ROWS} products at once.`,
      });
    }

    // Barcodes already in the shop, so a row reusing one fails with a
    // clear message instead of a database error.
    const existing = await Product.find(
      { shop: shop._id, barcode: { $type: "string" } },
      "barcode"
    );
    const usedBarcodes = new Set(existing.map((p) => p.barcode));

    const errors = [];
    const valid = [];
    const seenBarcodes = new Set();
    for (const row of rows) {
      const rowNo = row.row ?? "?";
      const { product, skip, error } = validateImportRow(row);
      if (skip) continue;
      if (error) {
        errors.push({ row: rowNo, name: row.name || "", error });
        continue;
      }
      if (product.barcode) {
        if (usedBarcodes.has(product.barcode)) {
          errors.push({
            row: rowNo,
            name: product.name,
            error: "Another product in your shop already uses this barcode.",
          });
          continue;
        }
        if (seenBarcodes.has(product.barcode)) {
          errors.push({
            row: rowNo,
            name: product.name,
            error: `Barcode ${product.barcode} is used twice in this file.`,
          });
          continue;
        }
        seenBarcodes.add(product.barcode);
      }
      // Keep the CSV line number with the row, so an insert failure
      // later still points at the right row in the user's file.
      valid.push({ product, rowNo });
    }

    // The plan limit counts only rows that would actually be created.
    // Refusing the whole batch beats importing a partial file the user
    // did not ask for — the message says how many slots are left.
    const limit = await getPlanProductLimit(shop);
    const count = await Product.countDocuments({ shop: shop._id });
    const remaining = Math.max(0, limit - count);
    if (valid.length > remaining) {
      return res.status(403).json({
        error: `Your ${shop.planName || "Free"} plan allows ${remaining} more product${remaining === 1 ? "" : "s"} (up to ${limit}). This file has ${valid.length} new products — remove some rows or upgrade.`,
        code: "PRODUCT_LIMIT_REACHED",
      });
    }

    const created = [];
    for (const { product: fields, rowNo } of valid) {
      try {
        const product = new Product({ ...fields, shop: shop._id });
        await product.save();
        created.push(product);
        if (product.barcode) usedBarcodes.add(product.barcode);
      } catch (error) {
        // Race safety: a barcode taken between the pre-check and the
        // insert still fails as a per-row error, not a whole-batch 500.
        const message =
          error.code === 11000
            ? "Another product in your shop already uses this barcode."
            : error.message;
        errors.push({ row: rowNo, name: fields.name, error: message });
      }
    }

    if (created.length > 0) {
      await logAudit({
        shop: shop._id,
        actor: req.user._id,
        action: "product.imported",
        entityType: "product",
        entityId: created[0]._id,
        entityName: "CSV import",
        details: `Imported ${created.length} product${created.length === 1 ? "" : "s"}${errors.length > 0 ? `; ${errors.length} row${errors.length === 1 ? "" : "s"} skipped` : ""}`,
      });
    }

    const body = { created, errors };
    return res.status(created.length > 0 ? 201 : 400).json(body);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  importProducts,
  getProducts,
  updateProduct,
  deleteProduct,
  getProduct,
  getProductByBarcode,
};
