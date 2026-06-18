import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  supplierRfqsTable,
  supplierRfqItemsTable,
  suppliersTable,
  inquiriesTable,
  inquiryItemsTable,
  quotationsTable,
  quotationItemsTable,
  itemPriceHistoryTable,
  customersTable,
} from "@workspace/db";
import { generateToken } from "../lib/token";
import { sendRfqEmail } from "../lib/email";
import { generateRfqPdf } from "../lib/rfqPdf";
import { sendRfqWhatsApp } from "../lib/whatsapp";

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

function getBaseUrl(req: any): string {
  return (
    process.env.BASE_URL ??
    (process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : `http://localhost:${process.env.PORT ?? 8080}`)
  );
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
      supplierEmail: suppliersTable.email,
      rfqNumber: supplierRfqsTable.rfqNumber,
      status: supplierRfqsTable.status,
      quotedPrice: supplierRfqsTable.quotedPrice,
      notes: supplierRfqsTable.notes,
      token: supplierRfqsTable.token,
      emailStatus: supplierRfqsTable.emailStatus,
      emailSentAt: supplierRfqsTable.emailSentAt,
      closeDate: supplierRfqsTable.closeDate,
      linkOpened: supplierRfqsTable.linkOpened,
      openCount: supplierRfqsTable.openCount,
      firstOpenedAt: supplierRfqsTable.firstOpenedAt,
      lastOpenedAt: supplierRfqsTable.lastOpenedAt,
      offerSubmitted: supplierRfqsTable.offerSubmitted,
      offerSubmittedAt: supplierRfqsTable.offerSubmittedAt,
      createdAt: supplierRfqsTable.createdAt,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .where(eq(supplierRfqsTable.inquiryId, inquiryId))
    .orderBy(supplierRfqsTable.createdAt);

  res.json(rows.map(enrichRfq));
});

// ── Comparison matrix: items × suppliers with prices ─────────────────────────
router.get("/supplier-rfqs/by-inquiry/:inquiryId/comparison", async (req, res): Promise<void> => {
  const inquiryId = Number(req.params.inquiryId);
  if (isNaN(inquiryId)) {
    res.status(400).json({ error: "Invalid inquiryId" });
    return;
  }

  const [inquiryItems, rfqs, rfqItems] = await Promise.all([
    db
      .select({
        id: inquiryItemsTable.id,
        description: inquiryItemsTable.description,
        quantity: inquiryItemsTable.quantity,
        unit: inquiryItemsTable.unit,
        notes: inquiryItemsTable.notes,
      })
      .from(inquiryItemsTable)
      .where(eq(inquiryItemsTable.inquiryId, inquiryId)),
    db
      .select({
        id: supplierRfqsTable.id,
        supplierId: supplierRfqsTable.supplierId,
        supplierName: suppliersTable.name,
        rfqNumber: supplierRfqsTable.rfqNumber,
        status: supplierRfqsTable.status,
      })
      .from(supplierRfqsTable)
      .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
      .where(eq(supplierRfqsTable.inquiryId, inquiryId)),
    db
      .select({
        id: supplierRfqItemsTable.id,
        rfqId: supplierRfqItemsTable.rfqId,
        inquiryItemId: supplierRfqItemsTable.inquiryItemId,
        quotedPrice: supplierRfqItemsTable.quotedPrice,
        notes: supplierRfqItemsTable.notes,
      })
      .from(supplierRfqItemsTable)
      .innerJoin(supplierRfqsTable, eq(supplierRfqItemsTable.rfqId, supplierRfqsTable.id))
      .where(eq(supplierRfqsTable.inquiryId, inquiryId)),
  ]);

  res.json({
    items: inquiryItems.map((i) => ({
      ...i,
      quantity: Number(i.quantity),
    })),
    rfqs,
    prices: rfqItems.map((p) => ({
      ...p,
      quotedPrice: p.quotedPrice != null ? Number(p.quotedPrice) : null,
    })),
  });
});

// ── RFQ item prices (per-item pricing from supplier) ─────────────────────────
router.post("/supplier-rfqs/:id/items", async (req, res): Promise<void> => {
  const rfqId = Number(req.params.id);
  if (isNaN(rfqId)) {
    res.status(400).json({ error: "Invalid rfq id" });
    return;
  }

  const { items } = req.body as {
    items: { inquiryItemId: number; quotedPrice: number | null; notes?: string }[];
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items array is required" });
    return;
  }

  for (const item of items) {
    const existing = await db
      .select({ id: supplierRfqItemsTable.id })
      .from(supplierRfqItemsTable)
      .where(
        and(
          eq(supplierRfqItemsTable.rfqId, rfqId),
          eq(supplierRfqItemsTable.inquiryItemId, Number(item.inquiryItemId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(supplierRfqItemsTable)
        .set({
          quotedPrice: item.quotedPrice != null ? String(item.quotedPrice) : null,
          notes: item.notes ?? null,
        })
        .where(eq(supplierRfqItemsTable.id, existing[0].id));
    } else {
      await db.insert(supplierRfqItemsTable).values({
        rfqId,
        inquiryItemId: Number(item.inquiryItemId),
        quotedPrice: item.quotedPrice != null ? String(item.quotedPrice) : null,
        notes: item.notes ?? null,
      });
    }
  }

  const updated = await db
    .select()
    .from(supplierRfqItemsTable)
    .where(eq(supplierRfqItemsTable.rfqId, rfqId));

  res.json(
    updated.map((r) => ({
      ...r,
      quotedPrice: r.quotedPrice != null ? Number(r.quotedPrice) : null,
    }))
  );
});

router.delete("/supplier-rfqs/:rfqId/items/:inquiryItemId", async (req, res): Promise<void> => {
  const rfqId = Number(req.params.rfqId);
  const inquiryItemId = Number(req.params.inquiryItemId);
  if (isNaN(rfqId) || isNaN(inquiryItemId)) {
    res.status(400).json({ error: "Invalid ids" });
    return;
  }

  await db
    .delete(supplierRfqItemsTable)
    .where(
      and(
        eq(supplierRfqItemsTable.rfqId, rfqId),
        eq(supplierRfqItemsTable.inquiryItemId, inquiryItemId)
      )
    );

  res.sendStatus(204);
});

// ── Create quotation pre-filled from selected RFQ item prices ─────────────────
router.post("/inquiries/:id/quotation-from-rfqs", async (req, res): Promise<void> => {
  const inquiryId = Number(req.params.id);
  if (isNaN(inquiryId)) {
    res.status(400).json({ error: "Invalid inquiryId" });
    return;
  }

  const {
    selections,
  }: {
    selections: {
      inquiryItemId: number;
      supplierId: number | null;
      unitPrice: number;
      rfqId: number | null;
    }[];
  } = req.body;

  if (!Array.isArray(selections) || selections.length === 0) {
    res.status(400).json({ error: "selections array is required" });
    return;
  }

  const [inquiry] = await db
    .select({ id: inquiriesTable.id, customerId: inquiriesTable.customerId })
    .from(inquiriesTable)
    .where(eq(inquiriesTable.id, inquiryId));

  if (!inquiry) {
    res.status(404).json({ error: "Inquiry not found" });
    return;
  }

  const inquiryItemIds = selections.map((s) => s.inquiryItemId);
  const allItems = await db
    .select()
    .from(inquiryItemsTable)
    .where(eq(inquiryItemsTable.inquiryId, inquiryId));

  const itemMap = new Map(allItems.map((i) => [i.id, i]));

  const [quotation] = await db
    .insert(quotationsTable)
    .values({
      inquiryId,
      customerId: inquiry.customerId,
      status: "draft",
    })
    .returning();

  for (const sel of selections) {
    const item = itemMap.get(Number(sel.inquiryItemId));
    if (!item) continue;
    const qty = Number(item.quantity);
    const unitPrice = Number(sel.unitPrice);
    const totalPrice = qty * unitPrice;

    await db
      .insert(quotationItemsTable)
      .values({
        quotationId: quotation.id,
        description: item.description,
        quantity: String(qty),
        unit: item.unit ?? null,
        unitPrice: String(unitPrice),
        supplierId: sel.supplierId ?? null,
        notes: item.notes ?? null,
      });

    await db.insert(itemPriceHistoryTable).values({
      itemDescription: item.description,
      supplierId: sel.supplierId ?? null,
      customerId: inquiry.customerId,
      quotationId: quotation.id,
      unitPrice: String(unitPrice),
      quantity: String(qty),
      unit: item.unit ?? null,
      resultedInPo: false,
    });
  }

  const [customer] = await db
    .select({ name: customersTable.name })
    .from(customersTable)
    .where(eq(customersTable.id, inquiry.customerId));

  res.status(201).json({
    ...quotation,
    customerName: customer?.name ?? null,
    inquiryId: quotation.inquiryId,
  });
});

// POST /api/supplier-rfqs/:id/send-email — generate token + send email to supplier
router.post("/supplier-rfqs/:id/send-email", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { closeDate } = req.body as { closeDate?: string };

  const [row] = await db
    .select({
      rfq: supplierRfqsTable,
      supplierName: suppliersTable.name,
      supplierEmail: suppliersTable.email,
      inquiryTitle: inquiriesTable.title,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .where(eq(supplierRfqsTable.id, id));

  if (!row) { res.status(404).json({ error: "RFQ not found" }); return; }

  if (!row.supplierEmail) {
    res.status(400).json({
      status: "no_email",
      reason: `المورد "${row.supplierName}" ليس لديه بريد إلكتروني مسجّل`,
    });
    return;
  }

  // Generate token if not exists
  let token = row.rfq.token;
  if (!token) {
    token = generateToken();
    await db.update(supplierRfqsTable).set({ token }).where(eq(supplierRfqsTable.id, id));
  }

  // Build portal URL — uses app's frontend path
  const baseUrl = getBaseUrl(req);
  const appBasePath = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";
  const portalUrl = `${baseUrl}${appBasePath}/portal/${token}`;

  // Get inquiry items
  const items = await db
    .select({
      description: inquiryItemsTable.description,
      quantity: inquiryItemsTable.quantity,
      unit: inquiryItemsTable.unit,
      notes: inquiryItemsTable.notes,
    })
    .from(inquiryItemsTable)
    .where(eq(inquiryItemsTable.inquiryId, row.rfq.inquiryId));

  try {
    await sendRfqEmail({
      to: row.supplierEmail,
      toName: row.supplierName ?? "المورد",
      rfqNo: row.rfq.rfqNumber ?? String(id),
      inquiryTitle: row.inquiryTitle ?? "طلب تسعير",
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity != null ? String(i.quantity) : null,
        unit: i.unit,
        notes: i.notes,
      })),
      portalUrl,
      closeDate: closeDate || row.rfq.closeDate || "قريباً",
      senderName: "فريق المشتريات",
    });

    await db.update(supplierRfqsTable).set({
      status: "sent",
      emailStatus: "sent",
      emailSentAt: new Date(),
      closeDate: closeDate ?? row.rfq.closeDate,
    }).where(eq(supplierRfqsTable.id, id));

    res.json({
      rfqId: id,
      supplierName: row.supplierName,
      status: "sent",
      portalUrl,
      reason: null,
    });
  } catch (err: any) {
    await db.update(supplierRfqsTable).set({
      emailStatus: "failed",
    }).where(eq(supplierRfqsTable.id, id));

    res.status(500).json({
      rfqId: id,
      supplierName: row.supplierName,
      status: "failed",
      reason: err.message ?? "Email send failed",
    });
  }
});

// POST /api/supplier-rfqs/:id/generate-link — generate portal token without sending email
router.post("/supplier-rfqs/:id/generate-link", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { closeDate } = req.body as { closeDate?: string };

  const [rfq] = await db.select().from(supplierRfqsTable).where(eq(supplierRfqsTable.id, id));
  if (!rfq) { res.status(404).json({ error: "RFQ not found" }); return; }

  let token = rfq.token;
  if (!token) {
    token = generateToken();
  }

  await db.update(supplierRfqsTable).set({
    token,
    status: rfq.status === "pending" ? "sent" : rfq.status,
    closeDate: closeDate ?? rfq.closeDate,
  }).where(eq(supplierRfqsTable.id, id));

  const baseUrl = getBaseUrl(req);
  const appBasePath = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";
  const portalUrl = `${baseUrl}${appBasePath}/portal/${token}`;

  res.json({ token, portalUrl });
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

// ── GET /api/supplier-rfqs/:id/pdf — download RFQ as PDF ──────────────────
router.get("/supplier-rfqs/:id/pdf", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({
      id: supplierRfqsTable.id,
      rfqNumber: supplierRfqsTable.rfqNumber,
      token: supplierRfqsTable.token,
      closeDate: supplierRfqsTable.closeDate,
      supplierName: suppliersTable.name,
      inquiryTitle: inquiriesTable.title,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .where(eq(supplierRfqsTable.id, id));

  if (!row) { res.status(404).json({ error: "RFQ not found" }); return; }

  const rfqItems = await db
    .select({
      description: inquiryItemsTable.description,
      quantity: inquiryItemsTable.quantity,
      unit: inquiryItemsTable.unit,
      notes: supplierRfqItemsTable.notes,
    })
    .from(supplierRfqItemsTable)
    .leftJoin(inquiryItemsTable, eq(supplierRfqItemsTable.inquiryItemId, inquiryItemsTable.id))
    .where(eq(supplierRfqItemsTable.rfqId, id));

  // Build portal URL if token exists
  const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = replitDomain ? `https://${replitDomain}` : `http://localhost:${process.env.PORT || 8080}`;
  const appBase = process.env.BASE_PATH ?? "";
  const portalUrl = row.token ? `${baseUrl}${appBase}/portal/${row.token}` : undefined;

  const pdfBuffer = await generateRfqPdf({
    rfqNumber: row.rfqNumber ?? `RFQ-${id}`,
    inquiryTitle: row.inquiryTitle ?? "—",
    closeDate: row.closeDate,
    supplierName: row.supplierName ?? "—",
    items: rfqItems.map((item) => ({
      description: item.description ?? "",
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes,
    })),
    portalUrl,
    companyName: process.env.COMPANY_NAME,
  });

  const filename = `RFQ-${row.rfqNumber ?? id}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});

// POST /api/supplier-rfqs/:id/send-whatsapp — إرسال طلب التسعير بواتساب
router.post("/supplier-rfqs/:id/send-whatsapp", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { closeDate } = req.body as { closeDate?: string };

  const [row] = await db
    .select({
      rfq: supplierRfqsTable,
      supplierName: suppliersTable.name,
      supplierPhone: suppliersTable.phone,
      inquiryTitle: inquiriesTable.title,
    })
    .from(supplierRfqsTable)
    .leftJoin(suppliersTable, eq(supplierRfqsTable.supplierId, suppliersTable.id))
    .leftJoin(inquiriesTable, eq(supplierRfqsTable.inquiryId, inquiriesTable.id))
    .where(eq(supplierRfqsTable.id, id));

  if (!row) { res.status(404).json({ error: "RFQ not found" }); return; }

  if (!row.supplierPhone) {
    res.status(400).json({
      status: "no_phone",
      reason: `المورد "${row.supplierName}" ليس لديه رقم هاتف مسجّل`,
    });
    return;
  }

  // Generate token if not exists
  let token = row.rfq.token;
  if (!token) {
    token = generateToken();
    await db.update(supplierRfqsTable).set({ token }).where(eq(supplierRfqsTable.id, id));
  }

  const baseUrl = getBaseUrl(req);
  const appBasePath = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";
  const portalUrl = `${baseUrl}${appBasePath}/portal/${token}`;

  const items = await db
    .select({
      description: inquiryItemsTable.description,
      quantity: inquiryItemsTable.quantity,
      unit: inquiryItemsTable.unit,
    })
    .from(inquiryItemsTable)
    .where(eq(inquiryItemsTable.inquiryId, row.rfq.inquiryId));

  try {
    await sendRfqWhatsApp({
      phone: row.supplierPhone,
      supplierName: row.supplierName ?? "المورد",
      rfqNumber: row.rfq.rfqNumber ?? String(id),
      inquiryTitle: row.inquiryTitle ?? "طلب تسعير",
      closeDate: closeDate ?? row.rfq.closeDate,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
      })),
      portalUrl,
      companyName: process.env.COMPANY_NAME,
    });

    await db.update(supplierRfqsTable).set({
      status: row.rfq.status === "pending" ? "sent" : row.rfq.status,
      closeDate: closeDate ?? row.rfq.closeDate,
    }).where(eq(supplierRfqsTable.id, id));

    res.json({
      rfqId: id,
      supplierName: row.supplierName,
      status: "sent",
      portalUrl,
      reason: null,
    });
  } catch (err: any) {
    res.status(500).json({
      rfqId: id,
      supplierName: row.supplierName,
      status: "failed",
      reason: err.message ?? "WhatsApp send failed",
    });
  }
});

// POST /api/inquiries/:id/send-bulk — إرسال طلب التسعير لعدة موردين دفعة واحدة
router.post("/inquiries/:id/send-bulk", async (req, res): Promise<void> => {
  const inquiryId = Number(req.params.id);
  if (isNaN(inquiryId)) { res.status(400).json({ error: "Invalid inquiryId" }); return; }

  const { supplierIds, closeDate } = req.body as { supplierIds: number[]; closeDate?: string };
  if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
    res.status(400).json({ error: "supplierIds array is required" });
    return;
  }

  const [inquiry] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.id, inquiryId));
  if (!inquiry) { res.status(404).json({ error: "Inquiry not found" }); return; }

  const inquiryItems = await db
    .select({ description: inquiryItemsTable.description, quantity: inquiryItemsTable.quantity, unit: inquiryItemsTable.unit, notes: inquiryItemsTable.notes })
    .from(inquiryItemsTable)
    .where(eq(inquiryItemsTable.inquiryId, inquiryId));

  const baseUrl = getBaseUrl(req);
  const appBasePath = process.env.BASE_PATH?.replace(/\/$/, "") ?? "";

  const results: {
    supplierId: number;
    supplierName: string | null;
    rfqId: number | null;
    email: { status: string; reason: string | null };
    whatsapp: { status: string; reason: string | null };
  }[] = [];

  for (const supplierId of supplierIds) {
    const [supplier] = await db
      .select({ id: suppliersTable.id, name: suppliersTable.name, email: suppliersTable.email, phone: suppliersTable.phone })
      .from(suppliersTable)
      .where(eq(suppliersTable.id, supplierId));

    if (!supplier) {
      results.push({ supplierId, supplierName: null, rfqId: null, email: { status: "error", reason: "المورد غير موجود" }, whatsapp: { status: "error", reason: "المورد غير موجود" } });
      continue;
    }

    // Get or create RFQ for this supplier + inquiry
    let [rfq] = await db
      .select()
      .from(supplierRfqsTable)
      .where(and(eq(supplierRfqsTable.inquiryId, inquiryId), eq(supplierRfqsTable.supplierId, supplierId)));

    if (!rfq) {
      const [newRfq] = await db.insert(supplierRfqsTable).values({
        inquiryId,
        supplierId,
        status: "pending",
      }).returning();
      rfq = newRfq;
    }

    // Ensure token
    let token = rfq.token;
    if (!token) {
      token = generateToken();
      await db.update(supplierRfqsTable).set({ token }).where(eq(supplierRfqsTable.id, rfq.id));
    }

    if (closeDate) {
      await db.update(supplierRfqsTable).set({ closeDate }).where(eq(supplierRfqsTable.id, rfq.id));
    }

    const portalUrl = `${baseUrl}${appBasePath}/portal/${token}`;
    const emailResult: { status: string; reason: string | null } = { status: "no_email", reason: null };
    const whatsappResult: { status: string; reason: string | null } = { status: "no_phone", reason: null };

    // Send email
    if (supplier.email) {
      try {
        await sendRfqEmail({
          to: supplier.email,
          toName: supplier.name ?? "المورد",
          rfqNo: rfq.rfqNumber ?? String(rfq.id),
          inquiryTitle: inquiry.title ?? "طلب تسعير",
          items: inquiryItems.map((i) => ({
            description: i.description,
            quantity: i.quantity != null ? String(i.quantity) : null,
            unit: i.unit,
            notes: i.notes,
          })),
          portalUrl,
          closeDate: closeDate || rfq.closeDate || "قريباً",
          senderName: "فريق المشتريات",
        });
        emailResult.status = "sent";
        await db.update(supplierRfqsTable).set({ status: "sent", emailStatus: "sent", emailSentAt: new Date() }).where(eq(supplierRfqsTable.id, rfq.id));
      } catch (e: any) {
        emailResult.status = "failed";
        emailResult.reason = e.message;
        await db.update(supplierRfqsTable).set({ emailStatus: "failed" }).where(eq(supplierRfqsTable.id, rfq.id));
      }
    }

    // Send WhatsApp
    if (supplier.phone) {
      try {
        await sendRfqWhatsApp({
          phone: supplier.phone,
          supplierName: supplier.name ?? "المورد",
          rfqNumber: rfq.rfqNumber ?? String(rfq.id),
          inquiryTitle: inquiry.title ?? "طلب تسعير",
          closeDate: closeDate ?? rfq.closeDate,
          items: inquiryItems.map((i) => ({ description: i.description, quantity: i.quantity, unit: i.unit })),
          portalUrl,
          companyName: process.env.COMPANY_NAME,
        });
        whatsappResult.status = "sent";
        if (rfq.status === "pending") {
          await db.update(supplierRfqsTable).set({ status: "sent" }).where(eq(supplierRfqsTable.id, rfq.id));
        }
      } catch (e: any) {
        whatsappResult.status = "failed";
        whatsappResult.reason = e.message;
      }
    }

    results.push({ supplierId, supplierName: supplier.name, rfqId: rfq.id, email: emailResult, whatsapp: whatsappResult });
  }

  res.json({ results });
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
