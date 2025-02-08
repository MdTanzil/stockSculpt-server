const Subscription = require("../../model/Subscription");

// Create a new subscription
const createSubscription = async (req, res) => {
  try {
    const { shop, plan, endDate, paymentStatus } = req.body;

    // Validate plan type
    if (!["free", "premium"].includes(plan)) {
      return res.status(400).json({ message: "Invalid subscription plan" });
    }

    // Create subscription
    const subscription = new Subscription({
      shop,
      plan,
      endDate: plan === "premium" ? endDate : null,
      paymentStatus,
    });

    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ message: "Error creating subscription", error });
  }
};

// Get all subscriptions
const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().populate("shop");
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscriptions", error });
  }
};

// Get a single subscription by ID
const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id).populate(
      "shop"
    );
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subscription", error });
  }
};

// Update a subscription
const updateSubscription = async (req, res) => {
  try {
    const updatedSubscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedSubscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    res.json(updatedSubscription);
  } catch (error) {
    res.status(500).json({ message: "Error updating subscription", error });
  }
};

// Delete a subscription
const deleteSubscription = async (req, res) => {
  try {
    const deletedSubscription = await Subscription.findByIdAndDelete(
      req.params.id
    );
    if (!deletedSubscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    res.json({ message: "Subscription deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting subscription", error });
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
};
