import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customerPosTable, supplierPosTable, customersTable, suppliersTable, quotationItemsTable, quotationsTable } from "@workspace/db";
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
import { validate, parseAmount } from "../lib/route-helpers";
import { sendPoWhatsApp } from "../lib/whatsapp";

const router: IRouter = Router();

function enrichSupplierPo(po: {
  totalAmount: string | null;
  insuranceRate: string;
  vatRate: string;
  withholdingTaxRate: string;
  stampDutyRate: string;
  operatingCost: string;
  [key: string]: any;
}) {
  const grossCost = po.totalAmount != null ? Number(po.totalAmount) : 0;
  const insuranceRate = Number(po.insuranceRate);
  const vatRate = Number(po.vatRate);
  const withholdingTaxRate = Number(po.withholdingTaxRate);
  const stampDutyRate = Number(po.stampDutyRate);
  const operatingCost = Number(po.operatingCost);

  const insuranceAmount = Math.round(grossCost * insuranceRate * 100) / 100;
  const vatAmount = Math.round(grossCost * vatRate * 100) / 100;
  // خصم تحت حساب الضريبة — يُخصَم من المورد ويُورَّد لمصلحة الضرائب
  const withholdingTaxAmount = Math.round(grossCost * withholdingTaxRate * 100) / 100;
  // ضريبة الدمغة — تكلفة إضافية على العقد
  const stampDutyAmount = Math.round(grossCost * stampDutyRate * 100) / 100;
  const totalCost = Math.round(
    (grossCost + insuranceAmount + vatAmount + withholdingTaxAmount + stampDutyAmount + operatingCost) * 100
  ) / 100;

  return {
    ...po,
    totalAmount: parseAmount(po.totalAmount),
    insuranceRate,
    vatRate,
    withholdingTaxRate,
    stampDutyRate,
    operatingCost,
    insuranceAmount,
    vatAmount,
    withholdingTaxAmount,
    stampDutyAmount,
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
      quotationNumber: quotationsTable.quotationNumber,
      poNumber: customerPosTable.poNumber,
      status: customerPosTable.status,
      totalAmount: customerPosTable.totalAmount,
      notes: customerPosTable.notes,
      createdAt: customerPosTable.createdAt,
    })
    .from(customerPosTable)
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .leftJoin(quotationsTable, eq(customerPosTable.quotationId, quotationsTable.id))
    .orderBy(customerPosTable.createdAt);

  res.json(rows.map((r) => ({ ...r, totalAmount: parseAmount(r.totalAmount) })));
});

router.post("/customer-pos", async (req, res): Promise<void> => {
  const data = validate(CreateCustomerPoBody, req.body);
  const ins: any = { ...data };
  if (ins.totalAmount != null) ins.totalAmount = String(ins.totalAmount);
  const [po] = await db.insert(customerPosTable).values(ins).returning();

  if (data.quotationId) {
    const items = await db
      .select({
        supplierId: quotationItemsTable.supplierId,
        quantity: quotationItemsTable.quantity,
        unitPrice: quotationItemsTable.unitPrice,
      })
      .from(quotationItemsTable)
      .where(eq(quotationItemsTable.quotationId, data.quotationId));

    const supplierTotals = new Map<number, number>();
    for (const item of items) {
      if (item.supplierId == null) continue;
      const lineTotal = Number(item.quantity) * Number(item.unitPrice);
      supplierTotals.set(item.supplierId, (supplierTotals.get(item.supplierId) ?? 0) + lineTotal);
    }

    for (const [supplierId, totalAmount] of supplierTotals.entries()) {
      await db.insert(supplierPosTable).values({
        supplierId,
        customerPoId: po.id,
        status: "draft",
        totalAmount: String(Math.round(totalAmount * 100) / 100),
      });
    }
  }

  res.status(201).json({ ...po, customerName: null, totalAmount: parseAmount(po.totalAmount) });
});

router.get("/customer-pos/:id", async (req, res): Promise<void> => {
  const { id } = validate(GetCustomerPoParams, req.params);
  const [po] = await db
    .select({
      id: customerPosTable.id,
      customerId: customerPosTable.customerId,
      customerName: customersTable.name,
      quotationId: customerPosTable.quotationId,
      quotationNumber: quotationsTable.quotationNumber,
      poNumber: customerPosTable.poNumber,
      status: customerPosTable.status,
      totalAmount: customerPosTable.totalAmount,
      notes: customerPosTable.notes,
      createdAt: customerPosTable.createdAt,
    })
    .from(customerPosTable)
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .leftJoin(quotationsTable, eq(customerPosTable.quotationId, quotationsTable.id))
    .where(eq(customerPosTable.id, id));

  if (!po) { res.status(404).json({ error: "Customer PO not found" }); return; }
  res.json({ ...po, totalAmount: parseAmount(po.totalAmount) });
});

router.patch("/customer-pos/:id", async (req, res): Promise<void> => {
  const { id } = validate(UpdateCustomerPoParams, req.params);
  const data = validate(UpdateCustomerPoBody, req.body);
  const upd: any = { ...data };
  if (upd.totalAmount != null) upd.totalAmount = String(upd.totalAmount);
  const [po] = await db
    .update(customerPosTable)
    .set(upd)
    .where(eq(customerPosTable.id, id))
    .returning();
  if (!po) { res.status(404).json({ error: "Customer PO not found" }); return; }
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
      insuranceRate: supplierPosTable.insuranceRate,
      vatRate: supplierPosTable.vatRate,
      withholdingTaxRate: supplierPosTable.withholdingTaxRate,
      stampDutyRate: supplierPosTable.stampDutyRate,
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
  const data = validate(CreateSupplierPoBody, req.body);
  const ins: any = { ...data };
  if (ins.totalAmount != null) ins.totalAmount = String(ins.totalAmount);
  if (ins.insuranceRate != null) ins.insuranceRate = String(ins.insuranceRate);
  if (ins.vatRate != null) ins.vatRate = String(ins.vatRate);
  if (ins.withholdingTaxRate != null) ins.withholdingTaxRate = String(ins.withholdingTaxRate);
  if (ins.stampDutyRate != null) ins.stampDutyRate = String(ins.stampDutyRate);
  if (ins.operatingCost != null) ins.operatingCost = String(ins.operatingCost);
  const [po] = await db.insert(supplierPosTable).values(ins).returning();
  res.status(201).json(enrichSupplierPo({ ...po, supplierName: null }));
});

router.get("/supplier-pos/:id", async (req, res): Promise<void> => {
  const { id } = validate(GetSupplierPoParams, req.params);
  const [po] = await db
    .select({
      id: supplierPosTable.id,
      supplierId: supplierPosTable.supplierId,
      supplierName: suppliersTable.name,
      customerPoId: supplierPosTable.customerPoId,
      poNumber: supplierPosTable.poNumber,
      status: supplierPosTable.status,
      totalAmount: supplierPosTable.totalAmount,
      insuranceRate: supplierPosTable.insuranceRate,
      vatRate: supplierPosTable.vatRate,
      withholdingTaxRate: supplierPosTable.withholdingTaxRate,
      stampDutyRate: supplierPosTable.stampDutyRate,
      operatingCost: supplierPosTable.operatingCost,
      notes: supplierPosTable.notes,
      createdAt: supplierPosTable.createdAt,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id))
    .where(eq(supplierPosTable.id, id));

  if (!po) { res.status(404).json({ error: "Supplier PO not found" }); return; }
  res.json(enrichSupplierPo(po));
});

router.patch("/supplier-pos/:id", async (req, res): Promise<void> => {
  const { id } = validate(UpdateSupplierPoParams, req.params);
  const data = validate(UpdateSupplierPoBody, req.body);
  const upd: any = { ...data };
  if (upd.totalAmount != null) upd.totalAmount = String(upd.totalAmount);
  if (upd.insuranceRate != null) upd.insuranceRate = String(upd.insuranceRate);
  if (upd.vatRate != null) upd.vatRate = String(upd.vatRate);
  if (upd.withholdingTaxRate != null) upd.withholdingTaxRate = String(upd.withholdingTaxRate);
  if (upd.stampDutyRate != null) upd.stampDutyRate = String(upd.stampDutyRate);
  if (upd.operatingCost != null) upd.operatingCost = String(upd.operatingCost);
  const [po] = await db
    .update(supplierPosTable)
    .set(upd)
    .where(eq(supplierPosTable.id, id))
    .returning();
  if (!po) { res.status(404).json({ error: "Supplier PO not found" }); return; }
  res.json(UpdateSupplierPoResponse.parse(enrichSupplierPo({ ...po, supplierName: null })));
});

// POST /api/supplier-pos/:id/send-whatsapp — إرسال أمر التوريد بواتساب
router.post("/supplier-pos/:id/send-whatsapp", async (req, res): Promise<void> => {
  const { id } = validate(GetSupplierPoParams, req.params);

  const [po] = await db
    .select({
      id: supplierPosTable.id,
      supplierId: supplierPosTable.supplierId,
      supplierName: suppliersTable.name,
      supplierPhone: suppliersTable.phone,
      poNumber: supplierPosTable.poNumber,
      totalAmount: supplierPosTable.totalAmount,
      notes: supplierPosTable.notes,
      status: supplierPosTable.status,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id))
    .where(eq(supplierPosTable.id, id));

  if (!po) { res.status(404).json({ error: "Supplier PO not found" }); return; }

  if (!po.supplierPhone) {
    res.status(400).json({
      status: "no_phone",
      reason: `المورد "${po.supplierName}" ليس لديه رقم هاتف مسجّل`,
    });
    return;
  }

  try {
    await sendPoWhatsApp({
      phone: po.supplierPhone,
      supplierName: po.supplierName ?? "المورد",
      poNumber: po.poNumber ?? `PO-${po.id}`,
      totalAmount: Number(po.totalAmount ?? 0),
      notes: po.notes,
      companyName: process.env.COMPANY_NAME,
    });

    await db
      .update(supplierPosTable)
      .set({ status: po.status === "draft" ? "sent" : po.status })
      .where(eq(supplierPosTable.id, id));

    res.json({ poId: id, supplierName: po.supplierName, status: "sent", reason: null });
  } catch (err: any) {
    res.status(500).json({
      poId: id,
      supplierName: po.supplierName,
      status: "failed",
      reason: err.message ?? "WhatsApp send failed",
    });
  }
});

export default router;
