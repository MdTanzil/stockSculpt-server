const router = require("express").Router();
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProduct,
} = require("../controllers/product/productController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const {
  checkProductOwnership,
} = require("../middlewares/checkProductOwnership");

router.post("/", authenticateUser, createProduct); // Create product
router.get("/", authenticateUser, getProducts); // Get all products
router.get("/:id", authenticateUser, getProduct); // get product by ID
router.put("/:id", authenticateUser, checkProductOwnership, updateProduct); // Update product by ID
router.delete("/:id", authenticateUser, checkProductOwnership, deleteProduct); // Delete product by ID

module.exports = router;
