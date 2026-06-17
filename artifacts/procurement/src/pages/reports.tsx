import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  BarChart3, Users, Building2, FileCheck, ReceiptText,
  TrendingUp, Search, ExternalLink, ChevronUp, ChevronDown,
  DollarSign, ShoppingCart, Truck, AlertCircle, CheckCircle2,
  Clock, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle,
  RefreshCw, FileText, Target,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── API ─────────────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function fetchSummary() {
  const r = await fetch(`${BASE}/api/reports/summary`);
  if (!r.ok) throw new Error("failed");
  return r.json() as Promise<ReportsSummary>;
}
async function fetchConversion() {
  const r = await fetch(`${BASE}/api/reports/conversion`);
  if (!r.ok) throw new Error("failed");
  return r.json() as Promise<ConversionReport>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Overview {
  totalCustomers: number; totalSuppliers: number; totalInquiries: number;
  totalCustomerPos: number; totalSupplierPos: number; totalDeliveryNotes: number;
  totalInvoices: number; totalRevenue: number; paidRevenue: number;
  pendingRevenue: number; totalCost: number; grossProfit: number; profitMargin: number;
}
interface CustomerStat {
  id: number; name: string; email?: string | null; phone?: string | null;
  poCount: number; revenue: number; invoiceTotal: number; paidTotal: number; pendingTotal: number;
}
interface SupplierStat { id: number; name: string; category?: string | null; poCount: number; totalSpend: number; }
interface DnRow { id: number; dnNumber: string; status: string; issueDate?: string | null; customerPoId: number; customerName?: string | null; invoiceNumber?: string | null; invoiceStatus?: string | null; createdAt: string; }
interface InvRow { id: number; invoiceNumber: string; status: string; issueDate?: string | null; totalAmount?: number | null; customerName?: string | null; dnNumber?: string | null; createdAt: string; }
interface MonthEntry { month: string; revenue: number; cost: number; profit: number; }
interface Financial {
  totalRevenue: number; paidRevenue: number; pendingRevenue: number; totalCost: number; grossProfit: number; profitMargin: number;
  monthlySeries: MonthEntry[];
  topCustomers: { id: number; name: string; revenue: number; poCount: number }[];
  topSuppliers: { id: number; name: string; totalSpend: number; poCount: number }[];
}
interface ReportsSummary {
  overview: Overview; customerStats: CustomerStat[]; supplierStats: SupplierStat[];
  deliveryNotes: { byStatus: Record<string, number>; rows: DnRow[] };
  invoices: { byStatus: Record<string, { count: number; total: number }>; rows: InvRow[] };
  financial: Financial;
}
interface ExpiringQ { id: number; quotationNumber?: string | null; validUntil?: string | null; totalAmount?: number | null; }
interface PeriodRow { key: string; label: string; total: number; converted: number; revenue: number; rate: number; }
interface ConversionReport {
  totalInquiries: number; inquiryByStatus: Record<string, number>;
  totalInquiryItems: number; pricedInquiryItems: number; unpricedInquiryItems: number; totalQuotationItems: number;
  totalQuotations: number; byStatus: Record<string, number>; quotationsWithPo: number;
  conversionRate: number; broadConversionRate: number;
  expiringToday: ExpiringQ[]; expiringTomorrow: ExpiringQ[]; expiringThisWeek: ExpiringQ[];
  totalRfqs: number; rfqByStatus: Record<string, number>; rfqNoResponse: number; rfqReceived: number;
  weeklyBreakdown: PeriodRow[]; monthlyBreakdown: PeriodRow[]; quarterlyBreakdown: PeriodRow[];
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",    label: "ملخص عام",        icon: BarChart3 },
  { id: "conversion",  label: "التحويل والمبيعات", icon: Target },
  { id: "customers",   label: "العملاء",           icon: Users },
  { id: "suppliers",   label: "الموردون",          icon: Building2 },
  { id: "delivery",    label: "أذون التسليم",      icon: FileCheck },
  { id: "invoices",    label: "الفواتير",           icon: ReceiptText },
  { id: "financial",   label: "المركز المالي",      icon: TrendingUp },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── Status configs ───────────────────────────────────────────────────────────
const DN_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-gray-100 text-gray-700" },
  pending_finance: { label: "بانتظار المالية", cls: "bg-yellow-100 text-yellow-800" },
  finance_approved: { label: "معتمد مالياً", cls: "bg-blue-100 text-blue-700" },
  delivered: { label: "تم التسليم", cls: "bg-purple-100 text-purple-700" },
  signed: { label: "موقع", cls: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغي", cls: "bg-red-100 text-red-700" },
};
const INV_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-gray-100 text-gray-700" },
  issued: { label: "صادرة", cls: "bg-blue-100 text-blue-700" },
  paid: { label: "مدفوعة", cls: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغاة", cls: "bg-red-100 text-red-700" },
};
const Q_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "مسودة", cls: "bg-gray-100 text-gray-700" },
  approved: { label: "معتمد", cls: "bg-green-100 text-green-800" },
  rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700" },
};
const RFQ_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "معلق", cls: "bg-gray-100 text-gray-700" },
  sent: { label: "أُرسل", cls: "bg-blue-100 text-blue-700" },
  received: { label: "استُلم", cls: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغي", cls: "bg-red-100 text-red-700" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });
const fmtEGP = (n: number) => `${fmt(n)} ج.م`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function KpiCard({ label, value, sub, color = "default", icon: Icon, alert }: {
  label: string; value: string; sub?: string; color?: "default" | "green" | "blue" | "red" | "yellow" | "purple"; icon: React.ComponentType<any>; alert?: boolean;
}) {
  const iconCls = { default: "text-muted-foreground", green: "text-green-600", blue: "text-blue-600", red: "text-red-500", yellow: "text-yellow-600", purple: "text-purple-600" }[color];
  const valCls = { default: "", green: "text-green-700", blue: "text-blue-700", red: "text-red-600", yellow: "text-yellow-700", purple: "text-purple-700" }[color];
  const border = alert ? "border-red-300 bg-red-50" : "";
  return (
    <Card className={border}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            <p className={`text-xl font-bold mt-1 ${valCls}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{sub}</p>}
          </div>
          <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconCls}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status, map }: { status: string; map: Record<string, { label: string; cls: string }> }) {
  const cfg = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-700" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}

function SortableTh({ col, label, sort, onSort }: { col: string; label: string; sort: [string, "asc" | "desc"]; onSort: (c: string) => void }) {
  const active = sort[0] === col;
  return (
    <th className="text-right py-2 pr-3 font-medium cursor-pointer select-none hover:text-foreground whitespace-nowrap" onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sort[1] === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <Minus className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return <div className="text-sm text-muted-foreground text-center py-10 flex flex-col items-center gap-2"><FileText className="h-8 w-8 opacity-20" />{msg}</div>;
}

function ProgressBar({ value, max, color = "bg-blue-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-muted rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function FunnelBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const width = total > 0 ? Math.max((value / total) * 100, 4) : 4;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function PeriodTable({ rows, onNavigate }: { rows: PeriodRow[]; onNavigate: (id: number) => void }) {
  if (rows.length === 0) return <EmptyState msg="لا توجد بيانات بعد" />;
  const maxRate = Math.max(...rows.map((r) => r.rate), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-right py-2 pr-3 font-medium">الفترة</th>
            <th className="text-right py-2 pr-3 font-medium">عروض الأسعار</th>
            <th className="text-right py-2 pr-3 font-medium">تحولت لـ PO</th>
            <th className="text-right py-2 pr-3 font-medium">نسبة التحويل</th>
            <th className="text-right py-2 pr-3 font-medium">الإيرادات</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {[...rows].reverse().map((r) => (
            <tr key={r.key} className="hover:bg-muted/30 transition-colors">
              <td className="py-2.5 pr-3 font-medium">{r.label}</td>
              <td className="py-2.5 pr-3 text-center">{r.total}</td>
              <td className="py-2.5 pr-3 text-center text-green-700 font-semibold">{r.converted}</td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-xs min-w-[3rem] ${r.rate >= 50 ? "text-green-700" : r.rate >= 25 ? "text-yellow-700" : "text-muted-foreground"}`}>
                    {fmtPct(r.rate)}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[60px]">
                    <div className={`h-1.5 rounded-full ${r.rate >= 50 ? "bg-green-500" : r.rate >= 25 ? "bg-yellow-400" : "bg-gray-300"}`} style={{ width: `${(r.rate / maxRate) * 100}%` }} />
                  </div>
                </div>
              </td>
              <td className="py-2.5 pr-3 font-semibold text-blue-700">{fmtEGP(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/20">
          <tr className="text-sm font-semibold">
            <td className="py-2 pr-3">الإجمالي</td>
            <td className="py-2 pr-3 text-center">{rows.reduce((s, r) => s + r.total, 0)}</td>
            <td className="py-2 pr-3 text-center text-green-700">{rows.reduce((s, r) => s + r.converted, 0)}</td>
            <td className="py-2 pr-3">
              {(() => { const t = rows.reduce((s, r) => s + r.total, 0); const c = rows.reduce((s, r) => s + r.converted, 0); return fmtPct(t > 0 ? (c / t) * 100 : 0); })()}
            </td>
            <td className="py-2 pr-3 text-blue-700">{fmtEGP(rows.reduce((s, r) => s + r.revenue, 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabId>("overview");
  const [search, setSearch] = useState("");
  const [periodView, setPeriodView] = useState<"weekly" | "monthly" | "quarterly">("monthly");
  const [custSort, setCustSort] = useState<[string, "asc" | "desc"]>(["revenue", "desc"]);
  const [supSort, setSupSort] = useState<[string, "asc" | "desc"]>(["totalSpend", "desc"]);
  const [dnSort, setDnSort] = useState<[string, "asc" | "desc"]>(["createdAt", "desc"]);
  const [invSort, setInvSort] = useState<[string, "asc" | "desc"]>(["createdAt", "desc"]);

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["reports-summary"], queryFn: fetchSummary, staleTime: 30_000 });
  const { data: conv, isLoading: convLoading } = useQuery({ queryKey: ["reports-conversion"], queryFn: fetchConversion, staleTime: 30_000 });

  const q = search.trim().toLowerCase();
  function makeSort<T extends Record<string, any>>(sort: [string, "asc" | "desc"]) {
    return (a: T, b: T) => {
      const av = a[sort[0]] ?? 0; const bv = b[sort[0]] ?? 0;
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sort[1] === "asc" ? cmp : -cmp;
    };
  }
  function toggleSort(current: [string, "asc" | "desc"], col: string, set: (v: [string, "asc" | "desc"]) => void) {
    set(current[0] === col ? [col, current[1] === "asc" ? "desc" : "asc"] : [col, "desc"]);
  }

  const filteredCustomers = useMemo(() => {
    if (!data) return [];
    return [...data.customerStats].filter((c) => !q || c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q)).sort(makeSort(custSort));
  }, [data, q, custSort]);

  const filteredSuppliers = useMemo(() => {
    if (!data) return [];
    return [...data.supplierStats].filter((s) => !q || s.name.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q)).sort(makeSort(supSort));
  }, [data, q, supSort]);

  const filteredDns = useMemo(() => {
    if (!data) return [];
    return [...data.deliveryNotes.rows].filter((d) => !q || d.dnNumber.toLowerCase().includes(q) || (d.customerName ?? "").toLowerCase().includes(q) || (d.status ?? "").toLowerCase().includes(q)).sort(makeSort(dnSort));
  }, [data, q, dnSort]);

  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    return [...data.invoices.rows].filter((i) => !q || i.invoiceNumber.toLowerCase().includes(q) || (i.customerName ?? "").toLowerCase().includes(q) || (i.dnNumber ?? "").toLowerCase().includes(q)).sort(makeSort(invSort));
  }, [data, q, invSort]);

  const ov = data?.overview;
  const fin = data?.financial;
  const periodRows = conv ? (periodView === "weekly" ? conv.weeklyBreakdown : periodView === "monthly" ? conv.monthlyBreakdown : conv.quarterlyBreakdown) : [];

  const isLoadingAny = isLoading || convLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">التقارير الشاملة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">تحليل كامل لجميع عمليات المنظومة</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input className="pr-9" placeholder="بحث في التقارير..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={() => { refetch(); }} title="تحديث"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Alert strip for expiring quotations */}
      {conv && (conv.expiringToday.length > 0 || conv.expiringTomorrow.length > 0) && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border ${conv.expiringToday.length > 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"}`}>
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {conv.expiringToday.length > 0 && <span>{conv.expiringToday.length} عرض سعر سيغلق اليوم!</span>}
          {conv.expiringToday.length > 0 && conv.expiringTomorrow.length > 0 && <span className="mx-1">•</span>}
          {conv.expiringTomorrow.length > 0 && <span>{conv.expiringTomorrow.length} سيغلق غداً</span>}
          <Button variant="link" size="sm" className="h-auto p-0 mr-auto text-inherit underline" onClick={() => setTab("conversion")}>عرض التفاصيل</Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0.5 overflow-x-auto pb-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${tab === id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-4 w-4" />{label}
            {id === "conversion" && conv && (conv.expiringToday.length + conv.rfqNoResponse) > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                {conv.expiringToday.length + conv.rfqNoResponse}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoadingAny && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      )}
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">حدث خطأ أثناء تحميل التقارير.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>إعادة المحاولة</Button>
          </CardContent>
        </Card>
      )}

      {data && conv && !isLoadingAny && (
        <>
          {/* ══════════ OVERVIEW ══════════ */}
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="إجمالي الإيرادات" value={fmtEGP(ov!.totalRevenue)} sub={`مدفوع: ${fmtEGP(ov!.paidRevenue)}`} color="blue" icon={DollarSign} />
                <KpiCard label="إجمالي التكاليف" value={fmtEGP(ov!.totalCost)} color="red" icon={ArrowDownRight} />
                <KpiCard label="إجمالي الأرباح" value={fmtEGP(ov!.grossProfit)} sub={`هامش: ${fmtPct(ov!.profitMargin)}`} color={ov!.grossProfit >= 0 ? "green" : "red"} icon={TrendingUp} />
                <KpiCard label="نسبة التحويل" value={fmtPct(conv.broadConversionRate)} sub={`${conv.quotationsWithPo} من ${conv.totalQuotations} عرض`} color="purple" icon={Target} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="الاستفسارات" value={String(ov!.totalInquiries)} icon={BarChart3} />
                <KpiCard label="عروض الأسعار" value={String(conv.totalQuotations)} sub={`بنود: ${conv.totalQuotationItems}`} icon={FileText} />
                <KpiCard label="أوامر شراء العملاء" value={String(ov!.totalCustomerPos)} icon={ShoppingCart} />
                <KpiCard label="أوامر شراء الموردين" value={String(ov!.totalSupplierPos)} icon={Truck} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="طلبات تسعير بدون رد" value={String(conv.rfqNoResponse)} color={conv.rfqNoResponse > 0 ? "yellow" : "default"} icon={Clock} />
                <KpiCard label="أذون التسليم" value={String(ov!.totalDeliveryNotes)} icon={FileCheck} />
                <KpiCard label="الفواتير" value={String(ov!.totalInvoices)} icon={ReceiptText} />
                <KpiCard label="تغلق اليوم" value={String(conv.expiringToday.length)} color={conv.expiringToday.length > 0 ? "red" : "default"} icon={AlertTriangle} alert={conv.expiringToday.length > 0} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />أعلى 5 عملاء (إيرادات)</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {fin!.topCustomers.length === 0 ? <EmptyState msg="لا يوجد عملاء بعد" /> : (
                      <div className="space-y-2">
                        {fin!.topCustomers.map((c, i) => (
                          <div key={c.id} className="flex items-center gap-2">
                            <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.poCount} أمر شراء</p>
                            </div>
                            <span className="text-sm font-semibold text-blue-700">{fmtEGP(c.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />أعلى 5 موردين (إنفاق)</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {fin!.topSuppliers.length === 0 ? <EmptyState msg="لا يوجد موردون بعد" /> : (
                      <div className="space-y-2">
                        {fin!.topSuppliers.map((s, i) => (
                          <div key={s.id} className="flex items-center gap-2">
                            <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.poCount} أمر شراء</p>
                            </div>
                            <span className="text-sm font-semibold text-red-600">{fmtEGP(s.totalSpend)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ══════════ CONVERSION ══════════ */}
          {tab === "conversion" && (
            <div className="space-y-4">
              {/* Top KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="عروض أسعار واردة" value={String(conv.totalQuotations)} sub={`من ${conv.totalInquiries} استفسار`} color="blue" icon={FileText} />
                <KpiCard label="تحولت لأمر شراء" value={String(conv.quotationsWithPo)} sub={fmtPct(conv.broadConversionRate)} color="green" icon={CheckCircle2} />
                <KpiCard label="نسبة التحويل" value={fmtPct(conv.conversionRate)} sub="معتمد ÷ (معتمد + مرفوض)" color="purple" icon={Target} />
                <KpiCard label="عروض معلقة" value={String(conv.byStatus["draft"] ?? 0)} sub="لم يُبت فيها بعد" color="yellow" icon={Clock} />
              </div>

              {/* Funnel + Items breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">قمع التحويل</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <FunnelBar label="الاستفسارات الواردة" value={conv.totalInquiries} total={conv.totalInquiries} color="bg-blue-400" />
                    <FunnelBar label="عروض الأسعار الصادرة" value={conv.totalQuotations} total={conv.totalInquiries} color="bg-blue-500" />
                    <FunnelBar label="معتمدة (approved)" value={conv.byStatus["approved"] ?? 0} total={conv.totalInquiries} color="bg-green-400" />
                    <FunnelBar label="تحولت لأمر شراء" value={conv.quotationsWithPo} total={conv.totalInquiries} color="bg-green-600" />

                    <div className="border-t pt-3 space-y-2">
                      {Object.entries(Q_STATUS).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-0.5 rounded-full font-medium ${v.cls}`}>{v.label}</span>
                          <span className="font-bold">{conv.byStatus[k] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">تحليل البنود</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">إجمالي بنود الاستفسارات</span>
                        <span className="font-bold">{conv.totalInquiryItems}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-700 font-medium">✓ تم تسعيرها</span>
                        <span className="font-semibold">{conv.pricedInquiryItems} ({conv.totalInquiryItems > 0 ? fmtPct((conv.pricedInquiryItems / conv.totalInquiryItems) * 100) : "0%"})</span>
                      </div>
                      <ProgressBar value={conv.pricedInquiryItems} max={conv.totalInquiryItems} color="bg-green-500" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-red-600 font-medium">✗ لم يُسعَّر بعد</span>
                        <span className="font-semibold">{conv.unpricedInquiryItems} ({conv.totalInquiryItems > 0 ? fmtPct((conv.unpricedInquiryItems / conv.totalInquiryItems) * 100) : "0%"})</span>
                      </div>
                      <ProgressBar value={conv.unpricedInquiryItems} max={conv.totalInquiryItems} color="bg-red-400" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-blue-600 font-medium">بنود عروض الأسعار المُصدَرة</span>
                        <span className="font-semibold">{conv.totalQuotationItems}</span>
                      </div>
                      <ProgressBar value={conv.totalQuotationItems} max={Math.max(conv.totalInquiryItems, conv.totalQuotationItems)} color="bg-blue-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RFQ response status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    طلبات التسعير من الموردين (RFQs)
                    {conv.rfqNoResponse > 0 && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">{conv.rfqNoResponse} بدون رد</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {Object.entries(RFQ_STATUS).map(([k, v]) => (
                      <div key={k} className="text-center p-3 rounded-lg border">
                        <p className="text-xl font-bold">{conv.rfqByStatus[k] ?? 0}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${v.cls}`}>{v.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-800">{conv.rfqNoResponse}</p>
                        <p className="text-xs text-yellow-700">طلب بانتظار رد المورد</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-800">{conv.rfqReceived}</p>
                        <p className="text-xs text-green-700">طلب استُلم رده</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expiring */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className={conv.expiringToday.length > 0 ? "border-red-200" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      تغلق اليوم ({conv.expiringToday.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conv.expiringToday.length === 0
                      ? <p className="text-sm text-muted-foreground text-center py-3">لا يوجد عروض تغلق اليوم ✓</p>
                      : (
                        <div className="space-y-2">
                          {conv.expiringToday.map((q) => (
                            <div key={q.id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                              <div>
                                <p className="text-sm font-semibold text-red-800">{q.quotationNumber ?? `عرض #${q.id}`}</p>
                                <p className="text-xs text-red-600">{q.validUntil}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {q.totalAmount != null && <span className="text-xs font-semibold text-red-700">{fmtEGP(q.totalAmount)}</span>}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/quotations/${q.id}`)}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </CardContent>
                </Card>

                <Card className={conv.expiringTomorrow.length > 0 ? "border-yellow-200" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
                      <Clock className="h-4 w-4" />
                      تغلق غداً ({conv.expiringTomorrow.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conv.expiringTomorrow.length === 0
                      ? <p className="text-sm text-muted-foreground text-center py-3">لا يوجد عروض تغلق غداً ✓</p>
                      : (
                        <div className="space-y-2">
                          {conv.expiringTomorrow.map((q) => (
                            <div key={q.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded border border-yellow-200">
                              <div>
                                <p className="text-sm font-semibold text-yellow-800">{q.quotationNumber ?? `عرض #${q.id}`}</p>
                                <p className="text-xs text-yellow-600">{q.validUntil}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {q.totalAmount != null && <span className="text-xs font-semibold text-yellow-700">{fmtEGP(q.totalAmount)}</span>}
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/quotations/${q.id}`)}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </CardContent>
                </Card>
              </div>

              {/* This week expiring */}
              {conv.expiringThisWeek.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                      <AlertCircle className="h-4 w-4" />
                      عروض ستغلق خلال هذا الأسبوع ({conv.expiringThisWeek.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {conv.expiringThisWeek.map((q) => (
                        <div key={q.id} className="flex items-center gap-1.5 bg-white border border-orange-200 rounded px-2 py-1 text-xs">
                          <span className="font-medium">{q.quotationNumber ?? `#${q.id}`}</span>
                          <span className="text-orange-600">{q.validUntil}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1" onClick={() => setLocation(`/quotations/${q.id}`)}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Time-series breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      نسبة التحويل عبر الزمن
                    </CardTitle>
                    <div className="flex rounded-md border overflow-hidden text-xs">
                      {(["weekly", "monthly", "quarterly"] as const).map((p) => (
                        <button key={p} onClick={() => setPeriodView(p)}
                          className={`px-2.5 py-1 font-medium transition-colors ${periodView === p ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                          {p === "weekly" ? "أسبوعي" : p === "monthly" ? "شهري" : "ربع سنوي"}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <PeriodTable rows={periodRows} onNavigate={(id) => setLocation(`/quotations/${id}`)} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══════════ CUSTOMERS ══════════ */}
          {tab === "customers" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />تقرير العملاء ({filteredCustomers.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {filteredCustomers.length === 0 ? <EmptyState msg={q ? "لا توجد نتائج للبحث" : "لا يوجد عملاء بعد"} /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <SortableTh col="name" label="اسم العميل" sort={custSort} onSort={(c) => toggleSort(custSort, c, setCustSort)} />
                          <SortableTh col="poCount" label="أوامر الشراء" sort={custSort} onSort={(c) => toggleSort(custSort, c, setCustSort)} />
                          <SortableTh col="revenue" label="الإيرادات" sort={custSort} onSort={(c) => toggleSort(custSort, c, setCustSort)} />
                          <SortableTh col="invoiceTotal" label="إجمالي الفواتير" sort={custSort} onSort={(c) => toggleSort(custSort, c, setCustSort)} />
                          <SortableTh col="paidTotal" label="مدفوع" sort={custSort} onSort={(c) => toggleSort(custSort, c, setCustSort)} />
                          <SortableTh col="pendingTotal" label="معلق" sort={custSort} onSort={(c) => toggleSort(custSort, c, setCustSort)} />
                          <th className="py-2 pr-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredCustomers.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-3">
                              <p className="font-medium">{c.name}</p>
                              {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                            </td>
                            <td className="py-3 pr-3 text-center font-semibold">{c.poCount}</td>
                            <td className="py-3 pr-3 font-semibold text-blue-700">{fmtEGP(c.revenue)}</td>
                            <td className="py-3 pr-3">{fmtEGP(c.invoiceTotal)}</td>
                            <td className="py-3 pr-3 text-green-700 font-medium">{fmtEGP(c.paidTotal)}</td>
                            <td className="py-3 pr-3">
                              <span className={c.pendingTotal > 0 ? "text-yellow-700 font-medium" : "text-muted-foreground"}>{fmtEGP(c.pendingTotal)}</span>
                            </td>
                            <td className="py-3 pr-3">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/customers`)}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t bg-muted/20">
                        <tr className="text-sm font-semibold">
                          <td className="py-2 pr-3">الإجمالي</td>
                          <td className="py-2 pr-3 text-center">{filteredCustomers.reduce((s, c) => s + c.poCount, 0)}</td>
                          <td className="py-2 pr-3 text-blue-700">{fmtEGP(filteredCustomers.reduce((s, c) => s + c.revenue, 0))}</td>
                          <td className="py-2 pr-3">{fmtEGP(filteredCustomers.reduce((s, c) => s + c.invoiceTotal, 0))}</td>
                          <td className="py-2 pr-3 text-green-700">{fmtEGP(filteredCustomers.reduce((s, c) => s + c.paidTotal, 0))}</td>
                          <td className="py-2 pr-3 text-yellow-700">{fmtEGP(filteredCustomers.reduce((s, c) => s + c.pendingTotal, 0))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ══════════ SUPPLIERS ══════════ */}
          {tab === "suppliers" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />تقرير الموردين ({filteredSuppliers.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {filteredSuppliers.length === 0 ? <EmptyState msg={q ? "لا توجد نتائج للبحث" : "لا يوجد موردون بعد"} /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <SortableTh col="name" label="اسم المورد" sort={supSort} onSort={(c) => toggleSort(supSort, c, setSupSort)} />
                          <th className="text-right py-2 pr-3 font-medium">الفئة</th>
                          <SortableTh col="poCount" label="أوامر الشراء" sort={supSort} onSort={(c) => toggleSort(supSort, c, setSupSort)} />
                          <SortableTh col="totalSpend" label="إجمالي الإنفاق" sort={supSort} onSort={(c) => toggleSort(supSort, c, setSupSort)} />
                          <th className="py-2 pr-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredSuppliers.map((s) => (
                          <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3 pr-3 font-medium">{s.name}</td>
                            <td className="py-3 pr-3 text-muted-foreground">{s.category ?? "—"}</td>
                            <td className="py-3 pr-3 text-center font-semibold">{s.poCount}</td>
                            <td className="py-3 pr-3 font-semibold text-red-600">{fmtEGP(s.totalSpend)}</td>
                            <td className="py-3 pr-3">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/suppliers`)}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t bg-muted/20">
                        <tr className="text-sm font-semibold">
                          <td className="py-2 pr-3">الإجمالي</td>
                          <td />
                          <td className="py-2 pr-3 text-center">{filteredSuppliers.reduce((s, c) => s + c.poCount, 0)}</td>
                          <td className="py-2 pr-3 text-red-600">{fmtEGP(filteredSuppliers.reduce((s, c) => s + c.totalSpend, 0))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ══════════ DELIVERY NOTES ══════════ */}
          {tab === "delivery" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(DN_STATUS).map(([key, { label, cls }]) => (
                  <Card key={key} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setSearch(label)}>
                    <CardContent className="pt-3 pb-3 text-center">
                      <p className="text-xl font-bold">{data.deliveryNotes.byStatus[key] ?? 0}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${cls}`}>{label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck className="h-4 w-4" />سجل أذون التسليم ({filteredDns.length})</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {filteredDns.length === 0 ? <EmptyState msg={q ? "لا توجد نتائج للبحث" : "لا توجد أذون تسليم بعد"} /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <SortableTh col="dnNumber" label="رقم الإذن" sort={dnSort} onSort={(c) => toggleSort(dnSort, c, setDnSort)} />
                            <SortableTh col="customerName" label="العميل" sort={dnSort} onSort={(c) => toggleSort(dnSort, c, setDnSort)} />
                            <SortableTh col="status" label="الحالة" sort={dnSort} onSort={(c) => toggleSort(dnSort, c, setDnSort)} />
                            <SortableTh col="issueDate" label="تاريخ الإصدار" sort={dnSort} onSort={(c) => toggleSort(dnSort, c, setDnSort)} />
                            <th className="text-right py-2 pr-3 font-medium">الفاتورة</th>
                            <SortableTh col="createdAt" label="تاريخ الإنشاء" sort={dnSort} onSort={(c) => toggleSort(dnSort, c, setDnSort)} />
                            <th className="py-2 pr-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredDns.map((dn) => (
                            <tr key={dn.id} className="hover:bg-muted/30">
                              <td className="py-3 pr-3 font-medium">{dn.dnNumber}</td>
                              <td className="py-3 pr-3 text-muted-foreground">{dn.customerName ?? "—"}</td>
                              <td className="py-3 pr-3"><StatusPill status={dn.status} map={DN_STATUS} /></td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">{dn.issueDate ?? "—"}</td>
                              <td className="py-3 pr-3">{dn.invoiceNumber ? <span className="text-xs text-indigo-700 font-medium">{dn.invoiceNumber}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(dn.createdAt).toLocaleDateString("ar-EG")}</td>
                              <td className="py-3 pr-3"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/delivery-notes/${dn.id}`)}><ExternalLink className="h-3.5 w-3.5" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══════════ INVOICES ══════════ */}
          {tab === "invoices" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(INV_STATUS).map(([key, { label, cls }]) => {
                  const stat = data.invoices.byStatus[key];
                  return (
                    <Card key={key} className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setSearch(label)}>
                      <CardContent className="pt-3 pb-3">
                        <p className="text-xl font-bold">{stat?.count ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtEGP(stat?.total ?? 0)}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1.5 inline-block ${cls}`}>{label}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ReceiptText className="h-4 w-4" />سجل الفواتير ({filteredInvoices.length})</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  {filteredInvoices.length === 0 ? <EmptyState msg={q ? "لا توجد نتائج للبحث" : "لا توجد فواتير بعد"} /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <SortableTh col="invoiceNumber" label="رقم الفاتورة" sort={invSort} onSort={(c) => toggleSort(invSort, c, setInvSort)} />
                            <SortableTh col="customerName" label="العميل" sort={invSort} onSort={(c) => toggleSort(invSort, c, setInvSort)} />
                            <th className="text-right py-2 pr-3 font-medium">إذن التسليم</th>
                            <SortableTh col="status" label="الحالة" sort={invSort} onSort={(c) => toggleSort(invSort, c, setInvSort)} />
                            <SortableTh col="totalAmount" label="المبلغ" sort={invSort} onSort={(c) => toggleSort(invSort, c, setInvSort)} />
                            <SortableTh col="issueDate" label="تاريخ الإصدار" sort={invSort} onSort={(c) => toggleSort(invSort, c, setInvSort)} />
                            <th className="py-2 pr-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-muted/30">
                              <td className="py-3 pr-3 font-medium">{inv.invoiceNumber}</td>
                              <td className="py-3 pr-3 text-muted-foreground">{inv.customerName ?? "—"}</td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">{inv.dnNumber ?? "—"}</td>
                              <td className="py-3 pr-3"><StatusPill status={inv.status} map={INV_STATUS} /></td>
                              <td className="py-3 pr-3 font-semibold">{inv.totalAmount != null ? fmtEGP(inv.totalAmount) : "—"}</td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">{inv.issueDate ?? new Date(inv.createdAt).toLocaleDateString("ar-EG")}</td>
                              <td className="py-3 pr-3"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/invoices/${inv.id}`)}><ExternalLink className="h-3.5 w-3.5" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t bg-muted/20">
                          <tr className="text-sm font-semibold">
                            <td className="py-2 pr-3" colSpan={4}>الإجمالي</td>
                            <td className="py-2 pr-3">{fmtEGP(filteredInvoices.reduce((s, i) => s + (i.totalAmount ?? 0), 0))}</td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══════════ FINANCIAL ══════════ */}
          {tab === "financial" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard label="إجمالي الإيرادات" value={fmtEGP(fin!.totalRevenue)} sub="من الفواتير غير الملغاة" color="blue" icon={ArrowUpRight} />
                <KpiCard label="إجمالي التكاليف" value={fmtEGP(fin!.totalCost)} sub="أوامر شراء الموردين" color="red" icon={ArrowDownRight} />
                <KpiCard label="صافي الربح" value={fmtEGP(fin!.grossProfit)} sub={`هامش: ${fmtPct(fin!.profitMargin)}`} color={fin!.grossProfit >= 0 ? "green" : "red"} icon={TrendingUp} />
                <KpiCard label="إيرادات محصلة" value={fmtEGP(fin!.paidRevenue)} sub={`${fin!.totalRevenue > 0 ? fmtPct((fin!.paidRevenue / fin!.totalRevenue) * 100) : "0%"} من الإجمالي`} color="green" icon={CheckCircle2} />
                <KpiCard label="إيرادات معلقة" value={fmtEGP(fin!.pendingRevenue)} color="yellow" icon={Clock} />
                <KpiCard label="متوسط قيمة الفاتورة" value={fmtEGP(data.invoices.rows.length > 0 ? fin!.totalRevenue / data.invoices.rows.length : 0)} icon={ReceiptText} />
              </div>

              {/* Monthly chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />الأداء الشهري (آخر 12 شهر)</CardTitle>
                  <div className="flex gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> إيرادات</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> تكاليف</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {fin!.monthlySeries.length === 0 ? <EmptyState msg="لا توجد بيانات شهرية بعد" /> : (
                    <div className="flex items-end gap-1.5 overflow-x-auto pb-2 min-h-[120px]">
                      {(() => {
                        const maxVal = Math.max(...fin!.monthlySeries.map((m) => Math.max(m.revenue, m.cost)), 1);
                        const arabicMonths = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
                        return fin!.monthlySeries.map((m) => {
                          const pctRev = (m.revenue / maxVal) * 100;
                          const pctCost = (m.cost / maxVal) * 100;
                          const monthLabel = arabicMonths[parseInt(m.month.slice(5), 10) - 1] ?? m.month;
                          return (
                            <div key={m.month} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                              <div className="w-full flex justify-center" style={{ height: 80 }}>
                                <div className="flex gap-0.5 items-end" style={{ height: "100%" }}>
                                  <div className="w-3 bg-blue-400 rounded-t-sm" style={{ height: `${pctRev}%` }} title={fmtEGP(m.revenue)} />
                                  <div className="w-3 bg-red-300 rounded-t-sm" style={{ height: `${pctCost}%` }} title={fmtEGP(m.cost)} />
                                </div>
                              </div>
                              <span className="text-[10px] text-muted-foreground text-center leading-tight">{monthLabel}</span>
                              <span className={`text-[9px] font-semibold ${m.profit >= 0 ? "text-green-600" : "text-red-500"}`}>{m.profit >= 0 ? "+" : ""}{fmt(m.profit)}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">أعلى العملاء إيراداً</CardTitle></CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {fin!.topCustomers.length === 0 ? <EmptyState msg="لا يوجد بعد" /> : fin!.topCustomers.map((c, i) => {
                      const pct = fin!.totalRevenue > 0 ? (c.revenue / fin!.totalRevenue) * 100 : 0;
                      return (
                        <div key={c.id}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium truncate">{i + 1}. {c.name}</span>
                            <span className="text-sm font-semibold text-blue-700 ml-2">{fmtEGP(c.revenue)}</span>
                          </div>
                          <ProgressBar value={c.revenue} max={fin!.totalRevenue} color="bg-blue-500" />
                          <p className="text-xs text-muted-foreground mt-0.5">{fmtPct(pct)} من الإجمالي</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">أعلى الموردين تكلفةً</CardTitle></CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {fin!.topSuppliers.length === 0 ? <EmptyState msg="لا يوجد بعد" /> : fin!.topSuppliers.map((s, i) => {
                      const pct = fin!.totalCost > 0 ? (s.totalSpend / fin!.totalCost) * 100 : 0;
                      return (
                        <div key={s.id}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium truncate">{i + 1}. {s.name}</span>
                            <span className="text-sm font-semibold text-red-600 ml-2">{fmtEGP(s.totalSpend)}</span>
                          </div>
                          <ProgressBar value={s.totalSpend} max={fin!.totalCost} color="bg-red-400" />
                          <p className="text-xs text-muted-foreground mt-0.5">{fmtPct(pct)} من الإجمالي</p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
