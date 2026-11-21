const router = require("express").Router();
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProduct,
} = require("../controllers/product/productController");
const Product = require("../model/Product");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { requireResourceRole } = require("../middlewares/shopRole");

router.post("/", authenticateUser, createProduct); // Create product (staff+)
router.get("/", authenticateUser, getProducts); // Get all products
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
