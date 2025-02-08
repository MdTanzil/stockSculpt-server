const router = require("express").Router();
const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
} = require("../controllers/subscription/subscriptionController");

router.post("/", createSubscription); // Create subscription
router.get("/", getSubscriptions); // Get all subscriptions
router.get("/:id", getSubscriptionById); // Get subscription by ID
router.put("/:id", updateSubscription); // Update subscription
router.delete("/:id", deleteSubscription); // Delete subscription

module.exports = router;
