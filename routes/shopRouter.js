const router = require("express").Router();

const {
  createShop,
  getShops,
  updateShop,
  deleteShop,
} = require("../controllers/shop/shopController");

router.post("/", createShop); // Create shop
router.get("/", getShops); // Get all shops
router.put("/:id", updateShop); // Update shop by ID
router.delete("/:id", deleteShop); // Delete shop by ID

module.exports = router;
