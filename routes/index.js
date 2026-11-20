const router = require("express").Router();
const userRouter = require("./userRoutes");
const productRouter = require("./productRouter");
const shopRouter = require("./shopRouter");
const orderRouter = require("./orderRouter");
const purchaseOrderRouter = require("./purchaseOrderRouter");
const subscriptionsRouter = require("./subscriptionRoutes");
const supplierRouter = require("./supplierRouter");
const authRouter = require("./authRouter");
const adminRouter = require("./adminRouter");

// Add routes to the router
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/shop", shopRouter);
router.use("/order", orderRouter);
router.use("/purchase-orders", purchaseOrderRouter);
router.use("/suppliers", supplierRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);

module.exports = router;
