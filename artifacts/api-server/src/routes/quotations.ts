import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, quotationsTable, quotationItemsTable, customersTable, suppliersTable } from "@workspace/db";
import {
  CreateQuotationBody,
  GetQuotationParams,
  UpdateQuotationParams,
  UpdateQuotationBody,
  UpdateQuotationResponse,
  DeleteQuotationParams,
  AddQuotationItemParams,
  AddQuotationItemBody,
  UpdateQuotationItemParams,
  UpdateQuotationItemBody,
  UpdateQuotationItemResponse,
  DeleteQuotationItemParams,
  ApproveQuotationParams,
  ApproveQuotationResponse,
  RejectQuotationParams,
  RejectQuotationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildQuotationWithItems(id: number) {
  const [quotation] = await db
    .select({
      id: quotationsTable.id,
      inquiryId: quotationsTable.inquiryId,
      customerId: quotationsTable.customerId,
      customerName: customersTable.name,
      quotationNumber: quotationsTable.quotationNumber,
      status: quotationsTable.status,
      totalAmount: quotationsTable.totalAmount,
      validUntil: quotationsTable.validUntil,
      notes: quotationsTable.notes,
      createdAt: quotationsTable.createdAt,
    })
    .from(quotationsTable)
    .leftJoin(customersTable, eq(quotationsTable.customerId, customersTable.id))
    .where(eq(quotationsTable.id, id));

  if (!quotation) return null;

  const items = await db
    .select({
      id: quotationItemsTable.id,
      quotationId: quotationItemsTable.quotationId,
      supplierId: quotationItemsTable.supplierId,
      supplierName: suppliersTable.name,
      description: quotationItemsTable.description,
      quantity: quotationItemsTable.quantity,
      unit: quotationItemsTable.unit,
      unitPrice: quotationItemsTable.unitPrice,
      notes: quotationItemsTable.notes,
    })
    .from(quotationItemsTable)
    .leftJoin(suppliersTable, eq(quotationItemsTable.supplierId, suppliersTable.id))
    .where(eq(quotationItemsTable.quotationId, id));

  return {
    ...quotation,
    totalAmount: quotation.totalAmount != null ? Number(quotation.totalAmount) : null,
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.quantity) * Number(item.unitPrice),
    })),
  };
}

router.get("/quotations", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: quotationsTable.id,
      inquiryId: quotationsTable.inquiryId,
      customerId: quotationsTable.customerId,
      customerName: customersTable.name,
      quotationNumber: quotationsTable.quotationNumber,
      status: quotationsTable.status,
      totalAmount: quotationsTable.totalAmount,
      validUntil: quotationsTable.validUntil,
      notes: quotationsTable.notes,
      createdAt: quotationsTable.createdAt,
    })
    .from(quotationsTable)
    .leftJoin(customersTable, eq(quotationsTable.customerId, customersTable.id))
    .orderBy(quotationsTable.createdAt);

  const allItems = await db
    .select({
      id: quotationItemsTable.id,
      quotationId: quotationItemsTable.quotationId,
      supplierId: quotationItemsTable.supplierId,
      supplierName: suppliersTable.name,
      description: quotationItemsTable.description,
      quantity: quotationItemsTable.quantity,
      unit: quotationItemsTable.unit,
      unitPrice: quotationItemsTable.unitPrice,
      notes: quotationItemsTable.notes,
    })
    .from(quotationItemsTable)
    .leftJoin(suppliersTable, eq(quotationItemsTable.supplierId, suppliersTable.id));

  const result = rows.map((q) => ({
    ...q,
    totalAmount: q.totalAmount != null ? Number(q.totalAmount) : null,
    items: allItems
      .filter((item) => item.quotationId === q.id)
      .map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.quantity) * Number(item.unitPrice),
      })),
  }));

  res.json(result);
});

router.post("/quotations", async (req, res): Promise<void> => {
  const parsed = CreateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quotation] = await db.insert(quotationsTable).values(parsed.data).returning();
  res.status(201).json({ ...quotation, totalAmount: quotation.totalAmount != null ? Number(quotation.totalAmount) : null });
});

router.get("/quotations/:id", async (req, res): Promise<void> => {
  const params = GetQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await buildQuotationWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.json(result);
});

router.patch("/quotations/:id", async (req, res): Promise<void> => {
  const params = UpdateQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [quotation] = await db
    .update(quotationsTable)
    .set(parsed.data)
    .where(eq(quotationsTable.id, params.data.id))
    .returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.json(UpdateQuotationResponse.parse({ ...quotation, totalAmount: quotation.totalAmount != null ? Number(quotation.totalAmount) : null }));
});

router.delete("/quotations/:id", async (req, res): Promise<void> => {
  const params = DeleteQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(quotationItemsTable).where(eq(quotationItemsTable.quotationId, params.data.id));
  const [quotation] = await db.delete(quotationsTable).where(eq(quotationsTable.id, params.data.id)).returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quotations/:id/items", async (req, res): Promise<void> => {
  const params = AddQuotationItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddQuotationItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .insert(quotationItemsTable)
    .values({ ...parsed.data, quotationId: params.data.id })
    .returning();
  res.status(201).json({
    ...item,
    supplierName: null,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.quantity) * Number(item.unitPrice),
  });
});

router.patch("/quotations/:id/items/:itemId", async (req, res): Promise<void> => {
  const params = UpdateQuotationItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuotationItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db
    .update(quotationItemsTable)
    .set(parsed.data)
    .where(eq(quotationItemsTable.id, params.data.itemId))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Quotation item not found" });
    return;
  }
  res.json(UpdateQuotationItemResponse.parse({
    ...item,
    supplierName: null,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.quantity) * Number(item.unitPrice),
  }));
});

router.delete("/quotations/:id/items/:itemId", async (req, res): Promise<void> => {
  const params = DeleteQuotationItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .delete(quotationItemsTable)
    .where(eq(quotationItemsTable.id, params.data.itemId))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Quotation item not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/quotations/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quotation] = await db
    .update(quotationsTable)
    .set({ status: "approved" })
    .where(eq(quotationsTable.id, params.data.id))
    .returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.json(ApproveQuotationResponse.parse({ ...quotation, totalAmount: quotation.totalAmount != null ? Number(quotation.totalAmount) : null }));
});

router.post("/quotations/:id/reject", async (req, res): Promise<void> => {
  const params = RejectQuotationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [quotation] = await db
    .update(quotationsTable)
    .set({ status: "rejected" })
    .where(eq(quotationsTable.id, params.data.id))
    .returning();
  if (!quotation) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  res.json(RejectQuotationResponse.parse({ ...quotation, totalAmount: quotation.totalAmount != null ? Number(quotation.totalAmount) : null }));
});

export default router;
