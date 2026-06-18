import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  deliveryNotesTable,
  invoicesTable,
  customerPosTable,
  customersTable,
} from "@workspace/db";
import { parseId } from "../lib/route-helpers";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

async function nextDnNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DN-${year}-`;
  const rows = await db
    .select({ dnNumber: deliveryNotesTable.dnNumber })
    .from(deliveryNotesTable)
    .where(eq(deliveryNotesTable.dnNumber, deliveryNotesTable.dnNumber))
    .orderBy(desc(deliveryNotesTable.id))
    .limit(1);

  // Find the highest number with the current year prefix
  const allRows = await db
    .select({ dnNumber: deliveryNotesTable.dnNumber })
    .from(deliveryNotesTable);

  let max = 0;
  for (const r of allRows) {
    if (r.dnNumber.startsWith(prefix)) {
      const num = parseInt(r.dnNumber.slice(prefix.length), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function buildDeliveryNote(id: number) {
  const [dn] = await db
    .select({
      id: deliveryNotesTable.id,
      dnNumber: deliveryNotesTable.dnNumber,
      customerPoId: deliveryNotesTable.customerPoId,
      customerPoNumber: customerPosTable.poNumber,
      customerName: customersTable.name,
      status: deliveryNotesTable.status,
      issueDate: deliveryNotesTable.issueDate,
      signedFileUrl: deliveryNotesTable.signedFileUrl,
      notes: deliveryNotesTable.notes,
      financeApprovedAt: deliveryNotesTable.financeApprovedAt,
      createdAt: deliveryNotesTable.createdAt,
    })
    .from(deliveryNotesTable)
    .leftJoin(customerPosTable, eq(deliveryNotesTable.customerPoId, customerPosTable.id))
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .where(eq(deliveryNotesTable.id, id));

  if (!dn) return null;

  // Check if there's a linked invoice
  const [invoice] = await db
    .select({ id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber, status: invoicesTable.status })
    .from(invoicesTable)
    .where(eq(invoicesTable.deliveryNoteId, id));

  return {
    ...dn,
    financeApprovedAt: dn.financeApprovedAt ? dn.financeApprovedAt.toISOString() : null,
    invoice: invoice ?? null,
  };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get("/delivery-notes", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: deliveryNotesTable.id,
      dnNumber: deliveryNotesTable.dnNumber,
      customerPoId: deliveryNotesTable.customerPoId,
      customerPoNumber: customerPosTable.poNumber,
      customerName: customersTable.name,
      status: deliveryNotesTable.status,
      issueDate: deliveryNotesTable.issueDate,
      signedFileUrl: deliveryNotesTable.signedFileUrl,
      notes: deliveryNotesTable.notes,
      financeApprovedAt: deliveryNotesTable.financeApprovedAt,
      createdAt: deliveryNotesTable.createdAt,
    })
    .from(deliveryNotesTable)
    .leftJoin(customerPosTable, eq(deliveryNotesTable.customerPoId, customerPosTable.id))
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .orderBy(desc(deliveryNotesTable.createdAt));

  // Attach invoice summaries
  const allInvoices = await db
    .select({ id: invoicesTable.id, invoiceNumber: invoicesTable.invoiceNumber, status: invoicesTable.status, deliveryNoteId: invoicesTable.deliveryNoteId })
    .from(invoicesTable);

  const invoiceMap = new Map(allInvoices.map((inv) => [inv.deliveryNoteId, inv]));

  res.json(rows.map((r) => ({
    ...r,
    financeApprovedAt: r.financeApprovedAt ? r.financeApprovedAt.toISOString() : null,
    invoice: invoiceMap.get(r.id) ?? null,
  })));
});

router.post("/delivery-notes", async (req, res): Promise<void> => {
  const { customerPoId, issueDate, notes } = req.body;
  if (!customerPoId) {
    res.status(400).json({ error: "customerPoId is required" });
    return;
  }
  const dnNumber = await nextDnNumber();
  const [dn] = await db
    .insert(deliveryNotesTable)
    .values({
      dnNumber,
      customerPoId: Number(customerPoId),
      status: "draft",
      ...(issueDate && { issueDate }),
      ...(notes && { notes }),
    })
    .returning();

  const result = await buildDeliveryNote(dn.id);
  res.status(201).json(result);
});

router.get("/delivery-notes/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const result = await buildDeliveryNote(id);
  if (!result) { res.status(404).json({ error: "Delivery note not found" }); return; }
  res.json(result);
});

router.patch("/delivery-notes/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const { status, issueDate, signedFileUrl, notes } = req.body;
  const upd: any = {};
  if (status != null) upd.status = status;
  if (issueDate != null) upd.issueDate = issueDate;
  if (signedFileUrl != null) upd.signedFileUrl = signedFileUrl;
  if (notes != null) upd.notes = notes;
  await db.update(deliveryNotesTable).set(upd).where(eq(deliveryNotesTable.id, id));
  const result = await buildDeliveryNote(id);
  if (!result) { res.status(404).json({ error: "Delivery note not found" }); return; }
  res.json(result);
});

router.post("/delivery-notes/:id/approve-finance", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  await db
    .update(deliveryNotesTable)
    .set({ status: "finance_approved", financeApprovedAt: new Date() })
    .where(eq(deliveryNotesTable.id, id));
  const result = await buildDeliveryNote(id);
  if (!result) { res.status(404).json({ error: "Delivery note not found" }); return; }
  res.json(result);
});

router.post("/delivery-notes/:id/mark-signed", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const { signedFileUrl } = req.body ?? {};
  const upd: any = { status: "signed" };
  if (signedFileUrl) upd.signedFileUrl = signedFileUrl;
  await db.update(deliveryNotesTable).set(upd).where(eq(deliveryNotesTable.id, id));
  const result = await buildDeliveryNote(id);
  if (!result) { res.status(404).json({ error: "Delivery note not found" }); return; }
  res.json(result);
});

export default router;
