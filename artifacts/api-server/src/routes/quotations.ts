import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db, quotationsTable, quotationItemsTable, customersTable, suppliersTable,
  itemPriceHistoryTable,
} from "@workspace/db";
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

async function logPriceHistory(data: {
  itemDescription: string;
  supplierId?: number | null;
  customerId?: number | null;
  quotationId?: number | null;
  unitPrice: number;
  quantity?: number | null;
  unit?: string | null;
  resultedInPo?: boolean;
}) {
  await db.insert(itemPriceHistoryTable).values({
    itemDescription: data.itemDescription,
    supplierId: data.supplierId ?? null,
    customerId: data.customerId ?? null,
    quotationId: data.quotationId ?? null,
    unitPrice: String(data.unitPrice),
    quantity: data.quantity != null ? String(data.quantity) : null,
    unit: data.unit ?? null,
    resultedInPo: data.resultedInPo ?? false,
  });
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
  const insertData: any = { ...parsed.data };
  if (insertData.totalAmount != null) insertData.totalAmount = String(insertData.totalAmount);
  const [quotation] = await db.insert(quotationsTable).values(insertData).returning();
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
  const updateData: any = { ...parsed.data };
  if (updateData.totalAmount != null) updateData.totalAmount = String(updateData.totalAmount);
  const [quotation] = await db
    .update(quotationsTable)
    .set(updateData)
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

  const itemInsert: any = {
    ...parsed.data,
    quotationId: params.data.id,
    quantity: String(parsed.data.quantity),
    unitPrice: String(parsed.data.unitPrice),
  };
  const [item] = await db.insert(quotationItemsTable).values(itemInsert).returning();

  // Get customer ID from quotation for history logging
  const [quotation] = await db
    .select({ customerId: quotationsTable.customerId })
    .from(quotationsTable)
    .where(eq(quotationsTable.id, params.data.id));

  // Auto-log to price history
  await logPriceHistory({
    itemDescription: parsed.data.description,
    supplierId: parsed.data.supplierId ?? null,
    customerId: quotation?.customerId ?? null,
    quotationId: params.data.id,
    unitPrice: Number(parsed.data.unitPrice),
    quantity: Number(parsed.data.quantity),
    unit: parsed.data.unit ?? null,
    resultedInPo: false,
  });

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
  const itemUpdate: any = { ...parsed.data };
  if (itemUpdate.quantity != null) itemUpdate.quantity = String(itemUpdate.quantity);
  if (itemUpdate.unitPrice != null) itemUpdate.unitPrice = String(itemUpdate.unitPrice);
  const [item] = await db
    .update(quotationItemsTable)
    .set(itemUpdate)
    .where(eq(quotationItemsTable.id, params.data.itemId))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Quotation item not found" });
    return;
  }

  // If price or description changed, log a new history entry
  if (parsed.data.unitPrice != null || parsed.data.description != null) {
    const [quotation] = await db
      .select({ customerId: quotationsTable.customerId })
      .from(quotationsTable)
      .where(eq(quotationsTable.id, params.data.id));

    await logPriceHistory({
      itemDescription: item.description,
      supplierId: item.supplierId ?? null,
      customerId: quotation?.customerId ?? null,
      quotationId: params.data.id,
      unitPrice: Number(item.unitPrice),
      quantity: Number(item.quantity),
      unit: item.unit ?? null,
      resultedInPo: false,
    });
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

  // Mark price history entries for this quotation as resulted_in_po = true
  await db
    .update(itemPriceHistoryTable)
    .set({ resultedInPo: true })
    .where(eq(itemPriceHistoryTable.quotationId, params.data.id));

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

  // Ensure price history entries stay as resulted_in_po = false (rejected = no PO issued)
  await db
    .update(itemPriceHistoryTable)
    .set({ resultedInPo: false })
    .where(eq(itemPriceHistoryTable.quotationId, params.data.id));

  res.json(RejectQuotationResponse.parse({ ...quotation, totalAmount: quotation.totalAmount != null ? Number(quotation.totalAmount) : null }));
});

export default router;
