/**
 * LedgerStack Core — خدمة المحاسبة
 *
 * تهيئة نظام المحاسبة بالقيد المزدوج (ledgerstack-core) مع
 * دليل الحسابات المصري وفق النظام المحاسبي الموحد المصري.
 *
 * الضرائب المعالَجة:
 *  - ضريبة القيمة المضافة  14%  (قانون 67/2016)
 *  - ضريبة الخصم والإضافة  0.5% (قانون 91/2005 م.59)
 *  - تأمين نهائي           3%   (قانون 182/2018)
 *  - ضريبة الدمغة          0.1% (قانون 111/1980)
 *  - التأمينات الاجتماعية       (قانون 148/2019)
 */

import {
  initAccounts,
  migrate,
  createCompany,
  createYear,
  setActiveYear,
  createGroup,
  createAccount,
  createVoucher,
  processJobs,
} from "ledgerstack-core";
import { createLedgerAdapter } from "./ledger-adapter";
import { pool } from "@workspace/db";
import { logger } from "./logger";

const COMPANY_ID = "tradecore-main";
const COMPANY_NAME = "TradeCore — للتجارة العامة والتوريدات";
const BASE_CURRENCY = "EGP";

let initialized = false;
let currentYearId = "";
export let companyId = COMPANY_ID;

export async function getYearId() {
  return currentYearId;
}

export async function initLedger() {
  if (initialized) return;

  const adapter = createLedgerAdapter();

  await initAccounts({
    adapter,
    tenant: false,
    worker: false,
    autoMigrate: false,
  } as any);

  await migrate(adapter as any);

  const ensured = await ensureCompanyAndYear(adapter);
  currentYearId = ensured.yearId;

  initialized = true;
  logger.info({ companyId: COMPANY_ID, yearId: currentYearId }, "LedgerStack Core initialized");
}

async function ensureCompanyAndYear(adapter: any) {
  const existingCompanies = await adapter.select("companies", { id: COMPANY_ID });

  if (existingCompanies.length === 0) {
    await adapter.insert("companies", {
      id: COMPANY_ID,
      tenant_id: null,
      name: COMPANY_NAME,
      base_currency: BASE_CURRENCY,
      created_at: new Date().toISOString(),
    });
    logger.info("Created TradeCore company in ledger");

    await setupEgyptianChartOfAccounts();
  }

  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const yearEnd = `${now.getFullYear()}-12-31`;
  const yearName = `السنة المالية ${now.getFullYear()}`;

  const existingYears = await adapter.select("financial_years", { company_id: COMPANY_ID });
  const currentYear = existingYears.find(
    (y: any) => y.start_date.toString().startsWith(String(now.getFullYear()))
  );

  if (!currentYear) {
    const year = await createYear(COMPANY_ID, yearStart, yearEnd, yearName);
    await setActiveYear(COMPANY_ID, year.id);
    logger.info({ yearId: year.id }, "Created financial year");
    return { yearId: year.id };
  } else {
    if (currentYear.is_active === false) {
      await setActiveYear(COMPANY_ID, currentYear.id);
    }
    return { yearId: currentYear.id as string };
  }
}

/**
 * دليل الحسابات المصري — النظام المحاسبي الموحد المصري
 *
 * المجموعات الرئيسية:
 *   1xx - الأصول     (ASSET)
 *   2xx - الخصوم     (LIABILITY)
 *   3xx - حقوق الملكية (EQUITY)
 *   4xx - الإيرادات  (INCOME)
 *   5xx - المصروفات  (EXPENSE)
 */
export async function setupEgyptianChartOfAccounts() {
  logger.info("Setting up Egyptian Chart of Accounts...");

  const cid = COMPANY_ID;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // المجموعة الأولى: الأصول ASSET - طبيعة مدينة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const gCurrentAssets = await createGroup(cid, {
    name: "الأصول المتداولة",
    parent_id: null,
    type: "ASSET",
    nature: "DEBIT",
    position: 1,
  });

  const gFixedAssets = await createGroup(cid, {
    name: "الأصول الثابتة",
    parent_id: null,
    type: "ASSET",
    nature: "DEBIT",
    position: 2,
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // المجموعة الثانية: الخصوم LIABILITY - طبيعة دائنة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const gCurrentLiabilities = await createGroup(cid, {
    name: "الخصوم المتداولة",
    parent_id: null,
    type: "LIABILITY",
    nature: "CREDIT",
    position: 3,
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // المجموعة الثالثة: حقوق الملكية EQUITY - طبيعة دائنة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const gEquity = await createGroup(cid, {
    name: "حقوق الملكية",
    parent_id: null,
    type: "EQUITY",
    nature: "CREDIT",
    position: 4,
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // المجموعة الرابعة: الإيرادات INCOME - طبيعة دائنة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const gRevenue = await createGroup(cid, {
    name: "الإيرادات",
    parent_id: null,
    type: "INCOME",
    nature: "CREDIT",
    position: 5,
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // المجموعة الخامسة: المصروفات EXPENSE - طبيعة مدينة
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const gCOGS = await createGroup(cid, {
    name: "تكلفة البضاعة المباعة",
    parent_id: null,
    type: "EXPENSE",
    nature: "DEBIT",
    position: 6,
  });

  const gOpex = await createGroup(cid, {
    name: "المصروفات التشغيلية والإدارية",
    parent_id: null,
    type: "EXPENSE",
    nature: "DEBIT",
    position: 7,
  });

  const gTaxExpenses = await createGroup(cid, {
    name: "المصروفات الضريبية والتأمينات",
    parent_id: null,
    type: "EXPENSE",
    nature: "DEBIT",
    position: 8,
  });

  // ── إنشاء الحسابات ──────────────────────────────

  // أصول متداولة
  await createAccount(cid, { code: "1101", name: "الصندوق — نقدية بالخزينة", group_id: gCurrentAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "1102", name: "البنوك — حسابات جارية", group_id: gCurrentAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "1201", name: "ذمم مدينة — عملاء", group_id: gCurrentAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "1202", name: "ضريبة القيمة المضافة — مدخلات (مستردة)", group_id: gCurrentAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "1203", name: "ضريبة الخصم المحتجزة لدى العملاء", group_id: gCurrentAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "1301", name: "المخزون — بضاعة في المستودع", group_id: gCurrentAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "1401", name: "مصروفات مدفوعة مقدماً", group_id: gCurrentAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });

  // أصول ثابتة
  await createAccount(cid, { code: "1501", name: "أثاث ومعدات مكتبية", group_id: gFixedAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "1601", name: "مجمع إهلاك الأصول الثابتة", group_id: gFixedAssets.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });

  // خصوم متداولة
  await createAccount(cid, { code: "2101", name: "ذمم دائنة — موردون", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "2201", name: "ضريبة القيمة المضافة — مخرجات مستحقة (14%)", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "2202", name: "ضريبة الخصم والإضافة المستحقة للضرائب (0.5%)", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "2203", name: "التأمينات الاجتماعية المستحقة — قانون 148/2019", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "2204", name: "ضريبة الدمغة النسبية المستحقة (0.1%)", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "2205", name: "تأمين نهائي مستحق — عقود حكومية (3%)", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "2206", name: "ضريبة الدخل المستحقة على الشركة", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "2301", name: "إيرادات مؤجلة — دفعات مقدمة من العملاء", group_id: gCurrentLiabilities.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });

  // حقوق الملكية
  await createAccount(cid, { code: "3101", name: "رأس المال المدفوع", group_id: gEquity.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "3201", name: "الأرباح المحتجزة", group_id: gEquity.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "3301", name: "الأرباح والخسائر عن السنة الحالية", group_id: gEquity.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });

  // إيرادات
  await createAccount(cid, { code: "4101", name: "إيرادات مبيعات البضائع والتوريدات", group_id: gRevenue.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "4201", name: "إيرادات عمولات ورسوم خدمات", group_id: gRevenue.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "4301", name: "إيرادات أخرى", group_id: gRevenue.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });

  // تكلفة البضاعة المباعة
  await createAccount(cid, { code: "5101", name: "تكلفة البضاعة المباعة — تكلفة التوريد", group_id: gCOGS.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });

  // مصروفات تشغيلية
  await createAccount(cid, { code: "5201", name: "أجور ومرتبات الموظفين", group_id: gOpex.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "5202", name: "إيجار المقر والمستودعات", group_id: gOpex.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "5203", name: "مصروفات إدارية وعمومية", group_id: gOpex.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "5204", name: "مصروفات النقل والشحن", group_id: gOpex.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "5205", name: "تكاليف تشغيلية متنوعة", group_id: gOpex.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });

  // مصروفات ضريبية وتأمينات
  await createAccount(cid, { code: "5301", name: "ضريبة القيمة المضافة — مدخلات غير قابلة للاسترداد", group_id: gTaxExpenses.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });
  await createAccount(cid, { code: "5302", name: "ضريبة الخصم والإضافة المسددة (0.5% — قانون 91/2005)", group_id: gTaxExpenses.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "5303", name: "حصة صاحب العمل في التأمينات الاجتماعية (26%)", group_id: gTaxExpenses.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "5304", name: "ضريبة الدمغة النسبية (0.1% — قانون 111/1980)", group_id: gTaxExpenses.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "5305", name: "تأمين نهائي — عقود حكومية (3% — قانون 182/2018)", group_id: gTaxExpenses.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: true });
  await createAccount(cid, { code: "5306", name: "ضريبة دخل الشركة", group_id: gTaxExpenses.id, opening_debit: 0, opening_credit: 0, is_active: true, is_system: false });

  logger.info("Egyptian Chart of Accounts setup complete — 36 accounts created");
}

/**
 * الحصول على معرّف الحساب من كوده
 */
export async function getAccountByCode(code: string) {
  const rows = await pool.query(
    `SELECT * FROM accounts WHERE company_id = $1 AND code = $2 LIMIT 1`,
    [COMPANY_ID, code]
  );
  return rows.rows[0] ?? null;
}

/**
 * تسجيل قيد يومية لفاتورة مدفوعة (عميل)
 * الدائن: إيرادات المبيعات 4101
 * المدين: ذمم مدينة عملاء 1201
 *
 * عند السداد:
 * المدين: الصندوق/البنك 1101/1102
 * الدائن: ذمم مدينة عملاء 1201
 */
export async function postInvoiceJournalEntry(params: {
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  vatAmount: number;
  narration?: string;
}) {
  const yearId = await getYearId();
  if (!yearId) throw new Error("لم يتم تهيئة السنة المالية");

  const [ar, revenue, outputVat] = await Promise.all([
    getAccountByCode("1201"),
    getAccountByCode("4101"),
    getAccountByCode("2201"),
  ]);

  if (!ar || !revenue || !outputVat) {
    throw new Error("حسابات الفاتورة غير موجودة في دليل الحسابات");
  }

  const netAmount = params.totalAmount - params.vatAmount;

  await createVoucher({
    company_id: COMPANY_ID,
    year_id: yearId,
    reference_id: params.invoiceNumber,
    voucher_type: "SALES",
    date: params.invoiceDate,
    narration: params.narration ?? `إيراد فاتورة ${params.invoiceNumber}`,
    entries: [
      { account_id: ar.id, debit: params.totalAmount, credit: 0 },
      { account_id: revenue.id, debit: 0, credit: netAmount },
      { account_id: outputVat.id, debit: 0, credit: params.vatAmount },
    ],
  });

  await processJobs();
}

/**
 * تسجيل قيد يومية لأمر شراء من المورد
 * المدين: تكلفة البضاعة 5101
 * المدين: ضريبة الخصم 5302
 * المدين: تأمين نهائي 5305
 * المدين: ضريبة الدمغة 5304
 * الدائن: ذمم دائنة موردون 2101
 * الدائن: ضريبة الخصم المستحقة 2202
 * الدائن: تأمين نهائي مستحق 2205
 * الدائن: دمغة مستحقة 2204
 * الدائن: ضريبة القيمة المضافة مدخلات 1202
 */
export async function postSupplierPoJournalEntry(params: {
  poNumber: string;
  poDate: string;
  grossAmount: number;
  vatAmount: number;
  withholdingTaxAmount: number;
  insuranceAmount: number;
  stampDutyAmount: number;
  narration?: string;
}) {
  const yearId = await getYearId();
  if (!yearId) throw new Error("لم يتم تهيئة السنة المالية");

  const [cogs, inputVat, whtExpense, insuranceExpense, stampExpense, ap, outputVatPayable, whtPayable, insurancePayable, stampPayable] = await Promise.all([
    getAccountByCode("5101"),
    getAccountByCode("1202"),
    getAccountByCode("5302"),
    getAccountByCode("5305"),
    getAccountByCode("5304"),
    getAccountByCode("2101"),
    getAccountByCode("2201"),
    getAccountByCode("2202"),
    getAccountByCode("2205"),
    getAccountByCode("2204"),
  ]);

  if (!cogs || !ap) throw new Error("حسابات أمر الشراء غير موجودة");

  const totalPayable = params.grossAmount + params.vatAmount + params.withholdingTaxAmount + params.insuranceAmount + params.stampDutyAmount;

  const entries = [
    { account_id: cogs!.id, debit: params.grossAmount, credit: 0 },
  ];

  if (params.vatAmount > 0 && inputVat) {
    entries.push({ account_id: inputVat.id, debit: params.vatAmount, credit: 0 });
  }
  if (params.withholdingTaxAmount > 0 && whtExpense) {
    entries.push({ account_id: whtExpense.id, debit: params.withholdingTaxAmount, credit: 0 });
  }
  if (params.insuranceAmount > 0 && insuranceExpense) {
    entries.push({ account_id: insuranceExpense.id, debit: params.insuranceAmount, credit: 0 });
  }
  if (params.stampDutyAmount > 0 && stampExpense) {
    entries.push({ account_id: stampExpense.id, debit: params.stampDutyAmount, credit: 0 });
  }

  entries.push({ account_id: ap!.id, debit: 0, credit: params.grossAmount });

  if (params.vatAmount > 0 && outputVatPayable) {
    entries.push({ account_id: outputVatPayable.id, debit: 0, credit: params.vatAmount });
  }
  if (params.withholdingTaxAmount > 0 && whtPayable) {
    entries.push({ account_id: whtPayable.id, debit: 0, credit: params.withholdingTaxAmount });
  }
  if (params.insuranceAmount > 0 && insurancePayable) {
    entries.push({ account_id: insurancePayable.id, debit: 0, credit: params.insuranceAmount });
  }
  if (params.stampDutyAmount > 0 && stampPayable) {
    entries.push({ account_id: stampPayable.id, debit: 0, credit: params.stampDutyAmount });
  }

  await createVoucher({
    company_id: COMPANY_ID,
    year_id: yearId,
    reference_id: params.poNumber,
    voucher_type: "PURCHASE",
    date: params.poDate,
    narration: params.narration ?? `أمر شراء ${params.poNumber}`,
    entries,
  });

  await processJobs();
}
