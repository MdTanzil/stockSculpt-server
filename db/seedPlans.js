const Plan = require("../model/Plan");

// The plans stockSculpt launched with. Seeded once, the first time the
// server starts with an empty plans collection — after that the admin
// owns the plans (Manage Plans page) and this never runs again.
const SHARED_FEATURES = [
  "Inventory & stock tracking",
  "Point of sale (POS)",
  "Barcode scanning",
  "Reports & export",
  "Suppliers & purchase orders",
  "Staff roles",
];

const DEFAULT_PLANS = [
  {
    name: "Free",
    description: "Try stockSculpt with your first products, no card needed.",
    price: 0,
    productLimit: 3,
    features: ["Up to 3 products", ...SHARED_FEATURES],
    popular: false,
    order: 0,
  },
  {
    name: "Starter",
    description: "For small shops getting organised.",
    price: 10,
    yearlyPrice: 100,
    productLimit: 200,
    features: ["Up to 200 products", ...SHARED_FEATURES],
    popular: false,
    order: 1,
  },
  {
    name: "Company",
    description: "For growing shops with a bigger catalogue.",
    price: 20,
    yearlyPrice: 200,
    productLimit: 450,
    features: ["Up to 450 products", ...SHARED_FEATURES],
    popular: true,
    order: 2,
  },
  {
    name: "Enterprise",
    description: "For large shops with a wide range.",
    price: 50,
    yearlyPrice: 500,
    productLimit: 1500,
    features: ["Up to 1,500 products", ...SHARED_FEATURES],
    popular: false,
    order: 3,
  },
];

const seedPlans = async () => {
  try {
    const count = await Plan.countDocuments();
    if (count > 0) return;
    await Plan.insertMany(DEFAULT_PLANS);
    console.log("✅ Seeded default subscription plans");
  } catch (error) {
    console.error("❌ Failed to seed subscription plans:", error.message);
  }
};

module.exports = { seedPlans };
