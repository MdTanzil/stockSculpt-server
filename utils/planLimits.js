const Plan = require("../model/Plan");

// How many products a shop's plan allows. Looked up from the plans
// collection by the shop's plan name, so an admin changing a plan's
// limit takes effect without a code change. Falls back to the free
// plan's limit when the shop's plan is unknown (renamed or deleted).
const getPlanProductLimit = async (shop) => {
  if (shop?.planName) {
    const plan = await Plan.findOne({ name: shop.planName });
    if (plan) return plan.productLimit;
  }
  const freePlan = await Plan.findOne({ price: 0 });
  if (freePlan) return freePlan.productLimit;
  return 3;
};

module.exports = { getPlanProductLimit };
