const Order = require("../../model/Order");
const Shop = require("../../model/Shop");

// Create a new order
const createOrder = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });

    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    // Create product
    const order = new Order({
      ...req.body,
      shop: shop._id,
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
    const orders = await Order.find().populate("shop").populate("products");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get an order by ID
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
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

module.exports = { createOrder, getOrders, updateOrder, deleteOrder, getOrder };
