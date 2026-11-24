const Product = require("../../model/Product");
const PurchaseOrder = require("../../model/PurchaseOrder");
const Supplier = require("../../model/Supplier");
const { findCallerShop, hasRole } = require("../../utils/shopAccess");
const { logAudit, orderNumber } = require("../../utils/auditLog");

const round2 = (value) => Math.round(value * 100) / 100;

// Validate PO line items against the caller's shop and compute the total
// cost server-side (the client's total is never trusted). Throws an Error
// with a user-facing message on the first problem.
const validateItems = async (items, shopId) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("A purchase order needs at least one item.");
  }
  let totalCost = 0;
  const cleanItems = [];
  for (const item of items) {
    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Each item needs a whole-number quantity of at least 1.");
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      throw new Error("Each item needs a unit cost of 0 or more.");
    }
    const product = await Product.findById(item.product);
    if (!product || product.shop.toString() !== shopId.toString()) {
      throw new Error("One of the products was not found in your shop.");
    }
    cleanItems.push({ product: product._id, quantity, unitCost });
    totalCost += quantity * unitCost;
  }
  return { cleanItems, totalCost: round2(totalCost) };
};

const populateOrder = (query) =>
  query.populate("supplier").populate("items.product");

// Create a purchase order (draft, or ordered straight away). "received"
// cannot be set here — stock only moves through the receive endpoint.
// Staff+ only; viewers are read-only.
const createPurchaseOrder = async (req, res) => {
  try {
    const { shop, role } = await findCallerShop(req.user._id);
    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    if (!hasRole(role, "staff")) {
      return res
        .status(403)
        .json({ message: "Viewers cannot add purchase orders." });
    }

    const status = req.body.status || "draft";
    if (!["draft", "ordered"].includes(status)) {
      return res.status(400).json({
        error: "A new purchase order starts as draft or ordered.",
      });
    }

    const supplier = await Supplier.findById(req.body.supplier);
    if (!supplier || supplier.shop.toString() !== shop._id.toString()) {
      return res
        .status(400)
        .json({ error: "Supplier not found in your shop." });
    }

    const { cleanItems, totalCost } = await validateItems(
      req.body.items,
      shop._id
    );

    const purchaseOrder = new PurchaseOrder({
      shop: shop._id,
      supplier: supplier._id,
      items: cleanItems,
      totalCost,
      status,
      orderDate: status === "ordered" ? new Date() : undefined,
      notes: req.body.notes,
    });
    await purchaseOrder.save();
    await logAudit({
      shop: shop._id,
      actor: req.user._id,
      action: "purchase_order.created",
      entityType: "purchase_order",
      entityId: purchaseOrder._id,
      entityName: orderNumber(purchaseOrder._id),
      details: `Supplier ${supplier.name}; ${cleanItems.length} item${cleanItems.length === 1 ? "" : "s"}; total $${totalCost}`,
    });
    const populated = await populateOrder(
      PurchaseOrder.findById(purchaseOrder._id)
    );
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// List the caller's shop purchase orders (newest first). No shop yet means
// an empty list, not an error — the client shows its empty state.
const getPurchaseOrders = async (req, res) => {
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) return res.json([]);
    const orders = await populateOrder(
      PurchaseOrder.find({ shop: shop._id }).sort({ createdAt: -1 })
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a purchase order by ID (access checked by middleware)
const getPurchaseOrder = async (req, res) => {
  try {
    const order = await populateOrder(
      PurchaseOrder.findById(req.params.id)
    );
    if (!order)
      return res.status(404).json({ error: "Purchase order not found" });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a draft or ordered purchase order (access checked by middleware).
// Received and canceled orders are closed and cannot change. The status
// can move between draft/ordered/canceled here; receiving goes through the
// receive endpoint so stock is updated with it.
const updatePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order)
      return res.status(404).json({ error: "Purchase order not found" });
    if (order.status === "received" || order.status === "canceled") {
      return res.status(400).json({
        error: `A ${order.status} purchase order cannot be changed.`,
      });
    }
    if (req.body.status === "received") {
      return res.status(400).json({
        error: "Use the receive action to mark an order received.",
      });
    }

    // Validate against the ORDER's shop (resolved by the middleware), not
    // the caller's own shop — a user can own one shop and staff another.
    const shopId = req.shop ? req.shop._id : order.shop;
    const oldStatus = order.status;
    if (req.body.supplier !== undefined) {
      const supplier = await Supplier.findById(req.body.supplier);
      if (!supplier || supplier.shop.toString() !== shopId.toString()) {
        return res
          .status(400)
          .json({ error: "Supplier not found in your shop." });
      }
      order.supplier = supplier._id;
    }
    if (req.body.items !== undefined) {
      const { cleanItems, totalCost } = await validateItems(
        req.body.items,
        shopId
      );
      order.items = cleanItems;
      order.totalCost = totalCost;
    }
    if (req.body.status !== undefined) {
      if (!["draft", "ordered", "canceled"].includes(req.body.status)) {
        return res.status(400).json({ error: "Invalid status." });
      }
      if (req.body.status === "ordered" && !order.orderDate) {
        order.orderDate = new Date();
      }
      order.status = req.body.status;
    }
    if (req.body.notes !== undefined) order.notes = req.body.notes;

    await order.save();
    await logAudit({
      shop: order.shop,
      actor: req.user._id,
      action:
        order.status !== oldStatus
          ? "purchase_order.status_changed"
          : "purchase_order.updated",
      entityType: "purchase_order",
      entityId: order._id,
      entityName: orderNumber(order._id),
      details:
        order.status !== oldStatus
          ? `Status ${oldStatus} → ${order.status}`
          : `Total $${order.totalCost}`,
    });
    const populated = await populateOrder(
      PurchaseOrder.findById(order._id)
    );
    res.json(populated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Receive an ordered purchase order: every line item's quantity is added
// to that product's stock, and the order becomes "received". Only ordered
// orders can be received, so a second receive is impossible. Items whose
// product was deleted are skipped and reported back.
const receivePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order)
      return res.status(404).json({ error: "Purchase order not found" });
    if (order.status !== "ordered") {
      return res.status(400).json({
        error: `Only an ordered purchase order can be received (this one is ${order.status}).`,
      });
    }

    const skippedItems = [];
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        skippedItems.push(item.product);
        continue;
      }
      product.stock = (Number(product.stock) || 0) + item.quantity;
      await product.save();
    }

    order.status = "received";
    order.receivedDate = new Date();
    await order.save();

    const receivedUnits = order.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
    await logAudit({
      shop: order.shop,
      actor: req.user._id,
      action: "purchase_order.received",
      entityType: "purchase_order",
      entityId: order._id,
      entityName: orderNumber(order._id),
      details:
        `Received ${receivedUnits} unit${receivedUnits === 1 ? "" : "s"} into stock` +
        (skippedItems.length > 0
          ? `; ${skippedItems.length} item${skippedItems.length === 1 ? "" : "s"} skipped (product deleted)`
          : ""),
    });

    const populated = await populateOrder(
      PurchaseOrder.findById(order._id)
    );
    const result = populated.toObject();
    if (skippedItems.length > 0) {
      result.skippedItems = skippedItems;
    }
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a purchase order (access checked by middleware). Received orders
// cannot be deleted — their stock is already in the inventory.
const deletePurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order)
      return res.status(404).json({ error: "Purchase order not found" });
    if (order.status === "received") {
      return res.status(400).json({
        error:
          "A received purchase order cannot be deleted — its stock is already in your inventory.",
      });
    }
    await PurchaseOrder.findByIdAndDelete(req.params.id);
    await logAudit({
      shop: order.shop,
      actor: req.user._id,
      action: "purchase_order.deleted",
      entityType: "purchase_order",
      entityId: order._id,
      entityName: orderNumber(order._id),
      details: `Total $${order.totalCost}; status ${order.status}`,
    });
    res.json({ message: "Purchase order deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  deletePurchaseOrder,
};
