const express = require("express");
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
} = require("../controllers/user/userController");
const router = require("express").Router();

// some controllers import

router.post("/", createUser); // Create user
router.get("", getUsers); // Get all users
router.put("/:id", updateUser); // Update user by ID
router.delete("/:id", deleteUser); // Delete user by ID

module.exports = router;
