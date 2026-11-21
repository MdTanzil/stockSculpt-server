const Plan = require("../../model/Plan");

// Picks and validates the plan fields from a request body. Returns
// { fields } on success or { error } with a friendly message.
const cleanPlanInput = (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "A plan name is required." };
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return { error: "The monthly price must be 0 or more." };
  }
  let yearlyPrice;
  if (body.yearlyPrice !== undefined && body.yearlyPrice !== null && body.yearlyPrice !== "") {
    yearlyPrice = Number(body.yearlyPrice);
    if (!Number.isFinite(yearlyPrice) || yearlyPrice < 0) {
      return { error: "The yearly price must be 0 or more." };
    }
  }
  const productLimit = Number(body.productLimit);
  if (!Number.isInteger(productLimit) || productLimit < 0) {
    return { error: "The product limit must be a whole number, 0 or more." };
  }
  const features = Array.isArray(body.features)
    ? body.features.map((f) => String(f).trim()).filter(Boolean)
    : [];
  return {
    fields: {
      name,
      description: typeof body.description === "string" ? body.description.trim() : "",
      price,
      yearlyPrice,
      productLimit,
      features,
      popular: body.popular === true,
      active: body.active !== false,
      order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
    },
  };
};

// GET /plans — public. The active plans, in display order. Prices are
// public information, so the home page pricing section uses this too.
const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ active: true }).sort({ order: 1, price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /plans/all — admin. Every plan, including inactive ones.
const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort({ order: 1, price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /plans — admin.
const createPlan = async (req, res) => {
  try {
    const { fields, error } = cleanPlanInput(req.body);
    if (error) return res.status(400).json({ error });
    const plan = await Plan.create(fields);
    res.status(201).json(plan);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "A plan with that name already exists." });
    }
    res.status(500).json({ error: error.message });
  }
};

// PUT /plans/:id — admin.
const updatePlan = async (req, res) => {
  try {
    const { fields, error } = cleanPlanInput(req.body);
    if (error) return res.status(400).json({ error });
    const plan = await Plan.findByIdAndUpdate(req.params.id, fields, {
      new: true,
      runValidators: true,
    });
    if (!plan) return res.status(404).json({ error: "Plan not found." });
    res.json(plan);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "A plan with that name already exists." });
    }
    res.status(500).json({ error: error.message });
  }
};

// DELETE /plans/:id — admin. Existing subscriptions and payments keep
// their own records; only the plan itself is removed.
const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found." });
    res.json({ message: "Plan deleted." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPlans, getAllPlans, createPlan, updatePlan, deletePlan };
