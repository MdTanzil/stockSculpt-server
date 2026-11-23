const Product = require("../model/Product");

// Shared stock handling for orders — used by the back-office
// create/update/delete handlers and by the POS sale, so the rules stay
// identical everywhere: an order's lines must exist in the shop, the
// quantities must be whole numbers of at least 1, and stock moves
// atomically (a failed decrement rolls back the lines already moved).

// Validate order lines against a shop. Returns { lines } on success —
// lines carry the full product docs — or { error } with a message safe
// to show the user. Lines may carry a product id or a populated doc.
const validateOrderLines = async (products, shopId) => {
  if (!Array.isArray(products) || products.length === 0) {
    return { error: "An order needs at least one product." };
  }
  const lines = [];
  for (const item of products) {
    if (!item || typeof item !== "object") {
      return {
        error: "Each item needs a whole-number quantity of at least 1.",
      };
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return {
        error: "Each item needs a whole-number quantity of at least 1.",
      };
    }
    const productId = item.product?._id || item.product;
    let product = null;
    try {
      product = await Product.findById(productId);
    } catch {
      product = null;
    }
    if (!product || product.shop.toString() !== shopId.toString()) {
      return { error: "One of the products was not found in your shop." };
    }
    lines.push({ product, quantity });
  }
  return { lines };
};

// Decrement stock atomically per line — the stock condition makes the
// update fail instead of overselling. If a line fails, the lines
// already decremented are rolled back. Returns an error message, or
// null when every line was decremented.
const decrementStock = async (lines) => {
  const decremented = [];
  for (const { product, quantity } of lines) {
    const updated = await Product.findOneAndUpdate(
      { _id: product._id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );
    if (!updated) {
      for (const done of decremented) {
        await Product.findByIdAndUpdate(done.product._id, {
          $inc: { stock: done.quantity },
        });
      }
      return `Not enough stock for ${product.name} (only ${product.stock} left).`;
    }
    decremented.push({ product, quantity });
  }
  return null;
};

// Restore stock per line — used when an order is cancelled or deleted,
// or when an edit removes items. Products that no longer exist are
// skipped (updating a missing id is a no-op). Lines may carry a
// populated product doc or a bare id.
const restoreStock = async (lines) => {
  for (const { product, quantity } of lines) {
    const id = product?._id || product;
    if (!id) continue;
    await Product.findByIdAndUpdate(id, { $inc: { stock: quantity } });
  }
};

module.exports = { validateOrderLines, decrementStock, restoreStock };
