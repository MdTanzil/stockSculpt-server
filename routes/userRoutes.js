const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getUser,
} = require("../controllers/user/userController");
const router = require("express").Router();

// some controllers import

router.post("/", createUser); // Create user
router.get("/", getUsers); // Get all users
router.get("/:id", getUser); // Get a  users
router.put("/:id", updateUser); // Update user by ID
router.delete("/:id", deleteUser); // Delete user by ID

module.exports = router;
