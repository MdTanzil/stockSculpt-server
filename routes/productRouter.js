const router = require("express").Router();
const {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
} = require("../controllers/product/productController");

router.post("/", createProduct); // Create product
router.get("/", getProducts); // Get all products
router.put("/:id", updateProduct); // Update product by ID
router.delete("/:id", deleteProduct); // Delete product by ID

module.exports = router;
