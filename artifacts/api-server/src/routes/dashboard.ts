import { Router, type IRouter } from "express";
import { count, eq, sql } from "drizzle-orm";
import {
  db,
  customersTable,
  suppliersTable,
  inquiriesTable,
  quotationsTable,
  customerPosTable,
  supplierPosTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const [[{ totalCustomers }], [{ totalSuppliers }]] = await Promise.all([
    db.select({ totalCustomers: count() }).from(customersTable),
    db.select({ totalSuppliers: count() }).from(suppliersTable),
  ]);

  const inquiryStatusRows = await db
    .select({ status: inquiriesTable.status, count: count() })
    .from(inquiriesTable)
    .groupBy(inquiriesTable.status);

  const quotationStatusRows = await db
    .select({ status: quotationsTable.status, count: count() })
    .from(quotationsTable)
    .groupBy(quotationsTable.status);

  const openInquiries = inquiryStatusRows
    .filter((r) => r.status === "new" || r.status === "in_progress")
    .reduce((acc, r) => acc + r.count, 0);

  const pendingQuotations = quotationStatusRows
    .filter((r) => r.status === "draft" || r.status === "sent")
    .reduce((acc, r) => acc + r.count, 0);

  const [[{ activeCustomerPos }]] = await Promise.all([
    db
      .select({ activeCustomerPos: count() })
      .from(customerPosTable)
      .where(sql`${customerPosTable.status} IN ('received', 'processing')`),
  ]);

  const [{ activeSupplierPos }] = await db
    .select({ activeSupplierPos: count() })
    .from(supplierPosTable)
    .where(sql`${supplierPosTable.status} IN ('draft', 'sent', 'confirmed')`);

  const revenueResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${customerPosTable.totalAmount}), 0)` })
    .from(customerPosTable)
    .where(eq(customerPosTable.status, "fulfilled"));

  const totalRevenue = Number(revenueResult[0]?.total ?? 0);

  res.json({
    totalCustomers,
    totalSuppliers,
    openInquiries,
    pendingQuotations,
    activeCustomerPos,
    activeSupplierPos,
    totalRevenue,
    inquiryStatusBreakdown: inquiryStatusRows.map((r) => ({ status: r.status, count: r.count })),
    quotationStatusBreakdown: quotationStatusRows.map((r) => ({ status: r.status, count: r.count })),
  });
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const [inquiries, quotations, customerPos, supplierPos] = await Promise.all([
    db
      .select({ id: inquiriesTable.id, title: inquiriesTable.title, status: inquiriesTable.status, createdAt: inquiriesTable.createdAt })
      .from(inquiriesTable)
      .orderBy(sql`${inquiriesTable.createdAt} DESC`)
      .limit(5),
    db
      .select({ id: quotationsTable.id, quotationNumber: quotationsTable.quotationNumber, status: quotationsTable.status, createdAt: quotationsTable.createdAt })
      .from(quotationsTable)
      .orderBy(sql`${quotationsTable.createdAt} DESC`)
      .limit(5),
    db
      .select({ id: customerPosTable.id, poNumber: customerPosTable.poNumber, status: customerPosTable.status, createdAt: customerPosTable.createdAt })
      .from(customerPosTable)
      .orderBy(sql`${customerPosTable.createdAt} DESC`)
      .limit(5),
    db
      .select({ id: supplierPosTable.id, poNumber: supplierPosTable.poNumber, status: supplierPosTable.status, createdAt: supplierPosTable.createdAt })
      .from(supplierPosTable)
      .orderBy(sql`${supplierPosTable.createdAt} DESC`)
      .limit(5),
  ]);

  const activities = [
    ...inquiries.map((i) => ({
      id: i.id,
      type: "inquiry" as const,
      title: i.title,
      subtitle: `Status: ${i.status}`,
      status: i.status,
      createdAt: i.createdAt,
    })),
    ...quotations.map((q) => ({
      id: q.id,
      type: "quotation" as const,
      title: `Quotation ${q.quotationNumber ?? `#${q.id}`}`,
      subtitle: `Status: ${q.status}`,
      status: q.status,
      createdAt: q.createdAt,
    })),
    ...customerPos.map((p) => ({
      id: p.id,
      type: "customer_po" as const,
      title: `Customer PO ${p.poNumber ?? `#${p.id}`}`,
      subtitle: `Status: ${p.status}`,
      status: p.status,
      createdAt: p.createdAt,
    })),
    ...supplierPos.map((p) => ({
      id: p.id,
      type: "supplier_po" as const,
      title: `Supplier PO ${p.poNumber ?? `#${p.id}`}`,
      subtitle: `Status: ${p.status}`,
      status: p.status,
      createdAt: p.createdAt,
    })),
  ];

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(activities.slice(0, 15));
});

export default router;
