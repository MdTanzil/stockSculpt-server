const AuditLog = require("../../model/AuditLog");

// List a shop's audit log, newest first. Any team member (viewer+) may
// read it — the route is guarded by requireShopRole("viewer").
// Filters: ?entityType=product|order|supplier|purchase_order|staff|shop
// &action=<action name>&actor=<user id>&from=YYYY-MM-DD&to=YYYY-MM-DD.
// Paged: ?page=1&limit=50 (limit capped at 100).
const getAuditLogs = async (req, res) => {
  try {
    const filter = { shop: req.params.id };
    const { entityType, action, actor, from, to } = req.query;
    if (entityType) filter.entityType = entityType;
    if (action) filter.action = action;
    if (actor) {
      if (!/^[0-9a-fA-F]{24}$/.test(actor)) {
        return res.status(400).json({ error: "Invalid actor id." });
      }
      filter.actor = actor;
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const start = new Date(from);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ error: "Invalid 'from' date." });
        }
        filter.createdAt.$gte = start;
      }
      if (to) {
        const end = new Date(to);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({ error: "Invalid 'to' date." });
        }
        // Include the whole "to" day.
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 50)
    );
    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter)
        .populate("actor", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    res.json({
      logs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAuditLogs };
