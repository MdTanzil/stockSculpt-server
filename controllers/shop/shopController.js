const Order = require("../../model/Order");
const Product = require("../../model/Product");
const Shop = require("../../model/Shop");
const { findCallerShop } = require("../../utils/shopAccess");

// Create a new shop
const createShop = async (req, res) => {
  try {
    const { subscriptionPlan, ...shopData } = req.body;
    shopData.owner = req.user._id;
    const shop = new Shop(shopData);
    await shop.save();
    res.status(201).json(shop);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all shops
const getShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate(
      "owner",
      "name email avatar lastLogin "
    );
    res.json(shops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a shop by ID (access checked by middleware: any team member)
const getShop = async (req, res) => {
  res.json(req.shop);
};

// Get the caller's shop: the shop they own, else the first shop they are
// a staff member of. The response carries the caller's `role` in that shop
// ("owner" / "manager" / "staff" / "viewer") so the client can gate its UI.
// No shop at all means null, as before.
const getShopByUserID = async (req, res) => {
  try {
    const { shop, role } = await findCallerShop(req.user._id);
    if (!shop) return res.status(200).json(null);
    res.status(200).json({ ...shop.toObject(), role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateShop = async (req, res) => {
  const shop = await Shop.findById(req.params.id);

  if (!shop) return res.status(404).json({ message: "Shop not found" });

  if (
    shop.owner.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  // new tricks for update
  const { subscriptionPlan, ...shopData } = req.body;

  Object.assign(shop, shopData);
  await shop.save();
  res.json(shop);
};

// Update a shop's subscription plan (admin only). This is the ONLY way to
// change subscriptionPlan: createShop and updateShop strip it from the
// request body, so members can never upgrade themselves.
const updateShopPlan = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    // Preferred: { plan: "<plan name>", interval?, endDate? } — the plan
    // must exist in the plans collection. A $0 plan means free, any
    // priced plan means premium, so subscriptionPlan and planName always
    // agree. A paid plan always gets a period: Monthly (default) or
    // Yearly adds 1 or 12 months from today, or the admin can set an
    // exact end date. The Free plan never expires (dates are null).
    if (req.body.plan !== undefined) {
      const Plan = require("../../model/Plan");
      const plan = await Plan.findOne({ name: req.body.plan });
      if (!plan) {
        return res.status(404).json({ error: "Plan not found." });
      }
      shop.planName = plan.name;
      shop.subscriptionPlan = plan.price === 0 ? "free" : "premium";
      if (plan.price === 0) {
        shop.subscriptionStartDate = null;
        shop.subscriptionEndDate = null;
      } else {
        const startDate = new Date();
        let endDate;
        if (req.body.endDate !== undefined) {
          endDate = new Date(req.body.endDate);
          if (
            Number.isNaN(endDate.getTime()) ||
            endDate <= startDate
          ) {
            return res.status(400).json({
              error: "The end date must be a valid date in the future.",
            });
          }
        } else {
          const interval = req.body.interval || "monthly";
          if (!["monthly", "yearly"].includes(interval)) {
            return res.status(400).json({
              error: "Invalid billing period. Must be 'monthly' or 'yearly'.",
            });
          }
          endDate = new Date(startDate);
          endDate.setMonth(
            endDate.getMonth() + (interval === "yearly" ? 12 : 1)
          );
        }
        shop.subscriptionStartDate = startDate;
        shop.subscriptionEndDate = endDate;
      }
      await shop.save();
      return res.json(shop);
    }

    // Legacy: { subscriptionPlan: "free" | "premium" }. Kept so older
    // clients keep working; planName follows when it can.
    const { subscriptionPlan } = req.body;
    if (!["free", "premium"].includes(subscriptionPlan)) {
      return res.status(400).json({
        error: "Invalid plan. Send a plan name, or 'free' / 'premium'.",
      });
    }
    shop.subscriptionPlan = subscriptionPlan;
    if (subscriptionPlan === "free") {
      shop.planName = "Free";
      shop.subscriptionStartDate = null;
      shop.subscriptionEndDate = null;
    } else if (!shop.planName || shop.planName === "Free") {
      // Paid, but no specific plan was named — display only.
      shop.planName = "Premium";
    }
    await shop.save();
    res.json(shop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a shop by ID
const deleteShop = async (req, res) => {
  try {
    // const shop = await Shop.findByIdAndDelete(req.params.id);
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });

    if (
      shop.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }
    const deletedShop = await Shop.findByIdAndDelete(req.params.id);
    res.json(deletedShop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get products of a specific shop
const getShopProducts = async (req, res) => {
  try {
    const shopId = req.params.id;
    const products = await Product.find({ shop: shopId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getShopOrders = async (req, res) => {
  try {
    const shopId = req.params.id;

    // Find orders for the shop
    const orders = await Order.find({ shop: shopId })
      .populate("shop")
      .populate("products.product")
      .populate("createdBy", "name email");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createShop,
  getShops,
  updateShop,
  updateShopPlan,
  deleteShop,
  getShop,
  getShopProducts,
  getShopOrders,
  getShopByUserID,
};
