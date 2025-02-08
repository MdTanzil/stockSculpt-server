const router = require("express").Router();
const userRouter = require("./userRoutes");
const productRouter = require("./productRouter");

// Add routes to the router
router.use("/users", userRouter);
router.use("/products", productRouter);

module.exports = router;
