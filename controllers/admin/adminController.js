const Order = require("../../model/Order");
const Product = require("../../model/Product");
const Shop = require("../../model/Shop");
const User = require("../../model/User");

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

module.exports = { getAdminState };
