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
import { validate } from "../lib/route-helpers";

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
    items: items.map((item) => ({ ...item, quantity: Number(item.quantity) })),
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
  const data = validate(CreateInquiryBody, req.body);
  const [inquiry] = await db.insert(inquiriesTable).values(data).returning();
  res.status(201).json({ ...inquiry });
});

router.get("/inquiries/:id", async (req, res): Promise<void> => {
  const { id } = validate(GetInquiryParams, req.params);
  const result = await buildInquiryWithItems(id);
  if (!result) { res.status(404).json({ error: "Inquiry not found" }); return; }
  res.json(result);
});

router.patch("/inquiries/:id", async (req, res): Promise<void> => {
  const { id } = validate(UpdateInquiryParams, req.params);
  const data = validate(UpdateInquiryBody, req.body);
  const [inquiry] = await db
    .update(inquiriesTable)
    .set(data)
    .where(eq(inquiriesTable.id, id))
    .returning();
  if (!inquiry) { res.status(404).json({ error: "Inquiry not found" }); return; }
  res.json(UpdateInquiryResponse.parse(inquiry));
});

router.delete("/inquiries/:id", async (req, res): Promise<void> => {
  const { id } = validate(DeleteInquiryParams, req.params);
  await db.delete(inquiryItemsTable).where(eq(inquiryItemsTable.inquiryId, id));
  const [inquiry] = await db.delete(inquiriesTable).where(eq(inquiriesTable.id, id)).returning();
  if (!inquiry) { res.status(404).json({ error: "Inquiry not found" }); return; }
  res.sendStatus(204);
});

router.post("/inquiries/:id/items", async (req, res): Promise<void> => {
  const { id } = validate(AddInquiryItemParams, req.params);
  const data = validate(AddInquiryItemBody, req.body);
  const itemIns: any = { ...data, inquiryId: id };
  if (itemIns.quantity != null) itemIns.quantity = String(itemIns.quantity);
  const [item] = await db.insert(inquiryItemsTable).values(itemIns).returning();
  res.status(201).json({ ...item, quantity: Number(item.quantity) });
});

router.patch("/inquiries/:id/items/:itemId", async (req, res): Promise<void> => {
  const { itemId } = validate(UpdateInquiryItemParams, req.params);
  const data = validate(UpdateInquiryItemBody, req.body);
  const itemUpd: any = { ...data };
  if (itemUpd.quantity != null) itemUpd.quantity = String(itemUpd.quantity);
  const [item] = await db
    .update(inquiryItemsTable)
    .set(itemUpd)
    .where(eq(inquiryItemsTable.id, itemId))
    .returning();
  if (!item) { res.status(404).json({ error: "Inquiry item not found" }); return; }
  res.json(UpdateInquiryItemResponse.parse({ ...item, quantity: Number(item.quantity) }));
});

router.delete("/inquiries/:id/items/:itemId", async (req, res): Promise<void> => {
  const { itemId } = validate(DeleteInquiryItemParams, req.params);
  const [item] = await db
    .delete(inquiryItemsTable)
    .where(eq(inquiryItemsTable.id, itemId))
    .returning();
  if (!item) { res.status(404).json({ error: "Inquiry item not found" }); return; }
  res.sendStatus(204);
});

export default router;
