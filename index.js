const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
// const dbConnect = require("./db");
const routes = require("./routes");
const { dbConnect } = require("./db");
const { User } = require("./model");
const { corsOptions } = require("./config/cors");

const port = 3000;

// Start connecting (and creating indexes) at module load; every request
// waits for that to finish before being routed, so no handler can run
// before the unique indexes exist. On warm instances the promise is
// already resolved, so this costs nothing.
const dbReady = dbConnect();
app.use(async (req, res, next) => {
  await dbReady;
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.send("server alive ");
});

app.use("/api", routes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

module.exports = app;
