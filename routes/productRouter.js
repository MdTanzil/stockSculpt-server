const router = require("express").Router();

router.get("", () => {
  return res.send("from stocks js route file");
});

module.exports = router;
