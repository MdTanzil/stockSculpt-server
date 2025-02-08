const router = require("express").Router();
const userRouter = require("./userRoutes");
const productRouter = require("./productRouter");
const shopRouter = require("./shopRouter");
const orderRouter = require("./orderRouter");
const subscriptionsRouter = require("./subscriptionRoutes");

// Add routes to the router
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/shop", shopRouter);
router.use("/order", orderRouter);
router.use("/subscriptions", subscriptionsRouter);

module.exports = router;
