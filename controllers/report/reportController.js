const Order = require("../../model/Order");
const Product = require("../../model/Product");
const { effectivePrice } = require("../../utils/effectivePrice");
const { isLowStock } = require("../../utils/lowStock");
const { findCallerShop } = require("../../utils/shopAccess");

const round2 = (value) => Math.round(value * 100) / 100;

// Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD into UTC day boundaries. Throws an
// Error on an invalid date string; missing bounds mean "no limit".
const parseRange = (req) => {
  let from = null;
  let to = null;
  if (req.query.from) {
    from = new Date(`${req.query.from}T00:00:00.000Z`);
    if (Number.isNaN(from.getTime())) throw new Error("Invalid 'from' date.");
  }
  if (req.query.to) {
    to = new Date(`${req.query.to}T23:59:59.999Z`);
    if (Number.isNaN(to.getTime())) throw new Error("Invalid 'to' date.");
  }
  return { from, to };
};

// Shared range parsing: returns { from, to } or sends a 400 and returns null.
const getRange = (req, res) => {
  try {
    return parseRange(req);
  } catch (error) {
    res.status(400).json({ error: error.message });
    return null;
  }
};

const inRange = (date, from, to) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

const emptySummary = {
  totalRevenue: 0,
  totalOrders: 0,
  completedOrders: 0,
  pendingOrders: 0,
  canceledOrders: 0,
  totalUnitsSold: 0,
  averageOrderValue: 0,
  totalProducts: 0,
  totalStockValue: 0,
  lowStockCount: 0,
};

// KPI summary for the caller's shop. Order figures respect the date range;
// stock figures are always current (point-in-time).
const getSummary = async (req, res) => {
  const range = getRange(req, res);
  if (!range) return;
  const { from, to } = range;
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) return res.json(emptySummary);

    const [orders, products] = await Promise.all([
      Order.find({ shop: shop._id }).populate("products.product"),
      Product.find({ shop: shop._id }),
    ]);

    const ranged = orders.filter((o) => inRange(o.createdAt, from, to));
    const completed = ranged.filter((o) => o.orderStatus === "completed");
    const totalRevenue = round2(
      completed.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
    );
    const totalUnitsSold = completed.reduce(
      (sum, o) =>
        sum +
        (o.products || []).reduce(
          (s, item) => s + (Number(item.quantity) || 0),
          0
        ),
      0
    );
    // Stock is valued at the price it would actually sell for.
    const totalStockValue = round2(
      products.reduce(
        (sum, p) => sum + effectivePrice(p) * (Number(p.stock) || 0),
        0
      )
    );

    res.json({
      totalRevenue,
      totalOrders: ranged.length,
      completedOrders: completed.length,
      pendingOrders: ranged.filter((o) => o.orderStatus === "pending").length,
      canceledOrders: ranged.filter((o) => o.orderStatus === "canceled")
        .length,
      totalUnitsSold,
      averageOrderValue:
        completed.length > 0 ? round2(totalRevenue / completed.length) : 0,
      totalProducts: products.length,
      totalStockValue,
      lowStockCount: products.filter((p) => isLowStock(p)).length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Per-product sales from completed orders in range. Every shop product is
// listed, including ones with no sales (unitsSold 0). Revenue uses the
// product's CURRENT effective price (discount price when one is set) —
// orders don't store historical prices — so it is an approximation when
// prices changed. Items whose product was deleted cannot be attributed
// and are skipped.
const getSalesByProduct = async (req, res) => {
  const range = getRange(req, res);
  if (!range) return;
  const { from, to } = range;
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) return res.json([]);

    const [orders, products] = await Promise.all([
      Order.find({ shop: shop._id }).populate("products.product"),
      Product.find({ shop: shop._id }),
    ]);

    const byProduct = new Map();
    orders
      .filter(
        (o) => o.orderStatus === "completed" && inRange(o.createdAt, from, to)
      )
      .forEach((order) => {
        (order.products || []).forEach((item) => {
          const product = item.product;
          if (!product) return;
          const key = product._id.toString();
          const entry = byProduct.get(key) || { unitsSold: 0, revenue: 0 };
          const qty = Number(item.quantity) || 0;
          entry.unitsSold += qty;
          entry.revenue += qty * effectivePrice(product);
          byProduct.set(key, entry);
        });
      });

    const rows = products
      .map((p) => {
        const entry = byProduct.get(p._id.toString()) || {
          unitsSold: 0,
          revenue: 0,
        };
        return {
          productId: p._id,
          name: p.name,
          category: p.category || "Uncategorized",
          price: effectivePrice(p),
          unitsSold: entry.unitsSold,
          revenue: round2(entry.revenue),
        };
      })
      .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Per-category sales from completed orders in range, derived the same way
// as sales-by-product (current prices, deleted products skipped).
const getSalesByCategory = async (req, res) => {
  const range = getRange(req, res);
  if (!range) return;
  const { from, to } = range;
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) return res.json([]);

    const [orders, products] = await Promise.all([
      Order.find({ shop: shop._id }).populate("products.product"),
      Product.find({ shop: shop._id }),
    ]);

    const byCategory = new Map();
    products.forEach((p) => {
      const category = p.category || "Uncategorized";
      const entry = byCategory.get(category) || {
        category,
        unitsSold: 0,
        revenue: 0,
        productCount: 0,
      };
      entry.productCount += 1;
      byCategory.set(category, entry);
    });

    orders
      .filter(
        (o) => o.orderStatus === "completed" && inRange(o.createdAt, from, to)
      )
      .forEach((order) => {
        (order.products || []).forEach((item) => {
          const product = item.product;
          if (!product) return;
          const category = product.category || "Uncategorized";
          const entry = byCategory.get(category);
          if (!entry) return;
          const qty = Number(item.quantity) || 0;
          entry.unitsSold += qty;
          entry.revenue += qty * effectivePrice(product);
        });
      });

    const rows = [...byCategory.values()]
      .map((entry) => ({ ...entry, revenue: round2(entry.revenue) }))
      .sort((a, b) => b.revenue - a.revenue || b.unitsSold - a.unitsSold);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Monthly sales (completed orders) as one row per month. Default: the last
// 12 months including the current one. With ?from/&to, the months spanning
// the range (capped at 24 months). Months with no completed orders show 0.
const getSalesByMonth = async (req, res) => {
  const range = getRange(req, res);
  if (!range) return;
  const { from, to } = range;
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) return res.json([]);

    const now = new Date();
    let start;
    let end;
    if (from || to) {
      start = from
        ? new Date(from.getUTCFullYear(), from.getUTCMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth() - 11, 1);
      end = to
        ? new Date(to.getUTCFullYear(), to.getUTCMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const buckets = [];
    const cursor = new Date(start);
    while (cursor <= end && buckets.length < 24) {
      buckets.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        month: `${cursor.getFullYear()}-${String(
          cursor.getMonth() + 1
        ).padStart(2, "0")}`,
        label: cursor.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        }),
        revenue: 0,
        orders: 0,
        unitsSold: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    const orders = await Order.find({ shop: shop._id }).populate(
      "products.product"
    );
    orders
      .filter(
        (o) => o.orderStatus === "completed" && inRange(o.createdAt, from, to)
      )
      .forEach((order) => {
        const d = new Date(order.createdAt);
        if (Number.isNaN(d.getTime())) return;
        const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
        if (!bucket) return;
        bucket.revenue += Number(order.totalPrice) || 0;
        bucket.orders += 1;
        bucket.unitsSold += (order.products || []).reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0
        );
      });

    res.json(
      buckets.map(({ key, ...row }) => ({ ...row, revenue: round2(row.revenue) }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Current inventory valuation: every product with its stock value and a
// stock status (out of stock / low / ok). Point-in-time — no date range.
const getInventory = async (req, res) => {
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) {
      return res.json({
        items: [],
        totals: {
          totalValue: 0,
          totalUnits: 0,
          lowCount: 0,
          outCount: 0,
          productCount: 0,
        },
      });
    }

    const products = await Product.find({ shop: shop._id });
    const items = products
      .map((p) => {
        const stock = Number(p.stock) || 0;
        return {
          productId: p._id,
          name: p.name,
          category: p.category || "Uncategorized",
          stock,
          price: effectivePrice(p),
          value: round2(effectivePrice(p) * stock),
          status: stock === 0 ? "out" : isLowStock(p) ? "low" : "ok",
        };
      })
      .sort((a, b) => b.value - a.value);

    res.json({
      items,
      totals: {
        totalValue: round2(
          items.reduce((sum, item) => sum + item.value, 0)
        ),
        totalUnits: items.reduce((sum, item) => sum + item.stock, 0),
        lowCount: items.filter((item) => item.status === "low").length,
        outCount: items.filter((item) => item.status === "out").length,
        productCount: items.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getSummary,
  getSalesByProduct,
  getSalesByCategory,
  getSalesByMonth,
  getInventory,
};
