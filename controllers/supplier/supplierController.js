const PurchaseOrder = require("../../model/PurchaseOrder");
const Supplier = require("../../model/Supplier");
const { findCallerShop, hasRole } = require("../../utils/shopAccess");
const {
  logAudit,
  describeChanges,
} = require("../../utils/auditLog");

const pickFields = (body) => ({
  name: body.name,
  contactPerson: body.contactPerson,
  email: body.email,
  phone: body.phone,
  address: body.address,
  notes: body.notes,
});

// Create a new supplier for the caller's shop (staff+; viewers read-only)
const createSupplier = async (req, res) => {
  try {
    const { shop, role } = await findCallerShop(req.user._id);
    if (!shop) {
      return res.status(403).json({ message: "You don't have a shop" });
    }
    if (!hasRole(role, "staff")) {
      return res
        .status(403)
        .json({ message: "Viewers cannot add suppliers." });
    }

    const supplier = new Supplier({
      ...pickFields(req.body),
      shop: shop._id,
    });
    await supplier.save();
    await logAudit({
      shop: shop._id,
      actor: req.user._id,
      action: "supplier.created",
      entityType: "supplier",
      entityId: supplier._id,
      entityName: supplier.name,
      details: supplier.contactPerson
        ? `Contact: ${supplier.contactPerson}`
        : undefined,
    });
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// List the caller's shop suppliers (newest first). No shop yet means an
// empty list, not an error — the client shows its empty state.
const getSuppliers = async (req, res) => {
  try {
    const { shop } = await findCallerShop(req.user._id);
    if (!shop) return res.json([]);
    const suppliers = await Supplier.find({ shop: shop._id }).sort({
      createdAt: -1,
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a supplier by ID (access checked by middleware)
const getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a supplier by ID (access checked by middleware)
const updateSupplier = async (req, res) => {
  try {
    const existing = await Supplier.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Supplier not found" });
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      pickFields(req.body),
      { new: true, runValidators: true }
    );
    await logAudit({
      shop: supplier.shop,
      actor: req.user._id,
      action: "supplier.updated",
      entityType: "supplier",
      entityId: supplier._id,
      entityName: supplier.name,
      details:
        describeChanges(existing, supplier, [
          { key: "name", label: "Name" },
          { key: "contactPerson", label: "Contact" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "address", label: "Address" },
        ]) || "Updated",
    });
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a supplier by ID (access checked by middleware). A supplier with
// purchase orders cannot be deleted — its orders would lose their supplier.
const deleteSupplier = async (req, res) => {
  try {
    const orderCount = await PurchaseOrder.countDocuments({
      supplier: req.params.id,
    });
    if (orderCount > 0) {
      return res.status(400).json({
        error: `Cannot delete this supplier: ${orderCount} purchase order${
          orderCount === 1 ? " references" : "s reference"
        } it. Delete those orders first.`,
      });
    }
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    await logAudit({
      shop: supplier.shop,
      actor: req.user._id,
      action: "supplier.deleted",
      entityType: "supplier",
      entityId: supplier._id,
      entityName: supplier.name,
    });
    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
};
