import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  customerPosTable,
  customersTable,
  quotationsTable,
  deliveryNotesTable,
  invoicesTable,
} from "@workspace/db";

const router: IRouter = Router();

// ── GET /customer-pos/:id/timeline ────────────────────────────────────────────
router.get("/customer-pos/:id/timeline", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [po] = await db
    .select({
      id: customerPosTable.id,
      poNumber: customerPosTable.poNumber,
      customerName: customersTable.name,
      quotationId: customerPosTable.quotationId,
    })
    .from(customerPosTable)
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .where(eq(customerPosTable.id, id));

  if (!po) { res.status(404).json({ error: "Customer PO not found" }); return; }

  let quotationNumber: string | null = null;
  if (po.quotationId) {
    const [q] = await db
      .select({ quotationNumber: quotationsTable.quotationNumber })
      .from(quotationsTable)
      .where(eq(quotationsTable.id, po.quotationId));
    quotationNumber = q?.quotationNumber ?? null;
  }

  const dns = await db
    .select({
      id: deliveryNotesTable.id,
      dnNumber: deliveryNotesTable.dnNumber,
      customerPoId: deliveryNotesTable.customerPoId,
      status: deliveryNotesTable.status,
      issueDate: deliveryNotesTable.issueDate,
      signedFileUrl: deliveryNotesTable.signedFileUrl,
      notes: deliveryNotesTable.notes,
      financeApprovedAt: deliveryNotesTable.financeApprovedAt,
      createdAt: deliveryNotesTable.createdAt,
    })
    .from(deliveryNotesTable)
    .where(eq(deliveryNotesTable.customerPoId, id));

  const allInvoices = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      deliveryNoteId: invoicesTable.deliveryNoteId,
      customerPoId: invoicesTable.customerPoId,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      totalAmount: invoicesTable.totalAmount,
      notes: invoicesTable.notes,
      createdAt: invoicesTable.createdAt,
    })
    .from(invoicesTable)
    .where(eq(invoicesTable.customerPoId, id));

  const invoiceMap = new Map(allInvoices.map((inv) => [inv.deliveryNoteId, { id: inv.id, invoiceNumber: inv.invoiceNumber, status: inv.status }]));

  res.json({
    customerPoId: po.id,
    customerPoNumber: po.poNumber,
    customerName: po.customerName,
    quotationId: po.quotationId,
    quotationNumber,
    deliveryNotes: dns.map((dn) => ({
      ...dn,
      customerPoNumber: po.poNumber,
      customerName: po.customerName,
      financeApprovedAt: dn.financeApprovedAt ? dn.financeApprovedAt.toISOString() : null,
      invoice: invoiceMap.get(dn.id) ?? null,
    })),
    invoices: allInvoices.map((inv) => ({
      ...inv,
      customerPoNumber: po.poNumber,
      customerName: po.customerName,
      dnNumber: dns.find((d) => d.id === inv.deliveryNoteId)?.dnNumber ?? null,
      totalAmount: inv.totalAmount != null ? Number(inv.totalAmount) : null,
    })),
  });
});

// ── GET /reports/pipeline ──────────────────────────────────────────────────────
router.get("/reports/pipeline", async (req, res): Promise<void> => {
  const pos = await db
    .select({
      id: customerPosTable.id,
      poNumber: customerPosTable.poNumber,
      status: customerPosTable.status,
      customerName: customersTable.name,
      quotationId: customerPosTable.quotationId,
      totalAmount: customerPosTable.totalAmount,
      createdAt: customerPosTable.createdAt,
    })
    .from(customerPosTable)
    .leftJoin(customersTable, eq(customerPosTable.customerId, customersTable.id))
    .orderBy(customerPosTable.createdAt);

  const quotationIds = pos.map((p) => p.quotationId).filter(Boolean) as number[];
  let quotationNumbers: Map<number, string | null> = new Map();
  if (quotationIds.length > 0) {
    const qs = await db
      .select({ id: quotationsTable.id, quotationNumber: quotationsTable.quotationNumber })
      .from(quotationsTable);
    quotationNumbers = new Map(qs.map((q) => [q.id, q.quotationNumber]));
  }

  const dns = await db
    .select({
      id: deliveryNotesTable.id,
      dnNumber: deliveryNotesTable.dnNumber,
      customerPoId: deliveryNotesTable.customerPoId,
      status: deliveryNotesTable.status,
    })
    .from(deliveryNotesTable);

  const invs = await db
    .select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      customerPoId: invoicesTable.customerPoId,
      deliveryNoteId: invoicesTable.deliveryNoteId,
      status: invoicesTable.status,
    })
    .from(invoicesTable);

  const dnByPo = new Map<number, typeof dns[number][]>();
  for (const dn of dns) {
    const arr = dnByPo.get(dn.customerPoId) ?? [];
    arr.push(dn);
    dnByPo.set(dn.customerPoId, arr);
  }

  const invByDn = new Map<number, typeof invs[number]>();
  for (const inv of invs) {
    invByDn.set(inv.deliveryNoteId, inv);
  }

  const result: any[] = [];
  for (const po of pos) {
    const poDns = dnByPo.get(po.id) ?? [];
    if (poDns.length === 0) {
      result.push({
        customerPoId: po.id,
        customerPoNumber: po.poNumber,
        customerPoStatus: po.status,
        customerName: po.customerName,
        quotationId: po.quotationId,
        quotationNumber: po.quotationId ? (quotationNumbers.get(po.quotationId) ?? null) : null,
        totalAmount: po.totalAmount != null ? Number(po.totalAmount) : null,
        dnId: null, dnNumber: null, dnStatus: null,
        invoiceId: null, invoiceNumber: null, invoiceStatus: null,
        createdAt: po.createdAt,
      });
    } else {
      for (const dn of poDns) {
        const inv = invByDn.get(dn.id);
        result.push({
          customerPoId: po.id,
          customerPoNumber: po.poNumber,
          customerPoStatus: po.status,
          customerName: po.customerName,
          quotationId: po.quotationId,
          quotationNumber: po.quotationId ? (quotationNumbers.get(po.quotationId) ?? null) : null,
          totalAmount: po.totalAmount != null ? Number(po.totalAmount) : null,
          dnId: dn.id,
          dnNumber: dn.dnNumber,
          dnStatus: dn.status,
          invoiceId: inv?.id ?? null,
          invoiceNumber: inv?.invoiceNumber ?? null,
          invoiceStatus: inv?.status ?? null,
          createdAt: po.createdAt,
        });
      }
    }
  }

  res.json(result);
});

export default router;
