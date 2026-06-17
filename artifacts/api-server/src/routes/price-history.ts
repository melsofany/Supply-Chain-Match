import { Router, type IRouter } from "express";
import { eq, ilike, and } from "drizzle-orm";
import { db, itemPriceHistoryTable, suppliersTable, customersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

async function buildEntries(where?: any) {
  const rows = await db
    .select({
      id: itemPriceHistoryTable.id,
      itemDescription: itemPriceHistoryTable.itemDescription,
      supplierId: itemPriceHistoryTable.supplierId,
      supplierName: suppliersTable.name,
      customerId: itemPriceHistoryTable.customerId,
      customerName: customersTable.name,
      quotationId: itemPriceHistoryTable.quotationId,
      unitPrice: itemPriceHistoryTable.unitPrice,
      quantity: itemPriceHistoryTable.quantity,
      unit: itemPriceHistoryTable.unit,
      resultedInPo: itemPriceHistoryTable.resultedInPo,
      notes: itemPriceHistoryTable.notes,
      createdAt: itemPriceHistoryTable.createdAt,
    })
    .from(itemPriceHistoryTable)
    .leftJoin(suppliersTable, eq(itemPriceHistoryTable.supplierId, suppliersTable.id))
    .leftJoin(customersTable, eq(itemPriceHistoryTable.customerId, customersTable.id))
    .where(where)
    .orderBy(sql`${itemPriceHistoryTable.createdAt} DESC`)
    .limit(100);

  return rows.map((r) => ({
    ...r,
    unitPrice: Number(r.unitPrice),
    quantity: r.quantity != null ? Number(r.quantity) : null,
  }));
}

router.get("/price-history", async (req, res): Promise<void> => {
  const { q, supplierId } = req.query;

  const conditions: any[] = [];
  if (q && typeof q === "string" && q.trim()) {
    conditions.push(ilike(itemPriceHistoryTable.itemDescription, `%${q.trim()}%`));
  }
  if (supplierId && !isNaN(Number(supplierId))) {
    conditions.push(eq(itemPriceHistoryTable.supplierId, Number(supplierId)));
  }

  const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
  const entries = await buildEntries(where);
  res.json(entries);
});

router.get("/price-history/suggestions", async (req, res): Promise<void> => {
  const { q } = req.query;
  if (!q || typeof q !== "string" || !q.trim()) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }

  const entries = await buildEntries(ilike(itemPriceHistoryTable.itemDescription, `%${q.trim()}%`));

  const successEntries = entries.filter((e) => e.resultedInPo);
  const failedEntries = entries.filter((e) => !e.resultedInPo);

  const lowestSuccessfulPrice = successEntries.length > 0
    ? Math.min(...successEntries.map((e) => e.unitPrice))
    : null;

  const highestFailedPrice = failedEntries.length > 0
    ? Math.max(...failedEntries.map((e) => e.unitPrice))
    : null;

  const hasWarning = highestFailedPrice != null;
  const suggestedMaxPrice = highestFailedPrice != null ? Math.round(highestFailedPrice * 0.95 * 100) / 100 : null;

  let warningMessage: string | null = null;
  if (hasWarning && highestFailedPrice != null) {
    warningMessage = `تحذير: آخر سعر مقدّم لهذا البند كان ${highestFailedPrice.toLocaleString()} ولم يؤدِ لإصدار أمر شراء — يُنصح بعدم تجاوز ${suggestedMaxPrice?.toLocaleString()} لتكون أقل من المنافس`;
  }

  res.json({
    query: q.trim(),
    hasWarning,
    warningMessage,
    lowestSuccessfulPrice,
    highestFailedPrice,
    suggestedMaxPrice,
    entries: entries.slice(0, 20),
  });
});

export default router;
