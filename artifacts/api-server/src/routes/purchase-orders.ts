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

function enrichSupplierPo(po: {
  totalAmount: string | null;
  taxInsuranceRate: string;
  operatingCost: string;
  [key: string]: any;
}) {
  const grossCost = po.totalAmount != null ? Number(po.totalAmount) : 0;
  const taxInsuranceRate = Number(po.taxInsuranceRate);
  const operatingCost = Number(po.operatingCost);
  const taxInsuranceAmount = Math.round(grossCost * taxInsuranceRate * 100) / 100;
  const totalCost = Math.round((grossCost + taxInsuranceAmount + operatingCost) * 100) / 100;

  return {
    ...po,
    totalAmount: parseAmount(po.totalAmount),
    taxInsuranceRate,
    operatingCost,
    taxInsuranceAmount,
    totalCost,
  };
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
  const ins: any = { ...parsed.data };
  if (ins.totalAmount != null) ins.totalAmount = String(ins.totalAmount);
  const [po] = await db.insert(customerPosTable).values(ins).returning();
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
  const upd: any = { ...parsed.data };
  if (upd.totalAmount != null) upd.totalAmount = String(upd.totalAmount);
  const [po] = await db
    .update(customerPosTable)
    .set(upd)
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
      taxInsuranceRate: supplierPosTable.taxInsuranceRate,
      operatingCost: supplierPosTable.operatingCost,
      notes: supplierPosTable.notes,
      createdAt: supplierPosTable.createdAt,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id))
    .orderBy(supplierPosTable.createdAt);

  res.json(rows.map((r) => enrichSupplierPo(r)));
});

router.post("/supplier-pos", async (req, res): Promise<void> => {
  const parsed = CreateSupplierPoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const ins: any = { ...parsed.data };
  if (ins.totalAmount != null) ins.totalAmount = String(ins.totalAmount);
  if (ins.taxInsuranceRate != null) ins.taxInsuranceRate = String(ins.taxInsuranceRate);
  if (ins.operatingCost != null) ins.operatingCost = String(ins.operatingCost);
  const [po] = await db.insert(supplierPosTable).values(ins).returning();
  res.status(201).json(enrichSupplierPo({ ...po, supplierName: null }));
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
      taxInsuranceRate: supplierPosTable.taxInsuranceRate,
      operatingCost: supplierPosTable.operatingCost,
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
  res.json(enrichSupplierPo(po));
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
  const upd: any = { ...parsed.data };
  if (upd.totalAmount != null) upd.totalAmount = String(upd.totalAmount);
  if (upd.taxInsuranceRate != null) upd.taxInsuranceRate = String(upd.taxInsuranceRate);
  if (upd.operatingCost != null) upd.operatingCost = String(upd.operatingCost);
  const [po] = await db
    .update(supplierPosTable)
    .set(upd)
    .where(eq(supplierPosTable.id, params.data.id))
    .returning();
  if (!po) {
    res.status(404).json({ error: "Supplier PO not found" });
    return;
  }
  res.json(UpdateSupplierPoResponse.parse(enrichSupplierPo({ ...po, supplierName: null })));
});

export default router;
