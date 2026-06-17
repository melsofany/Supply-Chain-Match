import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  BarChart3, Users, Building2, FileCheck, ReceiptText,
  TrendingUp, Search, ExternalLink, ChevronUp, ChevronDown,
  DollarSign, ShoppingCart, Truck, AlertCircle, CheckCircle2,
  Clock, XCircle, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ─── API call ─────────────────────────────────────────────────────────────────
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function fetchSummary() {
  const r = await fetch(`${BASE}/api/reports/summary`);
  if (!r.ok) throw new Error("Failed to load reports");
  return r.json() as Promise<ReportsSummary>;
}

// ─── Types ───────────────────────────────────────────────────────────────────
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
interface SupplierStat {
  id: number; name: string; category?: string | null;
  poCount: number; totalSpend: number;
}
interface DnRow {
  id: number; dnNumber: string; status: string; issueDate?: string | null;
  customerPoId: number; customerName?: string | null;
  invoiceNumber?: string | null; invoiceStatus?: string | null;
  financeApprovedAt?: string | null; createdAt: string;
}
interface InvRow {
  id: number; invoiceNumber: string; status: string; issueDate?: string | null;
  totalAmount?: number | null; customerName?: string | null;
  dnNumber?: string | null; createdAt: string;
}
interface MonthEntry { month: string; revenue: number; cost: number; profit: number; }
interface Financial {
  totalRevenue: number; paidRevenue: number; pendingRevenue: number;
  totalCost: number; grossProfit: number; profitMargin: number;
  monthlySeries: MonthEntry[];
  topCustomers: { id: number; name: string; revenue: number; poCount: number }[];
  topSuppliers: { id: number; name: string; totalSpend: number; poCount: number }[];
}
interface ReportsSummary {
  overview: Overview;
  customerStats: CustomerStat[];
  supplierStats: SupplierStat[];
  deliveryNotes: { byStatus: Record<string, number>; rows: DnRow[] };
  invoices: { byStatus: Record<string, { count: number; total: number }>; rows: InvRow[] };
  financial: Financial;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "ملخص عام", icon: BarChart3 },
  { id: "customers", label: "العملاء", icon: Users },
  { id: "suppliers", label: "الموردون", icon: Building2 },
  { id: "delivery", label: "أذون التسليم", icon: FileCheck },
  { id: "invoices", label: "الفواتير", icon: ReceiptText },
  { id: "financial", label: "المركز المالي", icon: TrendingUp },
] as const;
type TabId = typeof TABS[number]["id"];

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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 0 });
const fmtEGP = (n: number) => `${fmt(n)} ج.م`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

function KpiCard({ label, value, sub, color = "default", icon: Icon }: {
  label: string; value: string; sub?: string; color?: "default" | "green" | "blue" | "red" | "yellow"; icon: React.ComponentType<any>;
}) {
  const iconCls = { default: "text-muted-foreground", green: "text-green-600", blue: "text-blue-600", red: "text-red-500", yellow: "text-yellow-600" }[color];
  const valCls = { default: "", green: "text-green-700", blue: "text-blue-700", red: "text-red-600", yellow: "text-yellow-700" }[color];
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className={`text-xl font-bold mt-1 ${valCls}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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
  return <p className="text-sm text-muted-foreground text-center py-10">{msg}</p>;
}

function MonthBar({ month, revenue, cost, profit, maxVal }: MonthEntry & { maxVal: number }) {
  const pctRev = maxVal > 0 ? (revenue / maxVal) * 100 : 0;
  const pctCost = maxVal > 0 ? (cost / maxVal) * 100 : 0;
  const label = month.slice(5); // MM
  const arabicMonths = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const monthLabel = arabicMonths[parseInt(label, 10) - 1] ?? label;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div className="w-full flex flex-col items-center gap-0.5">
        <div className="w-5 relative flex flex-col items-center gap-0.5" style={{ height: 80 }}>
          <div className="absolute bottom-0 w-full flex gap-0.5" style={{ height: "100%" }}>
            <div className="flex-1 bg-blue-400 rounded-t-sm transition-all" style={{ height: `${pctRev}%`, alignSelf: "flex-end" }} title={`إيرادات: ${fmtEGP(revenue)}`} />
            <div className="flex-1 bg-red-300 rounded-t-sm transition-all" style={{ height: `${pctCost}%`, alignSelf: "flex-end" }} title={`تكاليف: ${fmtEGP(cost)}`} />
          </div>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{monthLabel}</span>
      <span className={`text-[10px] font-semibold ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
        {profit >= 0 ? "+" : ""}{fmt(profit)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Reports() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabId>("overview");
  const [search, setSearch] = useState("");
  const [custSort, setCustSort] = useState<[string, "asc" | "desc"]>(["revenue", "desc"]);
  const [supSort, setSupSort] = useState<[string, "asc" | "desc"]>(["totalSpend", "desc"]);
  const [dnSort, setDnSort] = useState<[string, "asc" | "desc"]>(["createdAt", "desc"]);
  const [invSort, setInvSort] = useState<[string, "asc" | "desc"]>(["createdAt", "desc"]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports-summary"],
    queryFn: fetchSummary,
    staleTime: 30_000,
  });

  const q = search.trim().toLowerCase();

  function makeSort<T extends Record<string, any>>(sort: [string, "asc" | "desc"]) {
    return (a: T, b: T) => {
      const av = a[sort[0]] ?? 0;
      const bv = b[sort[0]] ?? 0;
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sort[1] === "asc" ? cmp : -cmp;
    };
  }

  function toggleSort(current: [string, "asc" | "desc"], col: string, set: (v: [string, "asc" | "desc"]) => void) {
    set(current[0] === col ? [col, current[1] === "asc" ? "desc" : "asc"] : [col, "desc"]);
  }

  const filteredCustomers = useMemo(() => {
    if (!data) return [];
    return [...data.customerStats]
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q))
      .sort(makeSort(custSort));
  }, [data, q, custSort]);

  const filteredSuppliers = useMemo(() => {
    if (!data) return [];
    return [...data.supplierStats]
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q))
      .sort(makeSort(supSort));
  }, [data, q, supSort]);

  const filteredDns = useMemo(() => {
    if (!data) return [];
    return [...data.deliveryNotes.rows]
      .filter((d) => !q || d.dnNumber.toLowerCase().includes(q) || (d.customerName ?? "").toLowerCase().includes(q) || (d.status ?? "").toLowerCase().includes(q))
      .sort(makeSort(dnSort));
  }, [data, q, dnSort]);

  const filteredInvoices = useMemo(() => {
    if (!data) return [];
    return [...data.invoices.rows]
      .filter((i) => !q || i.invoiceNumber.toLowerCase().includes(q) || (i.customerName ?? "").toLowerCase().includes(q) || (i.dnNumber ?? "").toLowerCase().includes(q) || (i.status ?? "").toLowerCase().includes(q))
      .sort(makeSort(invSort));
  }, [data, q, invSort]);

  const ov = data?.overview;
  const fin = data?.financial;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">التقارير الشاملة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">تحليل كامل لجميع عمليات المنظومة</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pr-9"
            placeholder="بحث في التقارير..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
              tab === id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Loading / Error ── */}
      {isLoading && (
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

      {data && (
        <>
          {/* ════════════════ OVERVIEW ════════════════ */}
          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="إجمالي الإيرادات" value={fmtEGP(ov!.totalRevenue)} sub={`مدفوع: ${fmtEGP(ov!.paidRevenue)}`} color="blue" icon={DollarSign} />
                <KpiCard label="إجمالي التكاليف" value={fmtEGP(ov!.totalCost)} color="red" icon={ArrowDownRight} />
                <KpiCard label="إجمالي الأرباح" value={fmtEGP(ov!.grossProfit)} sub={`هامش: ${fmtPct(ov!.profitMargin)}`} color={ov!.grossProfit >= 0 ? "green" : "red"} icon={TrendingUp} />
                <KpiCard label="إيرادات معلقة" value={fmtEGP(ov!.pendingRevenue)} color="yellow" icon={Clock} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="العملاء" value={String(ov!.totalCustomers)} icon={Users} />
                <KpiCard label="الموردون" value={String(ov!.totalSuppliers)} icon={Building2} />
                <KpiCard label="أوامر شراء العملاء" value={String(ov!.totalCustomerPos)} icon={ShoppingCart} />
                <KpiCard label="أوامر شراء الموردين" value={String(ov!.totalSupplierPos)} icon={Truck} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard label="الاستفسارات" value={String(ov!.totalInquiries)} icon={BarChart3} />
                <KpiCard label="أذون التسليم" value={String(ov!.totalDeliveryNotes)} icon={FileCheck} />
                <KpiCard label="الفواتير" value={String(ov!.totalInvoices)} icon={ReceiptText} />
              </div>

              {/* Top customers & suppliers side by side */}
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
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLocation(`/customers`)}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
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
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLocation(`/suppliers`)}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ════════════════ CUSTOMERS ════════════════ */}
          {tab === "customers" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  تقرير العملاء ({filteredCustomers.length})
                </CardTitle>
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
                            <td className="py-3 pr-3 text-center">
                              <span className="text-sm font-semibold">{c.poCount}</span>
                            </td>
                            <td className="py-3 pr-3">
                              <span className="font-semibold text-blue-700">{fmtEGP(c.revenue)}</span>
                            </td>
                            <td className="py-3 pr-3">{fmtEGP(c.invoiceTotal)}</td>
                            <td className="py-3 pr-3 text-green-700 font-medium">{fmtEGP(c.paidTotal)}</td>
                            <td className="py-3 pr-3">
                              <span className={c.pendingTotal > 0 ? "text-yellow-700 font-medium" : "text-muted-foreground"}>
                                {fmtEGP(c.pendingTotal)}
                              </span>
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

          {/* ════════════════ SUPPLIERS ════════════════ */}
          {tab === "suppliers" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  تقرير الموردين ({filteredSuppliers.length})
                </CardTitle>
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
                            <td className="py-3 pr-3">
                              <span className="font-semibold text-red-600">{fmtEGP(s.totalSpend)}</span>
                            </td>
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

          {/* ════════════════ DELIVERY NOTES ════════════════ */}
          {tab === "delivery" && (
            <div className="space-y-4">
              {/* Status breakdown */}
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    سجل أذون التسليم ({filteredDns.length})
                  </CardTitle>
                </CardHeader>
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
                            <th className="py-2 pr-3 font-medium"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredDns.map((dn) => (
                            <tr key={dn.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 pr-3 font-medium">{dn.dnNumber}</td>
                              <td className="py-3 pr-3 text-muted-foreground">{dn.customerName ?? "—"}</td>
                              <td className="py-3 pr-3"><StatusPill status={dn.status} map={DN_STATUS} /></td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">{dn.issueDate ?? "—"}</td>
                              <td className="py-3 pr-3">
                                {dn.invoiceNumber
                                  ? <span className="text-xs text-indigo-700 font-medium">{dn.invoiceNumber}</span>
                                  : <span className="text-xs text-muted-foreground">لا يوجد</span>}
                              </td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(dn.createdAt).toLocaleDateString("ar-EG")}
                              </td>
                              <td className="py-3 pr-3">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/delivery-notes/${dn.id}`)}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </td>
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

          {/* ════════════════ INVOICES ════════════════ */}
          {tab === "invoices" && (
            <div className="space-y-4">
              {/* Status breakdown */}
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
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ReceiptText className="h-4 w-4" />
                    سجل الفواتير ({filteredInvoices.length})
                  </CardTitle>
                </CardHeader>
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
                            <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 pr-3 font-medium">{inv.invoiceNumber}</td>
                              <td className="py-3 pr-3 text-muted-foreground">{inv.customerName ?? "—"}</td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">{inv.dnNumber ?? "—"}</td>
                              <td className="py-3 pr-3"><StatusPill status={inv.status} map={INV_STATUS} /></td>
                              <td className="py-3 pr-3 font-semibold">
                                {inv.totalAmount != null ? fmtEGP(inv.totalAmount) : "—"}
                              </td>
                              <td className="py-3 pr-3 text-xs text-muted-foreground">{inv.issueDate ?? new Date(inv.createdAt).toLocaleDateString("ar-EG")}</td>
                              <td className="py-3 pr-3">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </td>
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

          {/* ════════════════ FINANCIAL CENTER ════════════════ */}
          {tab === "financial" && (
            <div className="space-y-5">
              {/* Main KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard label="إجمالي الإيرادات" value={fmtEGP(fin!.totalRevenue)} sub="من الفواتير غير الملغاة" color="blue" icon={ArrowUpRight} />
                <KpiCard label="إجمالي التكاليف" value={fmtEGP(fin!.totalCost)} sub="أوامر شراء الموردين" color="red" icon={ArrowDownRight} />
                <KpiCard label="صافي الربح" value={fmtEGP(fin!.grossProfit)} sub={`هامش الربح: ${fmtPct(fin!.profitMargin)}`} color={fin!.grossProfit >= 0 ? "green" : "red"} icon={TrendingUp} />
                <KpiCard label="إيرادات محصلة" value={fmtEGP(fin!.paidRevenue)} sub={`${fin!.totalRevenue > 0 ? fmtPct((fin!.paidRevenue / fin!.totalRevenue) * 100) : "0%"} من الإجمالي`} color="green" icon={CheckCircle2} />
                <KpiCard label="إيرادات معلقة" value={fmtEGP(fin!.pendingRevenue)} color="yellow" icon={Clock} />
                <KpiCard label="متوسط قيمة الفاتورة" value={fmtEGP(data.invoices.rows.length > 0 ? fin!.totalRevenue / data.invoices.rows.length : 0)} icon={ReceiptText} />
              </div>

              {/* Monthly chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    الأداء الشهري (آخر 12 شهر)
                  </CardTitle>
                  <div className="flex gap-4 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> إيرادات</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> تكاليف</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {fin!.monthlySeries.length === 0 ? (
                    <EmptyState msg="لا توجد بيانات شهرية بعد" />
                  ) : (
                    <div className="flex items-end gap-2 overflow-x-auto pb-2">
                      {(() => {
                        const maxVal = Math.max(...fin!.monthlySeries.map((m) => Math.max(m.revenue, m.cost)), 1);
                        return fin!.monthlySeries.map((m) => (
                          <MonthBar key={m.month} {...m} maxVal={maxVal} />
                        ));
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cost breakdown: supplier POs by status */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">أعلى العملاء إيراداً</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {fin!.topCustomers.length === 0 ? <EmptyState msg="لا يوجد عملاء بعد" /> : (
                      <div className="space-y-3">
                        {fin!.topCustomers.map((c, i) => {
                          const pct = fin!.totalRevenue > 0 ? (c.revenue / fin!.totalRevenue) * 100 : 0;
                          return (
                            <div key={c.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium truncate">{i + 1}. {c.name}</span>
                                <span className="text-sm font-semibold text-blue-700 ml-2">{fmtEGP(c.revenue)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{fmtPct(pct)} من الإجمالي</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">أعلى الموردين تكلفةً</CardTitle></CardHeader>
                  <CardContent className="pt-0">
                    {fin!.topSuppliers.length === 0 ? <EmptyState msg="لا يوجد موردون بعد" /> : (
                      <div className="space-y-3">
                        {fin!.topSuppliers.map((s, i) => {
                          const pct = fin!.totalCost > 0 ? (s.totalSpend / fin!.totalCost) * 100 : 0;
                          return (
                            <div key={s.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium truncate">{i + 1}. {s.name}</span>
                                <span className="text-sm font-semibold text-red-600 ml-2">{fmtEGP(s.totalSpend)}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className="bg-red-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{fmtPct(pct)} من الإجمالي</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
