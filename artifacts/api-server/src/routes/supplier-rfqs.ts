import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, supplierRfqsTable, suppliersTable, inquiriesTable } from "@workspace/db";

const router: IRouter = Router();

function parseAmount(v: string | null | undefined): number | null {
  return v != null ? Number(v) : null;
}

function enrichRfq(row: any) {
  return {
    ...row,
    quotedPrice: parseAmount(row.quotedPrice),
  };
}

router.get("/supplier-rfqs", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: supplierRfqsTable.id,
      inquiryId: supplierRfqsTable.inquiryId,
      inquiryTitle: inquiriesTable.title,
      supplierId: supplierRfqsTable.supplierId,
      supplierName: suppliersTable.name,
      rfqNumber: supplierRfqsTable.rfqNumber,
      status: supplierRfqsTable.status,
      quotedPrice: supplierRfqsTable.quotedPrice,
      notes: supplierRfqsTable.notes,
      createdAt: supplierRfqsTable.createdAt,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .orderBy(supplierRfqsTable.createdAt);

  res.json(rows.map(enrichRfq));
});

router.get("/supplier-rfqs/by-inquiry/:inquiryId", async (req, res): Promise<void> => {
  const inquiryId = Number(req.params.inquiryId);
  if (isNaN(inquiryId)) {
    res.status(400).json({ error: "Invalid inquiryId" });
    return;
  }

  const rows = await db
    .select({
      id: supplierRfqsTable.id,
      inquiryId: supplierRfqsTable.inquiryId,
      inquiryTitle: inquiriesTable.title,
      supplierId: supplierRfqsTable.supplierId,
      supplierName: suppliersTable.name,
      rfqNumber: supplierRfqsTable.rfqNumber,
      status: supplierRfqsTable.status,
      quotedPrice: supplierRfqsTable.quotedPrice,
      notes: supplierRfqsTable.notes,
      createdAt: supplierRfqsTable.createdAt,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .where(eq(supplierRfqsTable.inquiryId, inquiryId))
    .orderBy(supplierRfqsTable.createdAt);

  res.json(rows.map(enrichRfq));
});

router.post("/supplier-rfqs", async (req, res): Promise<void> => {
  const { inquiryId, supplierId, rfqNumber, notes } = req.body;
  if (!inquiryId || !supplierId) {
    res.status(400).json({ error: "inquiryId and supplierId are required" });
    return;
  }

  const [rfq] = await db
    .insert(supplierRfqsTable)
    .values({
      inquiryId: Number(inquiryId),
      supplierId: Number(supplierId),
      rfqNumber: rfqNumber ?? null,
      notes: notes ?? null,
      status: "pending",
    })
    .returning();

  const [supplier] = await db.select({ name: suppliersTable.name }).from(suppliersTable).where(eq(suppliersTable.id, rfq.supplierId));
  const [inquiry] = await db.select({ title: inquiriesTable.title }).from(inquiriesTable).where(eq(inquiriesTable.id, rfq.inquiryId));

  res.status(201).json(enrichRfq({ ...rfq, supplierName: supplier?.name ?? null, inquiryTitle: inquiry?.title ?? null }));
});

router.get("/supplier-rfqs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select({
      id: supplierRfqsTable.id,
      inquiryId: supplierRfqsTable.inquiryId,
      inquiryTitle: inquiriesTable.title,
      supplierId: supplierRfqsTable.supplierId,
      supplierName: suppliersTable.name,
      rfqNumber: supplierRfqsTable.rfqNumber,
      status: supplierRfqsTable.status,
      quotedPrice: supplierRfqsTable.quotedPrice,
      notes: supplierRfqsTable.notes,
      createdAt: supplierRfqsTable.createdAt,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .where(eq(supplierRfqsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }
  res.json(enrichRfq(row));
});

router.patch("/supplier-rfqs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { status, quotedPrice, rfqNumber, notes } = req.body;
  const upd: any = {};
  if (status != null) upd.status = status;
  if (rfqNumber != null) upd.rfqNumber = rfqNumber;
  if (notes != null) upd.notes = notes;
  if (quotedPrice != null) upd.quotedPrice = String(quotedPrice);

  const [rfq] = await db
    .update(supplierRfqsTable)
    .set(upd)
    .where(eq(supplierRfqsTable.id, id))
    .returning();

  if (!rfq) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }

  const [supplier] = await db.select({ name: suppliersTable.name }).from(suppliersTable).where(eq(suppliersTable.id, rfq.supplierId));
  const [inquiry] = await db.select({ title: inquiriesTable.title }).from(inquiriesTable).where(eq(inquiriesTable.id, rfq.inquiryId));

  res.json(enrichRfq({ ...rfq, supplierName: supplier?.name ?? null, inquiryTitle: inquiry?.title ?? null }));
});

router.delete("/supplier-rfqs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [rfq] = await db.delete(supplierRfqsTable).where(eq(supplierRfqsTable.id, id)).returning();
  if (!rfq) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
