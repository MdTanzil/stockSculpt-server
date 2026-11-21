const Shop = require("../model/Shop");
const ShopMember = require("../model/ShopMember");

// Role levels, weakest to strongest. "owner" is not a ShopMember role —
// it is derived from Shop.owner. Platform admins bypass shop checks
// entirely (handled by the middlewares, as before).
const ROLE_LEVELS = { viewer: 1, staff: 2, manager: 3, owner: 4 };

const hasRole = (role, minimum) =>
  Boolean(role) && ROLE_LEVELS[role] >= ROLE_LEVELS[minimum];

// The caller's role in a given shop: "owner" / "manager" / "staff" /
// "viewer" / null (no access).
const getShopRole = async (userId, shop) => {
  if (shop.owner.toString() === userId.toString()) return "owner";
  const membership = await ShopMember.findOne({
    shop: shop._id,
    user: userId,
  });
  return membership ? membership.role : null;
};

// The shop the caller works in: the shop they own, else the first shop
// they are a staff member of. Returns { shop, role } or
// { shop: null, role: null }. A user who is staff in several shops works
// in the first membership found (documented limitation).
const findCallerShop = async (userId) => {
  const owned = await Shop.findOne({ owner: userId });
  if (owned) return { shop: owned, role: "owner" };
  const membership = await ShopMember.findOne({ user: userId }).populate(
    "shop"
  );
  if (membership && membership.shop) {
    return { shop: membership.shop, role: membership.role };
  }
  return { shop: null, role: null };
};

module.exports = { ROLE_LEVELS, hasRole, getShopRole, findCallerShop };
