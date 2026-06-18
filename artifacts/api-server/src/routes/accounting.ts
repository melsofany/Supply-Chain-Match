import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, supplierPosTable, customerPosTable, suppliersTable, invoicesTable } from "@workspace/db";
import {
  listAccounts,
  listVouchers,
  createVoucher,
  getTrialBalance,
  getBalanceSheet,
  getProfitLoss,
  getDayBook,
  getGroupSummary,
  processJobs,
} from "ledgerstack-core";

type VoucherType = "JOURNAL" | "PAYMENT" | "RECEIPT" | "SALES" | "PURCHASE" | "CONTRA" | "OPENING" | "ADJUSTMENT";
import {
  companyId,
  getYearId,
  getAccountByCode,
  postInvoiceJournalEntry,
  postSupplierPoJournalEntry,
} from "../lib/ledger-service";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// حساب تكاليف أمر التوريد — القانون المصري
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// المسارات القديمة — تحليل أوامر التوريد
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

router.get("/accounting/summary", async (req, res): Promise<void> => {
  const analyses = await buildPoAnalysis();

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
    fulfilledCount: analyses.filter((a) => a.status === "delivered" || a.status === "confirmed").length,
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
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  const analyses = await buildPoAnalysis(eq(supplierPosTable.id, id));
  if (analyses.length === 0) { res.status(404).json({ error: "Supplier PO not found" }); return; }
  res.json(analyses[0]);
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// مسارات نظام المحاسبة المتكامل — LedgerStack Core
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** دليل الحسابات */
router.get("/accounting/ledger/accounts", async (req, res): Promise<void> => {
  const accounts = await listAccounts(companyId);
  const groups = await pool.query(
    `SELECT * FROM account_groups WHERE company_id = $1 ORDER BY position`,
    [companyId]
  );
  const groupMap = Object.fromEntries(groups.rows.map((g) => [g.id, g]));
  const enriched = accounts.map((a: any) => ({
    ...a,
    group: groupMap[a.group_id] ?? null,
  }));
  res.json(enriched);
});

/** مجموعات الحسابات */
router.get("/accounting/ledger/groups", async (req, res): Promise<void> => {
  const groups = await pool.query(
    `SELECT * FROM account_groups WHERE company_id = $1 ORDER BY position, name`,
    [companyId]
  );
  res.json(groups.rows);
});

/** قيود اليومية */
router.get("/accounting/ledger/vouchers", async (req, res): Promise<void> => {
  const { type, from, to, limit: limitStr, offset: offsetStr } = req.query as Record<string, string>;

  let sql = `SELECT v.*, array_agg(
    json_build_object(
      'id', ve.id, 'account_id', ve.account_id, 'debit', ve.debit, 'credit', ve.credit,
      'account_code', a.code, 'account_name', a.name
    ) ORDER BY ve.id
  ) as entries
  FROM vouchers v
  LEFT JOIN voucher_entries ve ON ve.voucher_id = v.id
  LEFT JOIN accounts a ON a.id = ve.account_id
  WHERE v.company_id = $1 AND v.is_deleted = false`;

  const params: unknown[] = [companyId];
  let idx = 2;

  if (type) { sql += ` AND v.voucher_type = $${idx++}`; params.push(type); }
  if (from) { sql += ` AND v.date >= $${idx++}`; params.push(from); }
  if (to)   { sql += ` AND v.date <= $${idx++}`; params.push(to); }

  sql += ` GROUP BY v.id ORDER BY v.date DESC, v.created_at DESC`;

  const lim = Math.min(Number(limitStr) || 50, 200);
  const off = Number(offsetStr) || 0;
  sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(lim, off);

  const result = await pool.query(sql, params);
  res.json(result.rows);
});

/** إنشاء قيد يومي يدوي */
router.post("/accounting/ledger/vouchers", async (req, res): Promise<void> => {
  const { date, narration, voucher_type, entries } = req.body as {
    date: string;
    narration: string;
    voucher_type: string;
    entries: Array<{ account_id: string; debit: number; credit: number }>;
  };

  if (!date || !entries || entries.length < 2) {
    res.status(400).json({ error: "يجب توفير التاريخ وقيدين على الأقل" });
    return;
  }

  const totalDebit = entries.reduce((s, e) => s + Number(e.debit), 0);
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    res.status(400).json({ error: `القيد غير متوازن — مدين: ${totalDebit.toFixed(2)}, دائن: ${totalCredit.toFixed(2)}` });
    return;
  }

  const yearId = await getYearId();
  const ref = `JV-${Date.now()}`;

  const result = await createVoucher({
    company_id: companyId,
    reference_id: ref,
    voucher_type: (voucher_type || "JOURNAL") as VoucherType,
    date,
    narration: narration || "قيد يومي",
    entries: entries.map((e) => ({
      account_id: e.account_id,
      debit: Number(e.debit),
      credit: Number(e.credit),
    })),
  });

  await processJobs();
  res.status(201).json(result);
});

/** ميزان المراجعة */
router.get("/accounting/ledger/trial-balance", async (req, res): Promise<void> => {
  const rows = await getTrialBalance(companyId);
  const totalDebit = (rows as any[]).reduce((s, r) => s + Number(r.debit_total || 0), 0);
  const totalCredit = (rows as any[]).reduce((s, r) => s + Number(r.credit_total || 0), 0);
  res.json({ rows, totalDebit, totalCredit });
});

/** قائمة الدخل */
router.get("/accounting/ledger/income-statement", async (req, res): Promise<void> => {
  const data = await getProfitLoss(companyId);
  res.json(data);
});

/** الميزانية العمومية */
router.get("/accounting/ledger/balance-sheet", async (req, res): Promise<void> => {
  const data = await getBalanceSheet(companyId);
  res.json(data);
});

/** دفتر اليومية */
router.get("/accounting/ledger/day-book", async (req, res): Promise<void> => {
  const { date } = req.query as Record<string, string>;
  const targetDate = date || new Date().toISOString().split("T")[0];
  const data = await getDayBook(companyId, targetDate);
  res.json(data);
});

/** ملخص مجموعات الحسابات */
router.get("/accounting/ledger/group-summary", async (req, res): Promise<void> => {
  const data = await getGroupSummary(companyId);
  res.json(data);
});

/** تقرير ضريبة القيمة المضافة — مدخلات ومخرجات */
router.get("/accounting/vat-report", async (req, res): Promise<void> => {
  const { from, to } = req.query as Record<string, string>;

  const fromDate = from || `${new Date().getFullYear()}-01-01`;
  const toDate = to || new Date().toISOString().split("T")[0];

  const poRows = await db
    .select({
      id: supplierPosTable.id,
      poNumber: supplierPosTable.poNumber,
      supplierName: suppliersTable.name,
      totalAmount: supplierPosTable.totalAmount,
      vatRate: supplierPosTable.vatRate,
      createdAt: supplierPosTable.createdAt,
      status: supplierPosTable.status,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id));

  const inputVatItems = poRows.map((r) => {
    const base = Number(r.totalAmount ?? 0);
    const vatRate = Number(r.vatRate ?? 0.14);
    const vatAmount = Math.round(base * vatRate * 100) / 100;
    return {
      ref: r.poNumber,
      party: r.supplierName,
      base,
      vatRate: vatRate * 100,
      vatAmount,
      date: r.createdAt,
      status: r.status,
      type: "input",
    };
  });

  const invoiceRows = await pool.query(
    `SELECT i.invoice_number, i.total_amount, i.issue_date, i.status,
            c.name as customer_name
     FROM invoices i
     LEFT JOIN customer_pos cpo ON cpo.id = i.customer_po_id
     LEFT JOIN customers c ON c.id = cpo.customer_id
     WHERE i.issue_date >= $1 AND i.issue_date <= $2`,
    [fromDate, toDate]
  );

  const VAT_RATE = 0.14;
  const outputVatItems = invoiceRows.rows.map((r: any) => {
    const total = Number(r.total_amount ?? 0);
    const vatAmount = Math.round((total * VAT_RATE) / (1 + VAT_RATE) * 100) / 100;
    const base = total - vatAmount;
    return {
      ref: r.invoice_number,
      party: r.customer_name,
      base: Math.round(base * 100) / 100,
      vatRate: 14,
      vatAmount,
      date: r.issue_date,
      status: r.status,
      type: "output",
    };
  });

  const totalInputVat = inputVatItems.reduce((s, i) => s + i.vatAmount, 0);
  const totalOutputVat = outputVatItems.reduce((s, i) => s + i.vatAmount, 0);
  const netVatPayable = totalOutputVat - totalInputVat;

  res.json({
    period: { from: fromDate, to: toDate },
    inputVat: { items: inputVatItems, total: Math.round(totalInputVat * 100) / 100 },
    outputVat: { items: outputVatItems, total: Math.round(totalOutputVat * 100) / 100 },
    netVatPayable: Math.round(netVatPayable * 100) / 100,
    vatPosition: netVatPayable >= 0 ? "payable" : "refundable",
    filingDue: "قبل آخر الشهر التالي للفترة الضريبية",
    legalRef: "قانون 67/2016 — ضريبة القيمة المضافة",
  });
});

/** تقرير ضريبة الخصم والإضافة */
router.get("/accounting/wht-report", async (req, res): Promise<void> => {
  const { from, to } = req.query as Record<string, string>;
  const fromDate = from || `${new Date().getFullYear()}-01-01`;
  const toDate = to || new Date().toISOString().split("T")[0];

  const rows = await db
    .select({
      id: supplierPosTable.id,
      poNumber: supplierPosTable.poNumber,
      supplierName: suppliersTable.name,
      totalAmount: supplierPosTable.totalAmount,
      withholdingTaxRate: supplierPosTable.withholdingTaxRate,
      createdAt: supplierPosTable.createdAt,
      status: supplierPosTable.status,
    })
    .from(supplierPosTable)
    .leftJoin(suppliersTable, eq(supplierPosTable.supplierId, suppliersTable.id));

  const items = rows.map((r) => {
    const base = Number(r.totalAmount ?? 0);
    const whtRate = Number(r.withholdingTaxRate ?? 0.005);
    const whtAmount = Math.round(base * whtRate * 100) / 100;
    return {
      ref: r.poNumber,
      supplierName: r.supplierName,
      base,
      whtRate: whtRate * 100,
      whtAmount,
      date: r.createdAt,
      status: r.status,
    };
  });

  const totalWht = items.reduce((s, i) => s + i.whtAmount, 0);

  res.json({
    period: { from: fromDate, to: toDate },
    items,
    totalWht: Math.round(totalWht * 100) / 100,
    filingSchedule: "ربع سنوي — يناير، أبريل، يوليو، أكتوبر",
    legalRef: "المادة 59 — قانون الضريبة على الدخل 91/2005",
    note: "يُستقطع من مستحقات المورد ويُورَّد لمصلحة الضرائب المصرية",
  });
});

/** حاسبة التأمينات الاجتماعية */
router.post("/accounting/social-insurance/calculate", async (req, res): Promise<void> => {
  const { basicSalary, allowances, employeeCount } = req.body as {
    basicSalary: number;
    allowances?: number;
    employeeCount?: number;
  };

  if (!basicSalary || basicSalary <= 0) {
    res.status(400).json({ error: "يجب توفير الراتب الأساسي" });
    return;
  }

  const MAX_INSURABLE_SALARY = 11400;
  const MIN_INSURABLE_SALARY = 1700;
  const count = employeeCount || 1;
  const totalAllowances = allowances || 0;
  const totalSalary = basicSalary + totalAllowances;

  const insurableSalary = Math.min(Math.max(totalSalary, MIN_INSURABLE_SALARY), MAX_INSURABLE_SALARY);

  const EMPLOYER_RATE = 0.26;
  const EMPLOYEE_RATE = 0.11;

  const employerShare = Math.round(insurableSalary * EMPLOYER_RATE * 100) / 100;
  const employeeShare = Math.round(insurableSalary * EMPLOYEE_RATE * 100) / 100;
  const totalPerEmployee = employerShare + employeeShare;

  res.json({
    perEmployee: {
      basicSalary,
      allowances: totalAllowances,
      totalSalary,
      insurableSalary,
      employerShare: { rate: "26%", amount: employerShare },
      employeeShare: { rate: "11%", amount: employeeShare },
      totalMonthly: totalPerEmployee,
    },
    forAllEmployees: {
      count,
      totalEmployerShare: Math.round(employerShare * count * 100) / 100,
      totalEmployeeShare: Math.round(employeeShare * count * 100) / 100,
      totalMonthly: Math.round(totalPerEmployee * count * 100) / 100,
      totalAnnual: Math.round(totalPerEmployee * count * 12 * 100) / 100,
    },
    legalBasis: {
      law: "قانون التأمين الاجتماعي والمعاشات 148/2019",
      minInsurableSalary: `${MIN_INSURABLE_SALARY.toLocaleString("ar-EG")} جنيه`,
      maxInsurableSalary: `${MAX_INSURABLE_SALARY.toLocaleString("ar-EG")} جنيه`,
      filingSchedule: "شهري — قبل اليوم الخامس عشر من الشهر التالي",
      authority: "الهيئة القومية للتأمين الاجتماعي",
    },
  });
});

/** تسجيل قيد محاسبي من فاتورة */
router.post("/accounting/ledger/post-invoice/:invoiceId", async (req, res): Promise<void> => {
  const id = Number(req.params.invoiceId);
  if (isNaN(id)) { res.status(400).json({ error: "معرّف غير صحيح" }); return; }

  const inv = await pool.query(`SELECT * FROM invoices WHERE id = $1`, [id]);
  if (!inv.rows[0]) { res.status(404).json({ error: "الفاتورة غير موجودة" }); return; }

  const invoice = inv.rows[0];
  const total = Number(invoice.total_amount || 0);
  const vatAmount = Math.round(total * 0.14 / 1.14 * 100) / 100;

  await postInvoiceJournalEntry({
    invoiceNumber: invoice.invoice_number,
    invoiceDate: invoice.issue_date?.toString()?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    totalAmount: total,
    vatAmount,
    narration: `قيد فاتورة العميل رقم ${invoice.invoice_number}`,
  });

  res.json({ success: true, message: "تم تسجيل قيد الفاتورة في دفتر اليومية" });
});

/** تسجيل قيد محاسبي من أمر شراء */
router.post("/accounting/ledger/post-supplier-po/:poId", async (req, res): Promise<void> => {
  const id = Number(req.params.poId);
  if (isNaN(id)) { res.status(400).json({ error: "معرّف غير صحيح" }); return; }

  const rows = await buildPoAnalysis(eq(supplierPosTable.id, id));
  if (!rows[0]) { res.status(404).json({ error: "أمر الشراء غير موجود" }); return; }

  const po = rows[0];

  await postSupplierPoJournalEntry({
    poNumber: po.supplierPoNumber ?? `PO-${id}`,
    poDate: po.createdAt?.toString()?.split("T")[0] ?? new Date().toISOString().split("T")[0],
    grossAmount: po.grossCost,
    vatAmount: po.vatAmount,
    withholdingTaxAmount: po.withholdingTaxAmount,
    insuranceAmount: po.insuranceAmount,
    stampDutyAmount: po.stampDutyAmount,
    narration: `قيد أمر شراء رقم ${po.supplierPoNumber} — المورد: ${po.supplierName ?? ""}`,
  });

  res.json({ success: true, message: "تم تسجيل قيد أمر الشراء في دفتر اليومية" });
});

/** بطاقة حساب */
router.get("/accounting/ledger/account/:accountId/ledger", async (req, res): Promise<void> => {
  const accountId = req.params.accountId;
  const { from, to } = req.query as Record<string, string>;

  const fromDate = from || `${new Date().getFullYear()}-01-01`;
  const toDate = to || new Date().toISOString().split("T")[0];

  const entries = await pool.query(
    `SELECT ve.*, v.date, v.narration, v.voucher_type, v.reference_id
     FROM voucher_entries ve
     JOIN vouchers v ON v.id = ve.voucher_id
     WHERE ve.account_id = $1
       AND v.company_id = $2
       AND v.is_deleted = false
       AND v.date >= $3
       AND v.date <= $4
     ORDER BY v.date, v.created_at`,
    [accountId, companyId, fromDate, toDate]
  );

  const acc = await pool.query(`SELECT * FROM accounts WHERE id = $1`, [accountId]);

  let runningBalance = 0;
  const withBalance = entries.rows.map((e: any) => {
    runningBalance += Number(e.debit || 0) - Number(e.credit || 0);
    return { ...e, running_balance: Math.round(runningBalance * 100) / 100 };
  });

  res.json({
    account: acc.rows[0] ?? null,
    entries: withBalance,
    period: { from: fromDate, to: toDate },
    totals: {
      debit: entries.rows.reduce((s: number, e: any) => s + Number(e.debit || 0), 0),
      credit: entries.rows.reduce((s: number, e: any) => s + Number(e.credit || 0), 0),
    },
  });
});

export default router;
