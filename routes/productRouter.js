const router = require("express").Router();
const {
  createProduct,
  importProducts,
  getProducts,
  updateProduct,
  deleteProduct,
  getProduct,
  getProductByBarcode,
} = require("../controllers/product/productController");
const Product = require("../model/Product");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requirePremium } = require("../middlewares/requirePremium");
const { requireResourceRole } = require("../middlewares/shopRole");

router.post("/", authenticateUser, createProduct); // Create product (staff+)
router.post("/import", authenticateUser, importProducts); // Bulk import products from CSV (staff+)
router.get("/", authenticateUser, getProducts); // Get all products
// NOTE: the barcode route must stay BEFORE /:id, or Express would treat
// "barcode" as a product id.
router.get("/barcode/:code", authenticateUser, requirePremium, getProductByBarcode); // Find a product in the caller's shop by barcode (any team member)
router.get("/:id", authenticateUser, getProduct); // get product by ID
router.put(
  "/:id",
  authenticateUser,
  requireResourceRole(Product, "staff", "Product"),
  updateProduct
); // Update product by ID (staff+)
router.delete(
  "/:id",
  authenticateUser,
  requireResourceRole(Product, "manager", "Product"),
  deleteProduct
); // Delete product by ID (manager+)

module.exports = router;
