// Subscription expiry: grace period and automatic cancellation.
//
// A paid subscription that reaches its end date is not cancelled at
// once. The shop gets a 5-day grace period to pay, and only when the
// grace period runs out is the subscription cancelled automatically
// (the shop drops back to the Free plan).
//
// There is no background job on this serverless backend, so the check
// runs lazily: every read of a shop applies it, which means any shop
// past its grace period is already Free by the time anyone sees it.

const GRACE_DAYS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const graceEndDate = (endDate) =>
  new Date(new Date(endDate).getTime() + GRACE_DAYS * MS_PER_DAY);

// "free" | "active" | "grace" | "expired". Pure — no database access,
// so it can be unit-tested with plain objects.
const getSubscriptionState = (shop, now = new Date()) => {
  if (!shop || shop.subscriptionPlan !== "premium") return "free";
  if (!shop.subscriptionEndDate) return "active";
  const end = new Date(shop.subscriptionEndDate);
  if (Number.isNaN(end.getTime())) return "active";
  if (now <= end) return "active";
  if (now <= graceEndDate(end)) return "grace";
  return "expired";
};

// If the shop's grace period has run out, cancel the subscription:
// back to the Free plan with no dates. Returns the (possibly updated)
// shop document. Only writes when a cancellation is actually due.
const maybeExpireSubscription = async (shop) => {
  if (!shop || getSubscriptionState(shop) !== "expired") return shop;
  shop.subscriptionPlan = "free";
  shop.planName = "Free";
  shop.subscriptionStartDate = null;
  shop.subscriptionEndDate = null;
  await shop.save();
  return shop;
};

module.exports = {
  GRACE_DAYS,
  graceEndDate,
  getSubscriptionState,
  maybeExpireSubscription,
};
