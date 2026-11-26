// Low-stock rule, shared by the product, report and (mirrored in the
// client) dashboard code: a product is low on stock when its stock is
// at or below its own threshold, or 5 when it has none set.
const DEFAULT_LOW_STOCK_THRESHOLD = 5;

const lowStockThreshold = (product) =>
  product?.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD;

const isLowStock = (product) =>
  Number(product?.stock) <= lowStockThreshold(product);

module.exports = {
  DEFAULT_LOW_STOCK_THRESHOLD,
  lowStockThreshold,
  isLowStock,
};
