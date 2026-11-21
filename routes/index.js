const router = require("express").Router();
const userRouter = require("./userRoutes");
const productRouter = require("./productRouter");
const shopRouter = require("./shopRouter");
const shopMemberRouter = require("./shopMemberRouter");
const orderRouter = require("./orderRouter");
const purchaseOrderRouter = require("./purchaseOrderRouter");
const reportRouter = require("./reportRouter");
const subscriptionsRouter = require("./subscriptionRoutes");
const supplierRouter = require("./supplierRouter");
const authRouter = require("./authRouter");
const adminRouter = require("./adminRouter");
const paymentRouter = require("./paymentRouter");
const planRouter = require("./planRouter");

// Add routes to the router
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/shop", shopRouter);
router.use("/shop", shopMemberRouter);
router.use("/order", orderRouter);
router.use("/purchase-orders", purchaseOrderRouter);
router.use("/reports", reportRouter);
router.use("/suppliers", supplierRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use(paymentRouter);
router.use("/plans", planRouter);

module.exports = router;
