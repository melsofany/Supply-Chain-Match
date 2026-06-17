import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, inquiriesTable, inquiryItemsTable, customersTable } from "@workspace/db";
import {
  CreateInquiryBody,
  GetInquiryParams,
  UpdateInquiryParams,
  UpdateInquiryBody,
  UpdateInquiryResponse,
  DeleteInquiryParams,
  AddInquiryItemParams,
  AddInquiryItemBody,
  UpdateInquiryItemParams,
  UpdateInquiryItemBody,
  UpdateInquiryItemResponse,
  DeleteInquiryItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildInquiryWithItems(id: number) {
  const [inquiry] = await db
    .select({
      id: inquiriesTable.id,
      customerId: inquiriesTable.customerId,
      customerName: customersTable.name,
      title: inquiriesTable.title,
      description: inquiriesTable.description,
      status: inquiriesTable.status,
      createdAt: inquiriesTable.createdAt,
    })
    .from(inquiriesTable)
    .leftJoin(customersTable, eq(inquiriesTable.customerId, customersTable.id))
    .where(eq(inquiriesTable.id, id));

  if (!inquiry) return null;

  const items = await db
    .select()
    .from(inquiryItemsTable)
    .where(eq(inquiryItemsTable.inquiryId, id));

  return {
    ...inquiry,
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
    })),
  };
}

router.get("/inquiries", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: inquiriesTable.id,
      customerId: inquiriesTable.customerId,
      customerName: customersTable.name,
      title: inquiriesTable.title,
      description: inquiriesTable.description,
      status: inquiriesTable.status,
      createdAt: inquiriesTable.createdAt,
    })
    .from(inquiriesTable)
    .leftJoin(customersTable, eq(inquiriesTable.customerId, customersTable.id))
    .orderBy(inquiriesTable.createdAt);

  const allItems = await db.select().from(inquiryItemsTable);

  const result = rows.map((inquiry) => ({
    ...inquiry,
    items: allItems
      .filter((item) => item.inquiryId === inquiry.id)
      .map((item) => ({ ...item, quantity: Number(item.quantity) })),
  }));

  res.json(result);
});

router.post("/inquiries", async (req, res): Promise<void> => {
  const parsed = CreateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [inquiry] = await db.insert(inquiriesTable).values(parsed.data).returning();
  res.status(201).json({ ...inquiry });
});

router.get("/inquiries/:id", async (req, res): Promise<void> => {
  const params = GetInquiryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await buildInquiryWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Inquiry not found" });
    return;
  }
  res.json(result);
});

router.patch("/inquiries/:id", async (req, res): Promise<void> => {
  const params = UpdateInquiryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [inquiry] = await db
    .update(inquiriesTable)
    .set(parsed.data)
    .where(eq(inquiriesTable.id, params.data.id))
    .returning();
  if (!inquiry) {
    res.status(404).json({ error: "Inquiry not found" });
    return;
  }
  res.json(UpdateInquiryResponse.parse(inquiry));
});

router.delete("/inquiries/:id", async (req, res): Promise<void> => {
  const params = DeleteInquiryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(inquiryItemsTable).where(eq(inquiryItemsTable.inquiryId, params.data.id));
  const [inquiry] = await db.delete(inquiriesTable).where(eq(inquiriesTable.id, params.data.id)).returning();
  if (!inquiry) {
    res.status(404).json({ error: "Inquiry not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/inquiries/:id/items", async (req, res): Promise<void> => {
  const params = AddInquiryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddInquiryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const itemIns: any = { ...parsed.data, inquiryId: params.data.id };
  if (itemIns.quantity != null) itemIns.quantity = String(itemIns.quantity);
  const [item] = await db.insert(inquiryItemsTable).values(itemIns).returning();
  res.status(201).json({ ...item, quantity: Number(item.quantity) });
});

router.patch("/inquiries/:id/items/:itemId", async (req, res): Promise<void> => {
  const params = UpdateInquiryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateInquiryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const itemUpd: any = { ...parsed.data };
  if (itemUpd.quantity != null) itemUpd.quantity = String(itemUpd.quantity);
  const [item] = await db
    .update(inquiryItemsTable)
    .set(itemUpd)
    .where(eq(inquiryItemsTable.id, params.data.itemId))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Inquiry item not found" });
    return;
  }
  res.json(UpdateInquiryItemResponse.parse({ ...item, quantity: Number(item.quantity) }));
});

router.delete("/inquiries/:id/items/:itemId", async (req, res): Promise<void> => {
  const params = DeleteInquiryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [item] = await db
    .delete(inquiryItemsTable)
    .where(eq(inquiryItemsTable.id, params.data.itemId))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Inquiry item not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
