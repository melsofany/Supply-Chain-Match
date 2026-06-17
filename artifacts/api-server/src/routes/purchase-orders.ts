import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customerPosTable, supplierPosTable, customersTable, suppliersTable } from "@workspace/db";
import {
  CreateCustomerPoBody,
  GetCustomerPoParams,
  UpdateCustomerPoParams,
  UpdateCustomerPoBody,
  UpdateCustomerPoResponse,
  CreateSupplierPoBody,
  GetSupplierPoParams,
  UpdateSupplierPoParams,
  UpdateSupplierPoBody,
  UpdateSupplierPoResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseAmount(v: string | null | undefined): number | null {
  return v != null ? Number(v) : null;
}

// ─── CUSTOMER POs ─────────────────────────────────────────────────────────────

router.get("/customer-pos", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: customerPosTable.id,
      customerId: customerPosTable.customerId,
      customerName: customersTable.name,
      quotationId: customerPosTable.quotationId,
      poNumber: customerPosTable.poNumber,
      status: customerPosTable.status,
      totalAmount: customerPosTable.totalAmount,
      notes: customerPosTable.notes,
      createdAt: customerPosTable.createdAt,
    })
    .from(customerPosTable)
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .orderBy(customerPosTable.createdAt);

  res.json(rows.map((r) => ({ ...r, totalAmount: parseAmount(r.totalAmount) })));
});

router.post("/customer-pos", async (req, res): Promise<void> => {
  const parsed = CreateCustomerPoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [po] = await db.insert(customerPosTable).values(parsed.data).returning();
  res.status(201).json({ ...po, customerName: null, totalAmount: parseAmount(po.totalAmount) });
});

router.get("/customer-pos/:id", async (req, res): Promise<void> => {
  const params = GetCustomerPoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [po] = await db
    .select({
      id: customerPosTable.id,
      customerId: customerPosTable.customerId,
      customerName: customersTable.name,
      quotationId: customerPosTable.quotationId,
      poNumber: customerPosTable.poNumber,
      status: customerPosTable.status,
      totalAmount: customerPosTable.totalAmount,
      notes: customerPosTable.notes,
      createdAt: customerPosTable.createdAt,
    })
    .from(customerPosTable)
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .where(eq(customerPosTable.id, params.data.id));

  if (!po) {
    res.status(404).json({ error: "Customer PO not found" });
    return;
  }
  res.json({ ...po, totalAmount: parseAmount(po.totalAmount) });
});

router.patch("/customer-pos/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerPoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCustomerPoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [po] = await db
    .update(customerPosTable)
    .set(parsed.data)
    .where(eq(customerPosTable.id, params.data.id))
    .returning();
  if (!po) {
    res.status(404).json({ error: "Customer PO not found" });
    return;
  }
  res.json(UpdateCustomerPoResponse.parse({ ...po, customerName: null, totalAmount: parseAmount(po.totalAmount) }));
});

// ─── SUPPLIER POs ─────────────────────────────────────────────────────────────

router.get("/supplier-pos", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: supplierPosTable.id,
      supplierId: supplierPosTable.supplierId,
      supplierName: suppliersTable.name,
      customerPoId: supplierPosTable.customerPoId,
      poNumber: supplierPosTable.poNumber,
      status: supplierPosTable.status,
      totalAmount: supplierPosTable.totalAmount,
      notes: supplierPosTable.notes,
      createdAt: supplierPosTable.createdAt,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id))
    .orderBy(supplierPosTable.createdAt);

  res.json(rows.map((r) => ({ ...r, totalAmount: parseAmount(r.totalAmount) })));
});

router.post("/supplier-pos", async (req, res): Promise<void> => {
  const parsed = CreateSupplierPoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [po] = await db.insert(supplierPosTable).values(parsed.data).returning();
  res.status(201).json({ ...po, supplierName: null, totalAmount: parseAmount(po.totalAmount) });
});

router.get("/supplier-pos/:id", async (req, res): Promise<void> => {
  const params = GetSupplierPoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [po] = await db
    .select({
      id: supplierPosTable.id,
      supplierId: supplierPosTable.supplierId,
      supplierName: suppliersTable.name,
      customerPoId: supplierPosTable.customerPoId,
      poNumber: supplierPosTable.poNumber,
      status: supplierPosTable.status,
      totalAmount: supplierPosTable.totalAmount,
      notes: supplierPosTable.notes,
      createdAt: supplierPosTable.createdAt,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id))
    .where(eq(supplierPosTable.id, params.data.id));

  if (!po) {
    res.status(404).json({ error: "Supplier PO not found" });
    return;
  }
  res.json({ ...po, totalAmount: parseAmount(po.totalAmount) });
});

router.patch("/supplier-pos/:id", async (req, res): Promise<void> => {
  const params = UpdateSupplierPoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSupplierPoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [po] = await db
    .update(supplierPosTable)
    .set(parsed.data)
    .where(eq(supplierPosTable.id, params.data.id))
    .returning();
  if (!po) {
    res.status(404).json({ error: "Supplier PO not found" });
    return;
  }
  res.json(UpdateSupplierPoResponse.parse({ ...po, supplierName: null, totalAmount: parseAmount(po.totalAmount) }));
});

export default router;
