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
const { requireResourceRole } = require("../middlewares/shopRole");

router.post("/", authenticateUser, createSupplier); // Create supplier (staff+)
router.get("/", authenticateUser, getSuppliers); // List own shop's suppliers
router.get(
  "/:id",
  authenticateUser,
  requireResourceRole(Supplier, "viewer", "Supplier"),
  getSupplier
); // Get supplier by ID
router.put(
  "/:id",
  authenticateUser,
  requireResourceRole(Supplier, "staff", "Supplier"),
  updateSupplier
); // Update supplier by ID (staff+)
router.delete(
  "/:id",
  authenticateUser,
  requireResourceRole(Supplier, "manager", "Supplier"),
  deleteSupplier
); // Delete supplier by ID (manager+)

module.exports = router;
