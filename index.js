const express = require("express");
const app = express();
const port = 3000;
// const dbConnect = require("./db");
const routes = require("./routes");
const { dbConnect } = require("./db");
const { User } = require("./model");

app.use(express.json());
app.get("/", (req, res) => {
  res.send("server alive ");
});

app.use("/api", routes);

app.listen(port, () => {
  dbConnect();
  console.log(`Example app listening on port ${port}`);
});
