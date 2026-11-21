const router = require("express").Router();
const {
  getSummary,
  getSalesByProduct,
  getSalesByCategory,
  getSalesByMonth,
  getInventory,
} = require("../controllers/report/reportController");
const { authenticateUser } = require("../middlewares/authMiddleware");

// All report endpoints are read-only and scoped to the caller's shop.
// Sales endpoints accept ?from=YYYY-MM-DD&to=YYYY-MM-DD; the inventory
// report is point-in-time and ignores the range.
router.get("/summary", authenticateUser, getSummary);
router.get("/sales-by-product", authenticateUser, getSalesByProduct);
router.get("/sales-by-category", authenticateUser, getSalesByCategory);
router.get("/sales-by-month", authenticateUser, getSalesByMonth);
router.get("/inventory", authenticateUser, getInventory);

module.exports = router;
