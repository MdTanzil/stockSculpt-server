const router = require("express").Router();
const {
  getPlans,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
} = require("../controllers/plan/planController");
const { authenticateUser } = require("../middlewares/authMiddleware");
const { authorizeRoles } = require("../middlewares/roleMiddleware");

// Plans are public information — anyone can list the active ones
// (the home page pricing section does). Only admins can see inactive
// plans or change anything.
router.get("/", getPlans);
router.get(
  "/all",
  authenticateUser,
  authorizeRoles(["admin"]),
  getAllPlans
);
router.post("/", authenticateUser, authorizeRoles(["admin"]), createPlan);
router.put("/:id", authenticateUser, authorizeRoles(["admin"]), updatePlan);
router.delete("/:id", authenticateUser, authorizeRoles(["admin"]), deletePlan);

module.exports = router;
