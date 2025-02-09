const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
// const dbConnect = require("./db");
const routes = require("./routes");
const { dbConnect } = require("./db");
const { User } = require("./model");

const port = 3000;

app.use(express.json());
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("server alive ");
});

app.use("/api", routes);

app.listen(port, () => {
  dbConnect();
  console.log(`Example app listening on port ${port}`);
});
