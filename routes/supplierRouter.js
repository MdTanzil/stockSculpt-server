const router = require("express").Router();
const {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplier/supplierController");
const Supplier = require("../model/Supplier");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requirePremium } = require("../middlewares/requirePremium");
const { requireResourceRole } = require("../middlewares/shopRole");

// Suppliers are a paid feature: every route here needs a signed-in user
// on a premium plan.
router.use(authenticateUser, requirePremium);

router.post("/", createSupplier); // Create supplier (staff+)
router.get("/", getSuppliers); // List own shop's suppliers
router.get(
  "/:id",
  requireResourceRole(Supplier, "viewer", "Supplier"),
  getSupplier
); // Get supplier by ID
router.put(
  "/:id",
  requireResourceRole(Supplier, "staff", "Supplier"),
  updateSupplier
); // Update supplier by ID (staff+)
router.delete(
  "/:id",
  requireResourceRole(Supplier, "manager", "Supplier"),
  deleteSupplier
); // Delete supplier by ID (manager+)

module.exports = router;
