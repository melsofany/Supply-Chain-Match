/**
 * PUBLIC portal routes — no auth required.
 * Supplier uses their unique token to see RFQ items and submit prices.
 */
import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  supplierRfqsTable,
  supplierRfqItemsTable,
  suppliersTable,
  inquiriesTable,
  inquiryItemsTable,
} from "@workspace/db";

const router: IRouter = Router();

// GET /api/portal/:token — get RFQ info for supplier
router.get("/portal/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  if (!token || token.length < 10) {
    res.status(400).json({ error: "رابط غير صالح" });
    return;
  }

  const [rfq] = await db
    .select({
      id: supplierRfqsTable.id,
      inquiryId: supplierRfqsTable.inquiryId,
      inquiryTitle: inquiriesTable.title,
      supplierId: supplierRfqsTable.supplierId,
      supplierName: suppliersTable.name,
      rfqNumber: supplierRfqsTable.rfqNumber,
      status: supplierRfqsTable.status,
      closeDate: supplierRfqsTable.closeDate,
      notes: supplierRfqsTable.notes,
      offerSubmitted: supplierRfqsTable.offerSubmitted,
      offerSubmittedAt: supplierRfqsTable.offerSubmittedAt,
      firstOpenedAt: supplierRfqsTable.firstOpenedAt,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .where(eq(supplierRfqsTable.token, token));

  if (!rfq) {
    res.status(404).json({ error: "الرابط غير موجود أو منتهي الصلاحية" });
    return;
  }

  if (rfq.status === "cancelled") {
    res.status(410).json({ error: "تم إلغاء طلب التسعير هذا" });
    return;
  }

  // Track link open (increment open_count atomically via sql expression)
  const now = new Date();
  await db
    .update(supplierRfqsTable)
    .set({
      linkOpened: true,
      lastOpenedAt: now,
      openCount: sql`${supplierRfqsTable.openCount} + 1`,
      ...(!rfq.firstOpenedAt ? { firstOpenedAt: now } : {}),
    })
    .where(eq(supplierRfqsTable.token, token));

  // Get inquiry items
  const items = await db
    .select({
      id: inquiryItemsTable.id,
      description: inquiryItemsTable.description,
      quantity: inquiryItemsTable.quantity,
      unit: inquiryItemsTable.unit,
      notes: inquiryItemsTable.notes,
    })
    .from(inquiryItemsTable)
    .where(eq(inquiryItemsTable.inquiryId, rfq.inquiryId));

  // Get existing prices submitted by this supplier (if any)
  const existingPrices = await db
    .select()
    .from(supplierRfqItemsTable)
    .where(eq(supplierRfqItemsTable.rfqId, rfq.id));

  res.json({
    rfq: {
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      inquiryTitle: rfq.inquiryTitle,
      supplierName: rfq.supplierName,
      closeDate: rfq.closeDate,
      notes: rfq.notes,
      offerSubmitted: rfq.offerSubmitted,
      offerSubmittedAt: rfq.offerSubmittedAt,
      status: rfq.status,
    },
    items: items.map((i) => ({
      id: i.id,
      description: i.description,
      quantity: i.quantity != null ? Number(i.quantity) : null,
      unit: i.unit,
      notes: i.notes,
    })),
    existingPrices: existingPrices.map((p) => ({
      inquiryItemId: p.inquiryItemId,
      quotedPrice: p.quotedPrice != null ? Number(p.quotedPrice) : null,
      notes: p.notes,
      taxIncluded: p.taxIncluded,
      deliveryDays: p.deliveryDays,
    })),
  });
});

// POST /api/portal/:token/submit — supplier submits prices
router.post("/portal/:token/submit", async (req, res): Promise<void> => {
  const { token } = req.params;

  const [rfq] = await db
    .select()
    .from(supplierRfqsTable)
    .where(eq(supplierRfqsTable.token, token));

  if (!rfq) {
    res.status(404).json({ error: "الرابط غير موجود" });
    return;
  }

  if (rfq.status === "cancelled") {
    res.status(410).json({ error: "تم إلغاء طلب التسعير هذا" });
    return;
  }

  const { items, generalNotes } = req.body as {
    items: { inquiryItemId: number; quotedPrice: number | null; notes?: string; taxIncluded?: boolean; deliveryDays?: number | null }[];
    generalNotes?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "يجب إرسال أسعار لبند واحد على الأقل" });
    return;
  }

  // Upsert each item price
  for (const item of items) {
    const [existing] = await db
      .select({ id: supplierRfqItemsTable.id })
      .from(supplierRfqItemsTable)
      .where(
        and(
          eq(supplierRfqItemsTable.rfqId, rfq.id),
          eq(supplierRfqItemsTable.inquiryItemId, Number(item.inquiryItemId))
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(supplierRfqItemsTable)
        .set({
          quotedPrice: item.quotedPrice != null ? String(item.quotedPrice) : null,
          notes: item.notes ?? null,
          taxIncluded: item.taxIncluded ?? false,
          deliveryDays: item.deliveryDays ?? null,
        })
        .where(eq(supplierRfqItemsTable.id, existing.id));
    } else {
      await db.insert(supplierRfqItemsTable).values({
        rfqId: rfq.id,
        inquiryItemId: Number(item.inquiryItemId),
        quotedPrice: item.quotedPrice != null ? String(item.quotedPrice) : null,
        notes: item.notes ?? null,
        taxIncluded: item.taxIncluded ?? false,
        deliveryDays: item.deliveryDays ?? null,
      });
    }
  }

  // Update RFQ status → received, mark offer submitted
  await db
    .update(supplierRfqsTable)
    .set({
      status: "received",
      offerSubmitted: true,
      offerSubmittedAt: new Date(),
      ...(generalNotes ? { notes: generalNotes } : {}),
    })
    .where(eq(supplierRfqsTable.id, rfq.id));

  res.json({ ok: true, message: "تم استلام أسعارك بنجاح. شكراً لتعاونكم!" });
});

export default router;
