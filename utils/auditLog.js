const AuditLog = require("../model/AuditLog");

// Record one audit entry. Logging must never break the operation it
// describes, so a failed write is swallowed (and noted in the console)
// — callers await this and need no try/catch of their own.
const logAudit = async ({
  shop,
  actor,
  action,
  entityType,
  entityId,
  entityName,
  details,
}) => {
  try {
    if (!shop || !actor || !action || !entityType) return;
    await AuditLog.create({
      shop,
      actor,
      action,
      entityType,
      entityId,
      entityName,
      details,
    });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
};

// Describe what changed between two versions of a document, for the
// fields the caller cares about. Returns "" when nothing listed
// changed. Each changed field renders as "Label old → new" (money
// fields get a $ prefix; missing values show as "—").
const describeChanges = (before, after, fields) => {
  const parts = [];
  for (const { key, label, money } of fields) {
    const oldValue = before?.[key];
    const newValue = after?.[key];
    if (String(oldValue ?? "") === String(newValue ?? "")) continue;
    const show = (value) =>
      value === undefined || value === null || value === ""
        ? "—"
        : money
          ? `$${value}`
          : String(value);
    parts.push(`${label} ${show(oldValue)} → ${show(newValue)}`);
  }
  return parts.join("; ");
};

// The order number the UI shows: the last 6 characters of the _id.
const orderNumber = (id) => `#${id.toString().slice(-6).toUpperCase()}`;

module.exports = { logAudit, describeChanges, orderNumber };
