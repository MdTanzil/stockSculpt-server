const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getUser,
} = require("../controllers/user/userController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");
const router = require("express").Router();

// Registration stays public (createUser always creates role "user").
// Every other user endpoint is admin-only: reading, changing or deleting
// users must not be possible for ordinary users or anonymous callers.
router.post("/", createUser); // Create user
router.get("/", authenticateUser, authorizeRoles(["admin"]), getUsers); // Get all users
router.get("/:id", authenticateUser, authorizeRoles(["admin"]), getUser); // Get a user
router.put("/:id", authenticateUser, authorizeRoles(["admin"]), updateUser); // Update user by ID
router.delete("/:id", authenticateUser, authorizeRoles(["admin"]), deleteUser); // Delete user by ID

module.exports = router;
