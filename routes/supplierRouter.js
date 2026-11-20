const router = require("express").Router();
const {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplier/supplierController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const {
  checkSupplierAccess,
} = require("../middlewares/checkSupplierAccess");

router.post("/", authenticateUser, createSupplier); // Create supplier
router.get("/", authenticateUser, getSuppliers); // List own shop's suppliers
router.get("/:id", authenticateUser, checkSupplierAccess, getSupplier); // Get supplier by ID
router.put("/:id", authenticateUser, checkSupplierAccess, updateSupplier); // Update supplier by ID
router.delete("/:id", authenticateUser, checkSupplierAccess, deleteSupplier); // Delete supplier by ID

module.exports = router;
