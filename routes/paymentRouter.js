const router = require("express").Router();
const {
  createPaymentIntent,
  recordPayment,
} = require("../controllers/payment/paymentController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// Stripe subscription payments. Both endpoints require a signed-in user.
// The client confirms the PaymentIntent directly with Stripe, then
// records the successful payment here so the shop's plan is activated.
router.post("/create-payment-intent", authenticateUser, createPaymentIntent);
router.post("/payments", authenticateUser, recordPayment);

module.exports = router;
