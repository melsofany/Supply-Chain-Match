import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, supplierPosTable, customerPosTable, suppliersTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * حساب تكاليف أمر التوريد وفق القانون المصري 2026
 *
 * المعادلة:
 *   إجمالي التكلفة = قيمة البضاعة
 *                   + تأمين نهائي (3% للعقود الحكومية — قانون 182/2018)
 *                   + ضريبة القيمة المضافة (14% — قانون 67/2016)
 *                   + خصم تحت حساب الضريبة (0.5% — المادة 59 قانون 91/2005)
 *                   + ضريبة الدمغة النسبية (0.1% — قانون 111/1980)
 *                   + تكاليف تشغيلية
 */
function computeCosts(po: {
  totalAmount: string | null;
  insuranceRate: string;
  vatRate: string;
  withholdingTaxRate: string;
  stampDutyRate: string;
  operatingCost: string;
}) {
  const grossCost = po.totalAmount != null ? Number(po.totalAmount) : 0;
  const insuranceRate = Number(po.insuranceRate);
  const vatRate = Number(po.vatRate);
  const withholdingTaxRate = Number(po.withholdingTaxRate);
  const stampDutyRate = Number(po.stampDutyRate);
  const operatingCost = Number(po.operatingCost);

  const insuranceAmount = Math.round(grossCost * insuranceRate * 100) / 100;
  const vatAmount = Math.round(grossCost * vatRate * 100) / 100;
  const withholdingTaxAmount = Math.round(grossCost * withholdingTaxRate * 100) / 100;
  const stampDutyAmount = Math.round(grossCost * stampDutyRate * 100) / 100;
  const totalCost = Math.round(
    (grossCost + insuranceAmount + vatAmount + withholdingTaxAmount + stampDutyAmount + operatingCost) * 100
  ) / 100;

  return {
    grossCost,
    insuranceRate, insuranceAmount,
    vatRate, vatAmount,
    withholdingTaxRate, withholdingTaxAmount,
    stampDutyRate, stampDutyAmount,
    operatingCost,
    totalCost,
  };
}

async function buildPoAnalysis(where?: any) {
  const rows = await db
    .select({
      id: supplierPosTable.id,
      poNumber: supplierPosTable.poNumber,
      supplierId: supplierPosTable.supplierId,
      supplierName: suppliersTable.name,
      customerPoId: supplierPosTable.customerPoId,
      status: supplierPosTable.status,
      totalAmount: supplierPosTable.totalAmount,
      insuranceRate: supplierPosTable.insuranceRate,
      vatRate: supplierPosTable.vatRate,
      withholdingTaxRate: supplierPosTable.withholdingTaxRate,
      stampDutyRate: supplierPosTable.stampDutyRate,
      operatingCost: supplierPosTable.operatingCost,
      createdAt: supplierPosTable.createdAt,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id))
    .where(where)
    .orderBy(supplierPosTable.createdAt);

  const customerPoIds = rows.map((r) => r.customerPoId).filter(Boolean) as number[];
  let customerPoMap: Record<number, { totalAmount: string | null; poNumber: string | null }> = {};

  if (customerPoIds.length > 0) {
    const customerPos = await db
      .select({ id: customerPosTable.id, totalAmount: customerPosTable.totalAmount, poNumber: customerPosTable.poNumber })
      .from(customerPosTable)
      .where(inArray(customerPosTable.id, customerPoIds));
    for (const cpo of customerPos) {
      customerPoMap[cpo.id] = { totalAmount: cpo.totalAmount, poNumber: cpo.poNumber };
    }
  }

  return rows.map((row) => {
    const costs = computeCosts(row);
    const linkedCpo = row.customerPoId != null ? customerPoMap[row.customerPoId] : null;
    const revenue = linkedCpo?.totalAmount != null ? Number(linkedCpo.totalAmount) : null;
    const profit = revenue != null ? Math.round((revenue - costs.totalCost) * 100) / 100 : null;
    const profitMargin = revenue != null && revenue > 0
      ? Math.round((profit! / revenue) * 10000) / 100
      : null;

    return {
      supplierPoId: row.id,
      supplierPoNumber: row.poNumber,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      customerPoId: row.customerPoId,
      customerPoNumber: linkedCpo?.poNumber ?? null,
      status: row.status,
      ...costs,
      revenue,
      profit,
      profitMargin,
      createdAt: row.createdAt,
    };
  });
}

router.get("/accounting/summary", async (req, res): Promise<void> => {
  const analyses = await buildPoAnalysis();

  const fulfilledAnalyses = analyses.filter((a) => a.status === "delivered" || a.status === "confirmed");
  const totalRevenue = analyses.reduce((sum, a) => sum + (a.revenue ?? 0), 0);
  const totalCost = analyses.reduce((sum, a) => sum + a.totalCost, 0);
  const totalProfit = analyses.reduce((sum, a) => sum + (a.profit ?? 0), 0);
  const totalInsurance = analyses.reduce((sum, a) => sum + a.insuranceAmount, 0);
  const totalVat = analyses.reduce((sum, a) => sum + a.vatAmount, 0);
  const totalWithholdingTax = analyses.reduce((sum, a) => sum + a.withholdingTaxAmount, 0);
  const totalStampDuty = analyses.reduce((sum, a) => sum + a.stampDutyAmount, 0);
  const totalOperatingCost = analyses.reduce((sum, a) => sum + a.operatingCost, 0);

  const profitableWithRevenue = analyses.filter((a) => a.revenue != null && a.revenue > 0);
  const avgProfitMargin = profitableWithRevenue.length > 0
    ? Math.round(profitableWithRevenue.reduce((sum, a) => sum + (a.profitMargin ?? 0), 0) / profitableWithRevenue.length * 100) / 100
    : 0;

  res.json({
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    avgProfitMargin,
    fulfilledCount: fulfilledAnalyses.length,
    totalInsurance: Math.round(totalInsurance * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalWithholdingTax: Math.round(totalWithholdingTax * 100) / 100,
    totalStampDuty: Math.round(totalStampDuty * 100) / 100,
    totalOperatingCost: Math.round(totalOperatingCost * 100) / 100,
  });
});

router.get("/accounting/po-analysis", async (req, res): Promise<void> => {
  const analyses = await buildPoAnalysis();
  res.json(analyses);
});

router.get("/accounting/po-analysis/:supplierPoId", async (req, res): Promise<void> => {
  const id = Number(req.params.supplierPoId);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const analyses = await buildPoAnalysis(eq(supplierPosTable.id, id));
  if (analyses.length === 0) {
    res.status(404).json({ error: "Supplier PO not found" });
    return;
  }
  res.json(analyses[0]);
});

export default router;
