const router = require("express").Router();
const {
  getSummary,
  getSalesByProduct,
  getSalesByCategory,
  getSalesByMonth,
  getInventory,
} = require("../controllers/report/reportController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requirePremium } = require("../middlewares/requirePremium");

// Reports are a paid feature: every route here needs a signed-in user
// on a premium plan. All endpoints are read-only and scoped to the
// caller's shop. Sales endpoints accept ?from=YYYY-MM-DD&to=YYYY-MM-DD;
// the inventory report is point-in-time and ignores the range.
router.use(authenticateUser, requirePremium);

router.get("/summary", getSummary);
router.get("/sales-by-product", getSalesByProduct);
router.get("/sales-by-category", getSalesByCategory);
router.get("/sales-by-month", getSalesByMonth);
router.get("/inventory", getInventory);

module.exports = router;
