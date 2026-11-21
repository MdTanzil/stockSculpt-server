const Payment = require("../../model/Payment");
const Plan = require("../../model/Plan");
const Shop = require("../../model/Shop");
const Subscription = require("../../model/Subscription");
const { findCallerShop } = require("../../utils/shopAccess");

// The Stripe secret key lives in the STRIPE_SECRET_KEY env var (set in
// Vercel). Until it is set, the client is null and both endpoints answer
// 503 instead of crashing at import time — the payment page shows a
// "payments are not set up yet" notice in that state. Use the TEST secret
// key (sk_test_...) from the same Stripe account as the test publishable
// key in the client, so the demo test cards work.
const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /create-payment-intent { price, plan, interval } -> { clientSecret }
// Creates a Stripe PaymentIntent for the plan price. The price is
// looked up from the plan in the database — never trusted from the
// client — so a tampered request cannot buy premium for $0.01, and an
// admin price change takes effect in payments immediately. The client
// confirms the intent with the card details; no card data ever reaches us.
const createPaymentIntent = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error:
          "Payments are not set up yet. The shop owner needs to add the Stripe secret key.",
      });
    }
    const { price, plan, interval } = req.body;
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "A valid price is required." });
    }
    const planDoc = await Plan.findOne({ name: plan, active: true });
    if (!planDoc) {
      return res
        .status(400)
        .json({ error: "Unknown plan. Please pick a plan again." });
    }
    const expected =
      interval === "yearly" ? planDoc.yearlyPrice : planDoc.price;
    if (
      expected === undefined ||
      expected === null ||
      Math.round(amount * 100) !== Math.round(expected * 100)
    ) {
      return res.status(400).json({
        error: "That price does not match the plan. Please pick a plan again.",
      });
    }
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        email: req.user.email,
        plan,
        interval: interval === "yearly" ? "yearly" : "monthly",
      },
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /payments { email, price, transactionId, plan, interval }
// Called by the client after Stripe confirms the payment. Verifies the
// PaymentIntent with Stripe, records the payment, and activates the
// premium plan on the caller's shop for one month (or one year).
const recordPayment = async (req, res) => {
  try {
    // Without the secret key the payment cannot be verified with
    // Stripe — and an unverified payment must never activate a plan,
    // or anyone could claim premium with a made-up transaction id.
    if (!stripe) {
      return res.status(503).json({
        error:
          "Payments are not set up yet. The shop owner needs to add the Stripe secret key.",
      });
    }
    const { email, price, transactionId, plan, interval } = req.body;
    if (!transactionId || !Number.isFinite(Number(price))) {
      return res
        .status(400)
        .json({ error: "A transaction id and price are required." });
    }
    const billingInterval = interval === "yearly" ? "yearly" : "monthly";

    // Never record (or activate from) the same Stripe payment twice —
    // a retry or double submit returns the original record.
    const existing = await Payment.findOne({ transactionId });
    if (existing) {
      return res.json({ paymentResult: { insertedId: existing._id } });
    }

    // Verify with Stripe that this payment actually succeeded before
    // trusting the client.
    const intent = await stripe.paymentIntents.retrieve(transactionId);
    if (intent.status !== "succeeded") {
      return res.status(400).json({ error: "This payment did not succeed." });
    }

    const { shop } = await findCallerShop(req.user._id);
    const payment = await Payment.create({
      user: req.user._id,
      shop: shop ? shop._id : null,
      email: email || req.user.email,
      plan: plan || null,
      interval: billingInterval,
      price: Number(price),
      transactionId,
      status: "paid",
    });

    // A successful payment activates the premium plan on the shop and
    // records a paid subscription for the billing period. Paying again
    // while a subscription is still running extends it from its current
    // end date instead of restarting the clock.
    if (shop) {
      const months = billingInterval === "yearly" ? 12 : 1;
      const current = await Subscription.findOne({ shop: shop._id });
      const startDate =
        current && current.endDate && new Date(current.endDate) > new Date()
          ? current.startDate
          : new Date();
      const endDate =
        current && current.endDate && new Date(current.endDate) > new Date()
          ? new Date(current.endDate)
          : new Date();
      endDate.setMonth(endDate.getMonth() + months);
      await Subscription.findOneAndUpdate(
        { shop: shop._id },
        {
          plan: "premium",
          startDate,
          endDate,
          paymentStatus: "paid",
        },
        { upsert: true, new: true }
      );
      shop.subscriptionPlan = "premium";
      if (plan) shop.planName = plan;
      // The shop carries the live period, so the owner can see their
      // expiry date without a separate subscription lookup.
      shop.subscriptionStartDate = startDate;
      shop.subscriptionEndDate = endDate;
      await shop.save();
    }

    // paymentResult.insertedId is the shape the client checks for.
    res.json({ paymentResult: { insertedId: payment._id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createPaymentIntent, recordPayment };
