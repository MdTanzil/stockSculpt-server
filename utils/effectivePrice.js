// The price a customer actually pays: the discount price when one is
// set and below the regular price, otherwise the regular price. The
// client has the same rule in src/utils/productPrice.js — keep them
// in sync.
const effectivePrice = (product) => {
  const price = Number(product?.price) || 0;
  const discount = Number(product?.discountPrice);
  if (Number.isFinite(discount) && discount >= 0 && discount < price) {
    return discount;
  }
  return price;
};

// How much a customer saves on one unit of this product (0 when there
// is no discount).
const unitSavings = (product) => {
  const price = Number(product?.price) || 0;
  return Math.max(0, price - effectivePrice(product));
};

module.exports = { effectivePrice, unitSavings };
