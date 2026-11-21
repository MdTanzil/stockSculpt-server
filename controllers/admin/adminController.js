const Order = require("../../model/Order");
const Product = require("../../model/Product");
const Shop = require("../../model/Shop");
const User = require("../../model/User");
const models = require("../../model");
const { getIndexErrors } = require("../../db");

// Admin overview stats (GET /api/admin/state)
const getAdminState = async (req, res) => {
  try {
    const [totalProducts, totalOrders, totalShops, totalUsers, income] =
      await Promise.all([
        Product.countDocuments(),
        Order.countDocuments(),
        Shop.countDocuments(),
        User.countDocuments(),
        Order.aggregate([
          { $match: { orderStatus: "completed" } },
          {
            $group: {
              _id: null,
              totalIncome: { $sum: "$totalPrice" },
              totalSales: { $sum: 1 },
            },
          },
        ]),
      ]);

    res.json({
      totalIncome: income[0]?.totalIncome || 0,
      totalSales: income[0]?.totalSales || 0,
      totalProducts,
      totalOrders,
      totalShops,
      totalUsers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// TEMPORARY diagnostic (GET /api/admin/indexes, admin only): list every
// collection's indexes plus any index-creation errors recorded at startup.
// Added to diagnose the missing unique barcode index — remove once the
// issue is resolved.
const getIndexes = async (req, res) => {
  try {
    const indexes = {};
    for (const [name, model] of Object.entries(models)) {
      try {
        indexes[name] = await model.collection.getIndexes();
      } catch (error) {
        indexes[name] = { error: error.message };
      }
    }
    res.json({ indexes, indexErrors: getIndexErrors() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAdminState, getIndexes };
