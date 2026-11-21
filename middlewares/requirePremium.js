const { findCallerShop } = require("../utils/shopAccess");

// Paid-only features (point of sale, barcode scanning, reports,
// suppliers, purchase orders, staff roles) require a premium plan on
// the caller's shop. Free shops get a 403 naming the upgrade, so the
// client can show an upgrade prompt instead of a generic error. The
// check runs after authenticateUser (req.user must be set) and uses
// findCallerShop, which also applies the subscription-expiry check —
// a shop past its grace period is already Free here.
const requirePremium = async (req, res, next) => {
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop || shop.subscriptionPlan !== "premium") {
      return res.status(403).json({
        error: "This feature requires a paid plan. Upgrade to unlock it.",
        code: "PREMIUM_REQUIRED",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { requirePremium };
