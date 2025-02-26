const bcrypt = require("bcrypt");
const { User } = require("../../model");

// Create a new user (POST /api/users)
const createUser = async (req, res) => {
  try {
    const { name, email, password, avatar, dateOfBirth, role, provider } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res
        .status(200)
        .json({ message: "User already exists", user: existingUser });
    }

    // Hash the password before saving
    let hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    let avatarUrl = null;
    if (typeof avatar === "string") {
      avatarUrl = avatar;
    } else if (avatar && typeof avatar === "object") {
      console.warn("Invalid avatar format received:", avatar);
    }

    // Create user data object
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      avatar: avatarUrl, // Stores only valid URLs or null
      dateOfBirth,
      role: role || "user",
      provider,
    });

    // Save user to database
    await newUser.save();

    await newUser.save();
    res.status(201).json({
      message: "User created successfully",
      user: { ...newUser.toObject(), password: undefined },
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({ error: error.message });
  }
};

// Get all users (GET /api/users)
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); // Exclude passwords

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user by ID (GET /api/users/:id)
const getUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("-password"); // Exclude password from response

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user by ID (PUT /api/users/:id)
const updateUser = async (req, res) => {
  try {
    const { name, avatar, dateOfBirth, role, isActive } = req.body;
    const userId = req.params.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, avatar, dateOfBirth, role, isActive },
      { new: true, runValidators: true }
    ).select("-password"); // Exclude password from response

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete user by ID (DELETE /api/users/:id)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createUser, getUsers, updateUser, deleteUser, getUser };
