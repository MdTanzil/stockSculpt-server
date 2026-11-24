const ShopMember = require("../../model/ShopMember");
const User = require("../../model/User");
const { logAudit } = require("../../utils/auditLog");

const MEMBER_ROLES = ["manager", "staff", "viewer"];

// List a shop's team: the owner plus all staff members. The owner row is
// built from the shop (req.shop comes from the requireShopRole middleware),
// so the client shows the whole team in one table.
const getMembers = async (req, res) => {
  try {
    const shop = req.shop;
    const owner = await User.findById(shop.owner).select("name email avatar");
    const members = await ShopMember.find({ shop: shop._id })
      .populate("user", "name email avatar")
      .sort({ createdAt: 1 });
    res.json({
      owner: owner
        ? {
            user: owner,
            role: "owner",
            createdAt: shop.createdAt,
          }
        : null,
      members,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a staff member by email. The person must already have an account —
// there is no email service, so no invitation email is sent; once added,
// the shop simply appears in their dashboard when they sign in.
const addMember = async (req, res) => {
  try {
    const shop = req.shop;
    const { email, role } = req.body;

    if (!MEMBER_ROLES.includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be 'manager', 'staff' or 'viewer'.",
      });
    }
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "An email address is required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        error:
          "No account with that email address. Ask them to sign up first.",
      });
    }
    if (user._id.toString() === shop.owner.toString()) {
      return res
        .status(400)
        .json({ error: "The shop owner already has full access." });
    }

    const existing = await ShopMember.findOne({ shop: shop._id, user: user._id });
    if (existing) {
      return res
        .status(400)
        .json({ error: "This person is already a staff member." });
    }

    const member = new ShopMember({
      shop: shop._id,
      user: user._id,
      role,
      invitedBy: req.user._id,
    });
    await member.save();
    await member.populate("user", "name email avatar");
    await logAudit({
      shop: shop._id,
      actor: req.user._id,
      action: "staff.added",
      entityType: "staff",
      entityId: user._id,
      entityName: user.name || user.email,
      details: `Role: ${role}`,
    });
    res.status(201).json(member);
  } catch (error) {
    // Unique-index race: same user added twice at once.
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "This person is already a staff member." });
    }
    res.status(500).json({ error: error.message });
  }
};

// Change a staff member's role.
const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!MEMBER_ROLES.includes(role)) {
      return res.status(400).json({
        error: "Invalid role. Must be 'manager', 'staff' or 'viewer'.",
      });
    }
    const member = await ShopMember.findOne({
      _id: req.params.memberId,
      shop: req.shop._id,
    }).populate("user", "name email avatar");
    if (!member) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    const oldRole = member.role;
    member.role = role;
    await member.save();
    await logAudit({
      shop: req.shop._id,
      actor: req.user._id,
      action: "staff.role_changed",
      entityType: "staff",
      entityId: member.user._id,
      entityName: member.user.name || member.user.email,
      details: `Role ${oldRole} → ${role}`,
    });
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove a staff member from the shop. Their account is untouched — they
// simply lose access to this shop.
const removeMember = async (req, res) => {
  try {
    const member = await ShopMember.findOneAndDelete({
      _id: req.params.memberId,
      shop: req.shop._id,
    });
    if (!member) {
      return res.status(404).json({ error: "Staff member not found" });
    }
    const removedUser = await User.findById(member.user).select("name email");
    await logAudit({
      shop: req.shop._id,
      actor: req.user._id,
      action: "staff.removed",
      entityType: "staff",
      entityId: member.user,
      entityName: removedUser?.name || removedUser?.email || "Staff member",
      details: `Role was ${member.role}`,
    });
    res.json({ message: "Staff member removed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMembers, addMember, updateMemberRole, removeMember };
