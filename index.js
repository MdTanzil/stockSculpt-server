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

app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.send("server alive ");
});

app.use("/api", routes);

app.listen(port, () => {
  dbConnect();
  console.log(`Example app listening on port ${port}`);
});

dbConnect();

module.exports = app;
