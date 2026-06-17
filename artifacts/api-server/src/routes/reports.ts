import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  customerPosTable,
  supplierPosTable,
  customersTable,
  suppliersTable,
  quotationsTable,
  deliveryNotesTable,
  invoicesTable,
  inquiriesTable,
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

// ── GET /reports/summary ───────────────────────────────────────────────────────
router.get("/reports/summary", async (_req, res): Promise<void> => {
  // ── fetch all data in parallel ──
  const [
    customers,
    suppliers,
    customerPos,
    supplierPos,
    deliveryNotes,
    invoices,
    inquiries,
  ] = await Promise.all([
    db.select().from(customersTable),
    db.select().from(suppliersTable),
    db.select({
      id: customerPosTable.id,
      customerId: customerPosTable.customerId,
      status: customerPosTable.status,
      totalAmount: customerPosTable.totalAmount,
      createdAt: customerPosTable.createdAt,
    }).from(customerPosTable),
    db.select({
      id: supplierPosTable.id,
      supplierId: supplierPosTable.supplierId,
      status: supplierPosTable.status,
      totalAmount: supplierPosTable.totalAmount,
      createdAt: supplierPosTable.createdAt,
    }).from(supplierPosTable),
    db.select({
      id: deliveryNotesTable.id,
      dnNumber: deliveryNotesTable.dnNumber,
      customerPoId: deliveryNotesTable.customerPoId,
      status: deliveryNotesTable.status,
      issueDate: deliveryNotesTable.issueDate,
      financeApprovedAt: deliveryNotesTable.financeApprovedAt,
      createdAt: deliveryNotesTable.createdAt,
    }).from(deliveryNotesTable),
    db.select({
      id: invoicesTable.id,
      invoiceNumber: invoicesTable.invoiceNumber,
      deliveryNoteId: invoicesTable.deliveryNoteId,
      customerPoId: invoicesTable.customerPoId,
      status: invoicesTable.status,
      issueDate: invoicesTable.issueDate,
      totalAmount: invoicesTable.totalAmount,
      createdAt: invoicesTable.createdAt,
    }).from(invoicesTable),
    db.select({ id: inquiriesTable.id, status: inquiriesTable.status }).from(inquiriesTable),
  ]);

  // ── customer report ──
  const customerMap = new Map(customers.map((c) => [c.id, c.name]));
  const customerStats = customers.map((c) => {
    const pos = customerPos.filter((p) => p.customerId === c.id);
    const revenue = pos.reduce((s, p) => s + (p.totalAmount != null ? Number(p.totalAmount) : 0), 0);
    const invs = invoices.filter((inv) => {
      const po = customerPos.find((p) => p.id === inv.customerPoId);
      return po?.customerId === c.id;
    });
    const invoiceTotal = invs.reduce((s, inv) => s + (inv.totalAmount != null ? Number(inv.totalAmount) : 0), 0);
    const paidTotal = invs.filter((i) => i.status === "paid").reduce((s, inv) => s + (inv.totalAmount != null ? Number(inv.totalAmount) : 0), 0);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      poCount: pos.length,
      revenue,
      invoiceTotal,
      paidTotal,
      pendingTotal: invoiceTotal - paidTotal,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // ── supplier report ──
  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const supplierStats = suppliers.map((s) => {
    const pos = supplierPos.filter((p) => p.supplierId === s.id);
    const totalSpend = pos.reduce((sum, p) => sum + (p.totalAmount != null ? Number(p.totalAmount) : 0), 0);
    const byStatus: Record<string, number> = {};
    for (const p of pos) { byStatus[p.status] = (byStatus[p.status] ?? 0) + 1; }
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      poCount: pos.length,
      totalSpend,
      byStatus,
    };
  }).sort((a, b) => b.totalSpend - a.totalSpend);

  // ── delivery notes by status ──
  const dnByStatus: Record<string, number> = {};
  for (const dn of deliveryNotes) { dnByStatus[dn.status] = (dnByStatus[dn.status] ?? 0) + 1; }

  const dnRows = deliveryNotes.map((dn) => {
    const po = customerPos.find((p) => p.id === dn.customerPoId);
    const customer = po ? customerMap.get(po.customerId) : null;
    const inv = invoices.find((i) => i.deliveryNoteId === dn.id);
    return {
      id: dn.id,
      dnNumber: dn.dnNumber,
      status: dn.status,
      issueDate: dn.issueDate,
      customerPoId: dn.customerPoId,
      customerName: customer ?? null,
      invoiceNumber: inv?.invoiceNumber ?? null,
      invoiceStatus: inv?.status ?? null,
      financeApprovedAt: dn.financeApprovedAt ? dn.financeApprovedAt.toISOString() : null,
      createdAt: dn.createdAt,
    };
  });

  // ── invoice stats ──
  const invByStatus: Record<string, { count: number; total: number }> = {};
  for (const inv of invoices) {
    const a = invByStatus[inv.status] ?? { count: 0, total: 0 };
    a.count += 1;
    a.total += inv.totalAmount != null ? Number(inv.totalAmount) : 0;
    invByStatus[inv.status] = a;
  }

  const invRows = invoices.map((inv) => {
    const po = customerPos.find((p) => p.id === inv.customerPoId);
    const customer = po ? customerMap.get(po.customerId) : null;
    const dn = deliveryNotes.find((d) => d.id === inv.deliveryNoteId);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      issueDate: inv.issueDate,
      totalAmount: inv.totalAmount != null ? Number(inv.totalAmount) : null,
      customerName: customer ?? null,
      dnNumber: dn?.dnNumber ?? null,
      createdAt: inv.createdAt,
    };
  });

  // ── financial center ──
  const totalRevenue = invoices.filter((i) => i.status !== "cancelled").reduce((s, i) => s + (i.totalAmount != null ? Number(i.totalAmount) : 0), 0);
  const paidRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.totalAmount != null ? Number(i.totalAmount) : 0), 0);
  const totalCost = supplierPos.filter((p) => p.status !== "cancelled").reduce((s, p) => s + (p.totalAmount != null ? Number(p.totalAmount) : 0), 0);
  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;

  // monthly revenue (last 12 months)
  const monthlyMap: Record<string, { revenue: number; cost: number }> = {};
  for (const inv of invoices) {
    if (inv.status === "cancelled") continue;
    const d = new Date(inv.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyMap[key] ?? { revenue: 0, cost: 0 };
    entry.revenue += inv.totalAmount != null ? Number(inv.totalAmount) : 0;
    monthlyMap[key] = entry;
  }
  for (const po of supplierPos) {
    if (po.status === "cancelled") continue;
    const d = new Date(po.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthlyMap[key] ?? { revenue: 0, cost: 0 };
    entry.cost += po.totalAmount != null ? Number(po.totalAmount) : 0;
    monthlyMap[key] = entry;
  }
  const monthlySeries = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, v]) => ({ month, ...v, profit: v.revenue - v.cost }));

  // top customers by revenue
  const topCustomers = customerStats.slice(0, 5).map((c) => ({ id: c.id, name: c.name, revenue: c.revenue, poCount: c.poCount }));

  // top suppliers by spend
  const topSuppliers = supplierStats.slice(0, 5).map((s) => ({ id: s.id, name: s.name, totalSpend: s.totalSpend, poCount: s.poCount }));

  res.json({
    // overview KPIs
    overview: {
      totalCustomers: customers.length,
      totalSuppliers: suppliers.length,
      totalInquiries: inquiries.length,
      totalCustomerPos: customerPos.length,
      totalSupplierPos: supplierPos.length,
      totalDeliveryNotes: deliveryNotes.length,
      totalInvoices: invoices.length,
      totalRevenue,
      paidRevenue,
      pendingRevenue: totalRevenue - paidRevenue,
      totalCost,
      grossProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
    },
    // customers
    customerStats,
    // suppliers
    supplierStats,
    // delivery notes
    deliveryNotes: { byStatus: dnByStatus, rows: dnRows },
    // invoices
    invoices: { byStatus: invByStatus, rows: invRows },
    // financial
    financial: {
      totalRevenue, paidRevenue, pendingRevenue: totalRevenue - paidRevenue,
      totalCost, grossProfit, profitMargin: Math.round(profitMargin * 100) / 100,
      monthlySeries,
      topCustomers,
      topSuppliers,
    },
  });
});

export default router;
