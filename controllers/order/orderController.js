const Order = require("../../model/Order");
const Product = require("../../model/Product");
const { effectivePrice } = require("../../utils/effectivePrice");
const { findCallerShop, hasRole } = require("../../utils/shopAccess");

// Create a new order
const createOrder = async (req, res) => {
  try {
    // The caller's shop (owned or staff). Viewers are read-only.
    const { shop, role } = await findCallerShop(req.user._id);

    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    if (!hasRole(role, "staff")) {
      return res.status(403).json({ message: "Viewers cannot add orders." });
    }
    // Create product. createdBy is set server-side, after the spread, so a
    // client cannot claim another staff member prepared the order.
    const order = new Order({
      ...req.body,
      shop: shop._id,
      createdBy: req.user._id,
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    console.log(error.message);

    res.status(400).json({ error: error.message });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("shop")
      .populate("products.product")
      .populate("createdBy", "name email");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get an order by ID
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("shop")
      .populate("products.product")
      .populate("createdBy", "name email");
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
// Update an order by ID
const updateOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.log(error.message);

    res.status(400).json({ error: error.message });
  }
};

// Delete an order by ID
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// A counter (POS) sale. Staff+ only. Unlike the back-office createOrder,
// this validates every line against current stock, decrements stock, and
// creates a COMPLETED order recording the payment method (cash/card —
// recorded only, no payment is processed). The total is always computed
// server-side from current prices.
const createPOSSale = async (req, res) => {
  try {
    const { shop, role } = await findCallerShop(req.user._id);
    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    if (!hasRole(role, "staff")) {
      return res.status(403).json({ message: "Viewers cannot make sales." });
    }

    const { items, paymentMethod } = req.body;
    if (!["cash", "card"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ error: "Payment method must be 'cash' or 'card'." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "A sale needs at least one item." });
    }

    // Validate every line first (existence, shop, quantity) so a bad line
    // fails before any stock moves.
    const lines = [];
    let totalPrice = 0;
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          error: "Each item needs a whole-number quantity of at least 1.",
        });
      }
      const product = await Product.findById(item.product);
      if (!product || product.shop.toString() !== shop._id.toString()) {
        return res.status(400).json({
          error: "One of the products was not found in your shop.",
        });
      }
      lines.push({ product, quantity });
      // Discounted products sell at the discount price.
      totalPrice += effectivePrice(product) * quantity;
    }
    totalPrice = Math.round(totalPrice * 100) / 100;

    // Decrement stock atomically per line — the stock condition makes the
    // update fail instead of overselling. If a line fails, roll back the
    // lines already decremented.
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
        return res.status(400).json({
          error: `Not enough stock for ${product.name} (only ${product.stock} left).`,
        });
      }
      decremented.push({ product, quantity });
    }

    const order = new Order({
      shop: shop._id,
      products: lines.map(({ product, quantity }) => ({
        product: product._id,
        quantity,
      })),
      totalPrice,
      orderStatus: "completed",
      paymentMethod,
      source: "pos",
      createdBy: req.user._id,
    });
    await order.save();
    const populated = await Order.findById(order._id)
      .populate("shop")
      .populate("products.product")
      .populate("createdBy", "name email");
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrder,
  createPOSSale,
  getOrders,
  updateOrder,
  deleteOrder,
  getOrder,
};
