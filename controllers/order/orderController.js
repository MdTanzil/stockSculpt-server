const Order = require("../../model/Order");
const { effectivePrice } = require("../../utils/effectivePrice");
const {
  validateOrderLines,
  decrementStock,
  restoreStock,
} = require("../../utils/orderStock");
const { findCallerShop, hasRole } = require("../../utils/shopAccess");
const { logAudit, orderNumber } = require("../../utils/auditLog");

// An order holds stock while it is not cancelled: creating one
// decrements stock, cancelling restores it, deleting restores it, and
// editing adjusts it by the difference. (POS sales work the same way;
// they just always create completed orders.)
const holdsStock = (orderStatus) => orderStatus !== "canceled";

// Aggregate quantities per product id (an order's lines may repeat a
// product). Items may carry a populated product doc or a bare id.
const aggregateQuantities = (items) => {
  const map = new Map();
  for (const item of items || []) {
    const id = (item.product?._id || item.product)?.toString();
    if (!id) continue;
    map.set(id, (map.get(id) || 0) + Number(item.quantity || 0));
  }
  return map;
};

// Create a new order — validates every line against current stock and
// decrements it, like a POS sale. A cancelled order holds no stock.
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
    const { lines, error } = await validateOrderLines(
      req.body.products,
      shop._id
    );
    if (error) return res.status(400).json({ error });

    // Build + validate the order BEFORE moving any stock, so a bad
    // order never leaves stock decremented with nothing to show for
    // it. createdBy is set server-side, after the spread, so a client
    // cannot claim another staff member prepared the order.
    const order = new Order({
      ...req.body,
      shop: shop._id,
      createdBy: req.user._id,
    });
    await order.validate();

    if (holdsStock(order.orderStatus)) {
      const stockError = await decrementStock(lines);
      if (stockError) return res.status(400).json({ error: stockError });
    }

    await order.save();
    const itemCount = order.products.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
    await logAudit({
      shop: shop._id,
      actor: req.user._id,
      action: "order.created",
      entityType: "order",
      entityId: order._id,
      entityName: orderNumber(order._id),
      details: `${itemCount} item${itemCount === 1 ? "" : "s"}; total $${order.totalPrice}`,
    });
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
// Update an order by ID — and keep stock in step with it. Cancelling
// restores the stock, un-cancelling decrements it again (failing if
// there is not enough left), and changing the products adjusts stock
// by the difference per product. Status-only changes between pending
// and completed move no stock.
const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const newStatus = req.body.orderStatus ?? order.orderStatus;
    const productsChanged = req.body.products !== undefined;
    const newProducts = productsChanged ? req.body.products : order.products;

    const wasHolding = holdsStock(order.orderStatus);
    const willHold = holdsStock(newStatus);

    if (wasHolding && !willHold) {
      // Cancelling: give the stock back.
      await restoreStock(
        order.products.map((p) => ({
          product: p.product,
          quantity: p.quantity,
        }))
      );
    } else if (!wasHolding && willHold) {
      // Un-cancelling: take the stock again.
      const { lines, error } = await validateOrderLines(
        newProducts,
        order.shop
      );
      if (error) return res.status(400).json({ error });
      const stockError = await decrementStock(lines);
      if (stockError) return res.status(400).json({ error: stockError });
    } else if (wasHolding && willHold && productsChanged) {
      // Still holding stock, products changed: adjust by the delta.
      const { lines, error } = await validateOrderLines(
        newProducts,
        order.shop
      );
      if (error) return res.status(400).json({ error });
      const byId = new Map(
        lines.map((line) => [line.product._id.toString(), line.product])
      );
      const oldQty = aggregateQuantities(order.products);
      const newQty = aggregateQuantities(newProducts);
      const decrements = [];
      const restores = [];
      for (const [id, qty] of newQty) {
        const delta = qty - (oldQty.get(id) || 0);
        if (delta > 0)
          decrements.push({ product: byId.get(id), quantity: delta });
        else if (delta < 0) restores.push({ product: id, quantity: -delta });
      }
      for (const [id, qty] of oldQty) {
        if (!newQty.has(id)) restores.push({ product: id, quantity: qty });
      }
      // Decrement first (atomic, with rollback) so a failure leaves
      // stock untouched; restores cannot fail.
      const stockError = await decrementStock(decrements);
      if (stockError) return res.status(400).json({ error: stockError });
      await restoreStock(restores);
    }
    // Cancelled before and after: no stock moves.

    const updated = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    // One entry per save: a status change is the most informative, then
    // an items change; a no-op save logs nothing.
    if (newStatus !== order.orderStatus) {
      await logAudit({
        shop: order.shop,
        actor: req.user._id,
        action: "order.status_changed",
        entityType: "order",
        entityId: order._id,
        entityName: orderNumber(order._id),
        details: `Status ${order.orderStatus} → ${newStatus}`,
      });
    } else if (productsChanged) {
      await logAudit({
        shop: order.shop,
        actor: req.user._id,
        action: "order.updated",
        entityType: "order",
        entityId: order._id,
        entityName: orderNumber(order._id),
        details: "Items changed",
      });
    }
    res.json(updated);
  } catch (error) {
    console.log(error.message);

    res.status(400).json({ error: error.message });
  }
};

// Delete an order by ID — a non-cancelled order gives its stock back.
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (holdsStock(order.orderStatus)) {
      await restoreStock(
        order.products.map((p) => ({
          product: p.product,
          quantity: p.quantity,
        }))
      );
    }
    await Order.findByIdAndDelete(req.params.id);
    const itemCount = order.products.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
    await logAudit({
      shop: order.shop,
      actor: req.user._id,
      action: "order.deleted",
      entityType: "order",
      entityId: order._id,
      entityName: orderNumber(order._id),
      details: `${itemCount} item${itemCount === 1 ? "" : "s"}; total $${order.totalPrice}`,
    });
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// A counter (POS) sale. Staff+ only. Validates every line against
// current stock, decrements stock, and creates a COMPLETED order
// recording the payment method (cash/card — recorded only, no payment
// is processed). The total is always computed server-side from current
// prices.
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

    // Validate every line first (existence, shop, quantity) so a bad
    // line fails before any stock moves.
    const { lines, error } = await validateOrderLines(items, shop._id);
    if (error) return res.status(400).json({ error });

    // Discounted products sell at the discount price.
    const totalPrice =
      Math.round(
        lines.reduce(
          (sum, { product, quantity }) =>
            sum + effectivePrice(product) * quantity,
          0
        ) * 100
      ) / 100;

    const stockError = await decrementStock(lines);
    if (stockError) return res.status(400).json({ error: stockError });

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
    const itemCount = lines.reduce(
      (sum, { quantity }) => sum + Number(quantity || 0),
      0
    );
    await logAudit({
      shop: shop._id,
      actor: req.user._id,
      action: "pos.sale",
      entityType: "order",
      entityId: order._id,
      entityName: orderNumber(order._id),
      details: `${itemCount} item${itemCount === 1 ? "" : "s"}; total $${totalPrice} (${paymentMethod})`,
    });
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
