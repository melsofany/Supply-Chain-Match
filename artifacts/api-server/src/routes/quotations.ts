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
import { validate, parseAmount } from "../lib/route-helpers";

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
    totalAmount: parseAmount(quotation.totalAmount),
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
    totalAmount: parseAmount(q.totalAmount),
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
  const data = validate(CreateQuotationBody, req.body);
  const insertData: any = { ...data };
  if (insertData.totalAmount != null) insertData.totalAmount = String(insertData.totalAmount);
  const [quotation] = await db.insert(quotationsTable).values(insertData).returning();
  res.status(201).json({ ...quotation, totalAmount: parseAmount(quotation.totalAmount) });
});

router.get("/quotations/:id", async (req, res): Promise<void> => {
  const { id } = validate(GetQuotationParams, req.params);
  const result = await buildQuotationWithItems(id);
  if (!result) { res.status(404).json({ error: "Quotation not found" }); return; }
  res.json(result);
});

router.patch("/quotations/:id", async (req, res): Promise<void> => {
  const { id } = validate(UpdateQuotationParams, req.params);
  const data = validate(UpdateQuotationBody, req.body);
  const updateData: any = { ...data };
  if (updateData.totalAmount != null) updateData.totalAmount = String(updateData.totalAmount);
  const [quotation] = await db
    .update(quotationsTable)
    .set(updateData)
    .where(eq(quotationsTable.id, id))
    .returning();
  if (!quotation) { res.status(404).json({ error: "Quotation not found" }); return; }
  res.json(UpdateQuotationResponse.parse({ ...quotation, totalAmount: parseAmount(quotation.totalAmount) }));
});

router.delete("/quotations/:id", async (req, res): Promise<void> => {
  const { id } = validate(DeleteQuotationParams, req.params);
  await db.delete(quotationItemsTable).where(eq(quotationItemsTable.quotationId, id));
  const [quotation] = await db.delete(quotationsTable).where(eq(quotationsTable.id, id)).returning();
  if (!quotation) { res.status(404).json({ error: "Quotation not found" }); return; }
  res.sendStatus(204);
});

router.post("/quotations/:id/items", async (req, res): Promise<void> => {
  const { id } = validate(AddQuotationItemParams, req.params);
  const data = validate(AddQuotationItemBody, req.body);
  const itemInsert: any = {
    ...data,
    quotationId: id,
    quantity: String(data.quantity),
    unitPrice: String(data.unitPrice),
  };
  const [item] = await db.insert(quotationItemsTable).values(itemInsert).returning();

  const [quotation] = await db
    .select({ customerId: quotationsTable.customerId })
    .from(quotationsTable)
    .where(eq(quotationsTable.id, id));

  await logPriceHistory({
    itemDescription: data.description,
    supplierId: data.supplierId ?? null,
    customerId: quotation?.customerId ?? null,
    quotationId: id,
    unitPrice: Number(data.unitPrice),
    quantity: Number(data.quantity),
    unit: data.unit ?? null,
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
  const { id, itemId } = validate(UpdateQuotationItemParams, req.params);
  const data = validate(UpdateQuotationItemBody, req.body);
  const itemUpdate: any = { ...data };
  if (itemUpdate.quantity != null) itemUpdate.quantity = String(itemUpdate.quantity);
  if (itemUpdate.unitPrice != null) itemUpdate.unitPrice = String(itemUpdate.unitPrice);
  const [item] = await db
    .update(quotationItemsTable)
    .set(itemUpdate)
    .where(eq(quotationItemsTable.id, itemId))
    .returning();
  if (!item) { res.status(404).json({ error: "Quotation item not found" }); return; }

  if (data.unitPrice != null || data.description != null) {
    const [quotation] = await db
      .select({ customerId: quotationsTable.customerId })
      .from(quotationsTable)
      .where(eq(quotationsTable.id, id));

    await logPriceHistory({
      itemDescription: item.description,
      supplierId: item.supplierId ?? null,
      customerId: quotation?.customerId ?? null,
      quotationId: id,
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
  const { itemId } = validate(DeleteQuotationItemParams, req.params);
  const [item] = await db
    .delete(quotationItemsTable)
    .where(eq(quotationItemsTable.id, itemId))
    .returning();
  if (!item) { res.status(404).json({ error: "Quotation item not found" }); return; }
  res.sendStatus(204);
});

router.post("/quotations/:id/approve", async (req, res): Promise<void> => {
  const { id } = validate(ApproveQuotationParams, req.params);
  const [quotation] = await db
    .update(quotationsTable)
    .set({ status: "approved" })
    .where(eq(quotationsTable.id, id))
    .returning();
  if (!quotation) { res.status(404).json({ error: "Quotation not found" }); return; }

  await db
    .update(itemPriceHistoryTable)
    .set({ resultedInPo: true })
    .where(eq(itemPriceHistoryTable.quotationId, id));

  res.json(ApproveQuotationResponse.parse({ ...quotation, totalAmount: parseAmount(quotation.totalAmount) }));
});

router.post("/quotations/:id/reject", async (req, res): Promise<void> => {
  const { id } = validate(RejectQuotationParams, req.params);
  const [quotation] = await db
    .update(quotationsTable)
    .set({ status: "rejected" })
    .where(eq(quotationsTable.id, id))
    .returning();
  if (!quotation) { res.status(404).json({ error: "Quotation not found" }); return; }

  await db
    .update(itemPriceHistoryTable)
    .set({ resultedInPo: false })
    .where(eq(itemPriceHistoryTable.quotationId, id));

  res.json(RejectQuotationResponse.parse({ ...quotation, totalAmount: parseAmount(quotation.totalAmount) }));
});

export default router;
