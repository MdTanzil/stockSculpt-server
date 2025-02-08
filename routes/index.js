const router = require("express").Router();

const userRouter = require("./userRoutes");

router.use("/users", userRouter);

module.exports = router;
