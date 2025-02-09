const router = require("express").Router();
const userRouter = require("./userRoutes");
const productRouter = require("./productRouter");
const shopRouter = require("./shopRouter");
const orderRouter = require("./orderRouter");
const subscriptionsRouter = require("./subscriptionRoutes");
const authRouter = require("./authRouter");

// Add routes to the router
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/shop", shopRouter);
router.use("/order", orderRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/auth", authRouter);

module.exports = router;
