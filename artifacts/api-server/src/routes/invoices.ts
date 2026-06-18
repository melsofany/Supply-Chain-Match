import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  invoicesTable,
  deliveryNotesTable,
  customerPosTable,
  customersTable,
} from "@workspace/db";
import { parseId, parseAmount } from "../lib/route-helpers";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const allRows = await db
    .select({ invoiceNumber: invoicesTable.invoiceNumber })
    .from(invoicesTable);

  let max = 0;
  for (const r of allRows) {
    if (r.invoiceNumber.startsWith(prefix)) {
      const num = parseInt(r.invoiceNumber.slice(prefix.length), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function buildInvoice(id: number) {
  const [inv] = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      deliveryNoteId: invoicesTable.deliveryNoteId,
      customerPoId: invoicesTable.customerPoId,
      customerPoNumber: customerPosTable.poNumber,
      customerName: customersTable.name,
      dnNumber: deliveryNotesTable.dnNumber,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      totalAmount: invoicesTable.totalAmount,
      notes: invoicesTable.notes,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(deliveryNotesTable, eq(invoicesTable.deliveryNoteId, deliveryNotesTable.id))
    .leftJoin(customerPosTable, eq(invoicesTable.customerPoId, customerPosTable.id))
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .where(eq(invoicesTable.id, id));

  if (!inv) return null;
  return { ...inv, totalAmount: parseAmount(inv.totalAmount) };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

router.get("/invoices", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      deliveryNoteId: invoicesTable.deliveryNoteId,
      customerPoId: invoicesTable.customerPoId,
      customerPoNumber: customerPosTable.poNumber,
      customerName: customersTable.name,
      dnNumber: deliveryNotesTable.dnNumber,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      totalAmount: invoicesTable.totalAmount,
      notes: invoicesTable.notes,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .leftJoin(deliveryNotesTable, eq(invoicesTable.deliveryNoteId, deliveryNotesTable.id))
    .leftJoin(customerPosTable, eq(invoicesTable.customerPoId, customerPosTable.id))
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(rows.map((r) => ({ ...r, totalAmount: parseAmount(r.totalAmount) })));
});

router.post("/invoices", async (req, res): Promise<void> => {
  const { deliveryNoteId, issueDate, totalAmount, notes } = req.body;
  if (!deliveryNoteId) {
    res.status(400).json({ error: "deliveryNoteId is required" });
    return;
  }
  // Enforce: delivery note must be signed
  const [dn] = await db
    .select({ status: deliveryNotesTable.status, customerPoId: deliveryNotesTable.customerPoId })
    .from(deliveryNotesTable)
    .where(eq(deliveryNotesTable.id, Number(deliveryNoteId)));

  if (!dn) {
    res.status(404).json({ error: "Delivery note not found" });
    return;
  }
  if (dn.status !== "signed") {
    res.status(422).json({ error: "لا يمكن إصدار فاتورة إلا بعد توقيع العميل على إذن التسليم" });
    return;
  }
  // Enforce: only one invoice per delivery note
  const existing = await db
    .select({ id: invoicesTable.id })
    .from(invoicesTable)
    .where(eq(invoicesTable.deliveryNoteId, Number(deliveryNoteId)));

  if (existing.length > 0) {
    res.status(422).json({ error: "يوجد فاتورة مرتبطة بهذا الإذن مسبقاً" });
    return;
  }

  const invoiceNumber = await nextInvoiceNumber();
  const [inv] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber,
      deliveryNoteId: Number(deliveryNoteId),
      customerPoId: dn.customerPoId,
      status: "draft",
      ...(issueDate && { issueDate }),
      ...(totalAmount != null && { totalAmount: String(totalAmount) }),
      ...(notes && { notes }),
    })
    .returning();

  const result = await buildInvoice(inv.id);
  res.status(201).json(result);
});

router.get("/invoices/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const result = await buildInvoice(id);
  if (!result) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(result);
});

router.patch("/invoices/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const { status, issueDate, totalAmount, notes } = req.body;
  const upd: any = {};
  if (status != null) upd.status = status;
  if (issueDate != null) upd.issueDate = issueDate;
  if (totalAmount != null) upd.totalAmount = String(totalAmount);
  if (notes != null) upd.notes = notes;
  await db.update(invoicesTable).set(upd).where(eq(invoicesTable.id, id));
  const result = await buildInvoice(id);
  if (!result) { res.status(404).json({ error: "Invoice not found" }); return; }
  res.json(result);
});

export default router;
