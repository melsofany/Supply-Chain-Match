import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, TrendingDown, DollarSign, Shield, Receipt, FileText,
  BookOpen, Scale, BarChart3, Calculator, RefreshCw,
  CheckCircle2, Building2,
} from "lucide-react";
import {
  useGetAccountingSummary,
  useListPoAnalysis,
  getGetAccountingSummaryQueryKey,
  getListPoAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const BASE = "/api";
const fmt = (n: number) =>
  n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function useAccounting<T>(path: string, params?: Record<string, string>) {
  const url = new URL(BASE + path, window.location.origin);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return useQuery<T>({
    queryKey: [path, params],
    queryFn: async () => {
      const r = await fetch(url.toString(), { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });
}

// ── دليل الحسابات ────────────────────────────────────────────────────────────
function ChartOfAccounts() {
  const { data, isLoading } = useAccounting<any[]>("/accounting/ledger/accounts");

  const byGroup: Record<string, any[]> = {};
  (data ?? []).forEach((a) => {
    const gname = a.group?.name ?? "أخرى";
    (byGroup[gname] = byGroup[gname] ?? []).push(a);
  });

  const typeColors: Record<string, string> = {
    ASSET: "bg-blue-100 text-blue-700",
    LIABILITY: "bg-red-100 text-red-700",
    EQUITY: "bg-purple-100 text-purple-700",
    INCOME: "bg-green-100 text-green-700",
    EXPENSE: "bg-orange-100 text-orange-700",
  };
  const typeLabels: Record<string, string> = {
    ASSET: "أصول",
    LIABILITY: "خصوم",
    EQUITY: "حقوق ملكية",
    INCOME: "إيرادات",
    EXPENSE: "مصروفات",
  };

  if (isLoading)
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-bold text-lg">دليل الحسابات — النظام المحاسبي الموحد المصري</h2>
          <p className="text-sm text-muted-foreground">
            {data?.length ?? 0} حساب في {Object.keys(byGroup).length} مجموعة
          </p>
        </div>
      </div>
      {Object.entries(byGroup).map(([gname, accounts]) => {
        const gtype = accounts[0]?.group?.type ?? "";
        return (
          <div key={gname} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between">
              <span className="font-semibold text-sm">{gname}</span>
              <Badge className={`text-xs ${typeColors[gtype] ?? "bg-gray-100 text-gray-700"}`}>
                {typeLabels[gtype] ?? gtype}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right w-24">الرمز</TableHead>
                  <TableHead className="text-right">اسم الحساب</TableHead>
                  <TableHead className="text-right w-28">الطبيعة</TableHead>
                  <TableHead className="text-right w-24">نظامي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono font-bold text-primary">{a.code}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {a.group?.nature === "DEBIT" ? "مدين" : "دائن"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {a.is_system ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}

// ── قيود اليومية ─────────────────────────────────────────────────────────────
function JournalEntries() {
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState({ from, to });
  const { data, isLoading, refetch } = useAccounting<any[]>(
    "/accounting/ledger/vouchers",
    search
  );

  const typeLabels: Record<string, string> = {
    JOURNAL: "يومية",
    SALES: "مبيعات",
    PURCHASE: "مشتريات",
    PAYMENT: "دفع",
    RECEIPT: "قبض",
  };
  const typeColors: Record<string, string> = {
    JOURNAL: "bg-gray-100 text-gray-700",
    SALES: "bg-green-100 text-green-700",
    PURCHASE: "bg-blue-100 text-blue-700",
    PAYMENT: "bg-red-100 text-red-700",
    RECEIPT: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 bg-muted/30 rounded-lg p-4">
        <div>
          <Label className="text-xs mb-1 block">من تاريخ</Label>
          <Input
            type="date" value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">إلى تاريخ</Label>
          <Input
            type="date" value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => setSearch({ from, to })}>
          <RefreshCw className="h-3.5 w-3.5 ml-1" /> بحث
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>لا توجد قيود في هذه الفترة</p>
          <p className="text-xs mt-1">
            استخدم أزرار "قيّد" من صفحة أوامر الشراء أو الفواتير
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((v) => {
            const totalDebit = (v.entries ?? []).reduce(
              (s: number, e: any) => s + Number(e.debit || 0),
              0
            );
            return (
              <div key={v.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`text-xs ${typeColors[v.voucher_type] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {typeLabels[v.voucher_type] ?? v.voucher_type}
                    </Badge>
                    <span className="font-mono text-sm font-bold text-primary">
                      {v.reference_id}
                    </span>
                    <span className="text-sm text-muted-foreground">{v.narration}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{v.date}</span>
                    <span className="font-bold">{fmt(totalDebit)} ج.م</span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الحساب</TableHead>
                      <TableHead className="text-right w-36">مدين</TableHead>
                      <TableHead className="text-right w-36">دائن</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(v.entries ?? []).map((e: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground ml-2">
                            {e.account_code}
                          </span>
                          {e.account_name}
                        </TableCell>
                        <TableCell
                          className={
                            Number(e.debit) > 0
                              ? "font-bold text-blue-700"
                              : "text-muted-foreground"
                          }
                        >
                          {Number(e.debit) > 0 ? fmt(Number(e.debit)) : "—"}
                        </TableCell>
                        <TableCell
                          className={
                            Number(e.credit) > 0
                              ? "font-bold text-green-700"
                              : "text-muted-foreground"
                          }
                        >
                          {Number(e.credit) > 0 ? fmt(Number(e.credit)) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ميزان المراجعة ────────────────────────────────────────────────────────────
function TrialBalance() {
  const { data, isLoading } = useAccounting<any>("/accounting/ledger/trial-balance");

  if (isLoading)
    return (
      <div className="space-y-2">
        {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );

  const rows: any[] = data?.rows ?? [];
  const totalDebit = Number(data?.totalDebit ?? 0);
  const totalCredit = Number(data?.totalCredit ?? 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">ميزان المراجعة</h2>
        </div>
        <Badge className={balanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
          {balanced ? "✓ متوازن" : "⚠ غير متوازن"}
        </Badge>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-right">الكود</TableHead>
              <TableHead className="text-right">اسم الحساب</TableHead>
              <TableHead className="text-right">المجموعة</TableHead>
              <TableHead className="text-right">إجمالي المدين</TableHead>
              <TableHead className="text-right">إجمالي الدائن</TableHead>
              <TableHead className="text-right">الرصيد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.account_id}>
                <TableCell className="font-mono text-primary font-bold text-sm">
                  {r.code}
                </TableCell>
                <TableCell className="text-sm">{r.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.group_name}</TableCell>
                <TableCell className="text-blue-700 font-mono text-sm">
                  {Number(r.debit_total) > 0 ? fmt(Number(r.debit_total)) : "—"}
                </TableCell>
                <TableCell className="text-green-700 font-mono text-sm">
                  {Number(r.credit_total) > 0 ? fmt(Number(r.credit_total)) : "—"}
                </TableCell>
                <TableCell
                  className={`font-bold font-mono text-sm ${Number(r.balance) >= 0 ? "text-blue-700" : "text-red-600"}`}
                >
                  {fmt(Math.abs(Number(r.balance)))} {Number(r.balance) >= 0 ? "م" : "د"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="bg-muted/40 px-4 py-3 flex justify-between items-center border-t">
          <span className="font-bold text-sm">الإجمالي</span>
          <div className="flex gap-8">
            <span className="text-blue-700 font-bold font-mono">{fmt(totalDebit)} م</span>
            <span className="text-green-700 font-bold font-mono">{fmt(totalCredit)} د</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── القوائم المالية ───────────────────────────────────────────────────────────
function FinancialStatements() {
  const { data: pl, isLoading: plLoading } = useAccounting<any>(
    "/accounting/ledger/income-statement"
  );
  const { data: bs, isLoading: bsLoading } = useAccounting<any>(
    "/accounting/ledger/balance-sheet"
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* قائمة الدخل */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h2 className="font-bold text-lg">قائمة الدخل</h2>
        </div>
        {plLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-2 border-b">
              <span className="font-bold text-sm text-green-800">الإيرادات</span>
            </div>
            {(pl?.income ?? []).map((g: any) => (
              <div
                key={g.group_id}
                className="flex justify-between px-4 py-2.5 border-b text-sm"
              >
                <span>{g.group_name}</span>
                <span className="font-bold text-green-700">{fmt(Number(g.balance))}</span>
              </div>
            ))}
            <div className="bg-green-50 flex justify-between px-4 py-2.5 border-b font-bold text-sm">
              <span>إجمالي الإيرادات</span>
              <span className="text-green-700">{fmt(Number(pl?.total_income ?? 0))} ج.م</span>
            </div>
            <div className="bg-red-50 px-4 py-2 border-b">
              <span className="font-bold text-sm text-red-800">المصروفات</span>
            </div>
            {(pl?.expenses ?? []).map((g: any) => (
              <div
                key={g.group_id}
                className="flex justify-between px-4 py-2.5 border-b text-sm"
              >
                <span>{g.group_name}</span>
                <span className="font-bold text-red-600">{fmt(Number(g.balance))}</span>
              </div>
            ))}
            <div className="bg-red-50 flex justify-between px-4 py-2.5 border-b font-bold text-sm">
              <span>إجمالي المصروفات</span>
              <span className="text-red-600">{fmt(Number(pl?.total_expenses ?? 0))} ج.م</span>
            </div>
            <div
              className={`flex justify-between px-4 py-3 font-bold ${Number(pl?.net_profit ?? 0) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              <span className="text-base">
                {Number(pl?.net_profit ?? 0) >= 0 ? "✓ صافي الربح" : "✗ صافي الخسارة"}
              </span>
              <span className="text-xl">
                {fmt(Math.abs(Number(pl?.net_profit ?? 0)))} ج.م
              </span>
            </div>
          </div>
        )}
      </div>

      {/* الميزانية العمومية */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h2 className="font-bold text-lg">الميزانية العمومية</h2>
        </div>
        {bsLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-blue-50 px-4 py-2 border-b">
              <span className="font-bold text-sm text-blue-800">الأصول</span>
            </div>
            {(bs?.assets ?? []).map((g: any) => (
              <div
                key={g.group_id}
                className="flex justify-between px-4 py-2.5 border-b text-sm"
              >
                <span>{g.group_name}</span>
                <span className="font-bold text-blue-700">{fmt(Number(g.balance))}</span>
              </div>
            ))}
            <div className="bg-blue-50 flex justify-between px-4 py-2.5 border-b font-bold text-sm">
              <span>إجمالي الأصول</span>
              <span className="text-blue-700">{fmt(Number(bs?.total_assets ?? 0))} ج.م</span>
            </div>
            <div className="bg-orange-50 px-4 py-2 border-b">
              <span className="font-bold text-sm text-orange-800">الخصوم</span>
            </div>
            {(bs?.liabilities ?? []).map((g: any) => (
              <div
                key={g.group_id}
                className="flex justify-between px-4 py-2.5 border-b text-sm"
              >
                <span>{g.group_name}</span>
                <span className="font-bold text-orange-700">{fmt(Number(g.balance))}</span>
              </div>
            ))}
            <div className="bg-purple-50 px-4 py-2 border-b">
              <span className="font-bold text-sm text-purple-800">حقوق الملكية</span>
            </div>
            {(bs?.equity ?? []).map((g: any) => (
              <div
                key={g.group_id}
                className="flex justify-between px-4 py-2.5 border-b text-sm"
              >
                <span>{g.group_name}</span>
                <span className="font-bold text-purple-700">{fmt(Number(g.balance))}</span>
              </div>
            ))}
            <div className="bg-orange-50 flex justify-between px-4 py-3 font-bold text-sm">
              <span>إجمالي الخصوم + حقوق الملكية</span>
              <span className="text-orange-700">
                {fmt(Number(bs?.total_liabilities ?? 0) + Number(bs?.total_equity ?? 0))} ج.م
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── تقرير ضريبة القيمة المضافة ────────────────────────────────────────────────
function VatReport() {
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState({ from, to });
  const { data, isLoading } = useAccounting<any>("/accounting/vat-report", search);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-900">
        <p className="font-bold">📋 قانون 67/2016 — ضريبة القيمة المضافة 14%</p>
        <p className="text-xs mt-1">
          تُسدَّد قبل آخر الشهر التالي للفترة الضريبية إلى مصلحة الضرائب المصرية
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3 bg-muted/30 rounded-lg p-4">
        <div>
          <Label className="text-xs mb-1 block">من تاريخ</Label>
          <Input
            type="date" value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">إلى تاريخ</Label>
          <Input
            type="date" value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 text-sm w-40"
          />
        </div>
        <Button size="sm" onClick={() => setSearch({ from, to })}>
          <RefreshCw className="h-3.5 w-3.5 ml-1" /> تحديث
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-blue-700 mb-1">ضريبة القيمة المضافة — مدخلات</p>
                <p className="text-2xl font-bold text-blue-800">
                  {fmt(data?.inputVat?.total ?? 0)}
                </p>
                <p className="text-xs text-blue-600 mt-1">ج.م</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-green-700 mb-1">ضريبة القيمة المضافة — مخرجات</p>
                <p className="text-2xl font-bold text-green-800">
                  {fmt(data?.outputVat?.total ?? 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">ج.م</p>
              </CardContent>
            </Card>
            <Card
              className={`border-2 ${(data?.netVatPayable ?? 0) >= 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}
            >
              <CardContent className="pt-4 pb-3">
                <p
                  className={`text-xs mb-1 ${(data?.netVatPayable ?? 0) >= 0 ? "text-red-700" : "text-emerald-700"}`}
                >
                  {(data?.netVatPayable ?? 0) >= 0 ? "صافي مستحق للدفع" : "رصيد دائن (مسترد)"}
                </p>
                <p
                  className={`text-2xl font-bold ${(data?.netVatPayable ?? 0) >= 0 ? "text-red-800" : "text-emerald-800"}`}
                >
                  {fmt(Math.abs(data?.netVatPayable ?? 0))}
                </p>
                <p
                  className={`text-xs mt-1 ${(data?.netVatPayable ?? 0) >= 0 ? "text-red-600" : "text-emerald-600"}`}
                >
                  ج.م
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold text-sm mb-2 text-blue-700">
                ضريبة مدخلات — مشتريات من الموردين
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50">
                      <TableHead className="text-right">المرجع</TableHead>
                      <TableHead className="text-right">المورد</TableHead>
                      <TableHead className="text-right">الأساس</TableHead>
                      <TableHead className="text-right">ضريبة 14%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.inputVat?.items ?? []).slice(0, 15).map((i: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{i.ref}</TableCell>
                        <TableCell className="text-sm">{i.party ?? "—"}</TableCell>
                        <TableCell className="text-sm">{fmt(i.base)}</TableCell>
                        <TableCell className="font-bold text-blue-700">
                          {fmt(i.vatAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-2 text-green-700">
                ضريبة مخرجات — فواتير للعملاء
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-50">
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">الأساس</TableHead>
                      <TableHead className="text-right">ضريبة 14%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.outputVat?.items ?? []).slice(0, 15).map((i: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs">{i.ref}</TableCell>
                        <TableCell className="text-sm">{i.party ?? "—"}</TableCell>
                        <TableCell className="text-sm">{fmt(i.base)}</TableCell>
                        <TableCell className="font-bold text-green-700">
                          {fmt(i.vatAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(data?.outputVat?.items ?? []).length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-muted-foreground text-sm py-4"
                        >
                          لا توجد فواتير في هذه الفترة
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── تقرير ضريبة الخصم والإضافة ────────────────────────────────────────────────
function WhtReport() {
  const { data, isLoading } = useAccounting<any>("/accounting/wht-report");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
        <p className="font-bold">📋 المادة 59 — قانون الضريبة على الدخل 91/2005</p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <span>• المورد التجاري (سلع): <strong>0.5%</strong></span>
          <span>• التسجيل: <strong>ربع سنوي</strong></span>
          <span>• المواعيد: يناير، أبريل، يوليو، أكتوبر</span>
          <span>• الجهة: <strong>مصلحة الضرائب المصرية</strong></span>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي ضريبة الخصم المستحقة</p>
              <p className="text-3xl font-bold text-amber-700">
                {isLoading ? "..." : fmt(data?.totalWht ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ج.م — تُستقطع من مستحقات الموردين
              </p>
            </div>
            <Receipt className="h-10 w-10 text-amber-400" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50">
                <TableHead className="text-right">رقم الأمر</TableHead>
                <TableHead className="text-right">اسم المورد</TableHead>
                <TableHead className="text-right">قيمة الأمر</TableHead>
                <TableHead className="text-right">نسبة الخصم</TableHead>
                <TableHead className="text-right">مبلغ الخصم</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((i: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">{i.ref}</TableCell>
                  <TableCell className="text-sm">{i.supplierName ?? "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{fmt(i.base)}</TableCell>
                  <TableCell className="text-sm">{i.whtRate}%</TableCell>
                  <TableCell className="font-bold text-amber-700">{fmt(i.whtAmount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {i.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── التأمينات الاجتماعية ──────────────────────────────────────────────────────
function SocialInsurance() {
  const [basicSalary, setBasicSalary] = useState("5000");
  const [allowances, setAllowances] = useState("2000");
  const [employeeCount, setEmployeeCount] = useState("1");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculate = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/accounting/social-insurance/calculate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicSalary: Number(basicSalary),
          allowances: Number(allowances),
          employeeCount: Number(employeeCount),
        }),
      });
      setResult(await r.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <p className="font-bold">📋 قانون التأمين الاجتماعي والمعاشات 148/2019</p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
          <span>• حصة صاحب العمل: <strong>26%</strong></span>
          <span>• حصة العامل: <strong>11%</strong></span>
          <span>• الحد الأدنى للأجر التأميني: <strong>1,700 ج.م</strong></span>
          <span>• الحد الأقصى للأجر التأميني: <strong>11,400 ج.م</strong></span>
          <span>• موعد السداد: <strong>قبل 15 من الشهر التالي</strong></span>
          <span>• الجهة: <strong>الهيئة القومية للتأمين الاجتماعي</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" /> حاسبة التأمينات الاجتماعية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-1 block">الراتب الأساسي (ج.م)</Label>
              <Input
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                type="number"
                min="0"
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">البدلات والمكملات (ج.م)</Label>
              <Input
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                type="number"
                min="0"
              />
            </div>
            <div>
              <Label className="text-sm mb-1 block">عدد الموظفين</Label>
              <Input
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                type="number"
                min="1"
              />
            </div>
            <Button onClick={calculate} disabled={loading} className="w-full">
              {loading ? "جاري الحساب..." : "احسب التأمينات"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-3">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 space-y-2">
                <h3 className="font-bold text-blue-800">نتيجة الحساب — لكل موظف</h3>
                <Separator />
                {[
                  ["الراتب الأساسي", result.perEmployee.basicSalary],
                  ["البدلات", result.perEmployee.allowances],
                  ["الراتب الإجمالي", result.perEmployee.totalSalary],
                  ["الأجر التأميني المعتمد", result.perEmployee.insurableSalary],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-sm">
                    <span>{label as string}</span>
                    <span className="font-bold">{fmt(val as number)} ج.م</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>حصة صاحب العمل (26%)</span>
                  <span className="font-bold text-orange-700">
                    {fmt(result.perEmployee.employerShare.amount)} ج.م
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>حصة العامل (11%)</span>
                  <span className="font-bold text-blue-700">
                    {fmt(result.perEmployee.employeeShare.amount)} ج.م
                  </span>
                </div>
                <div className="flex justify-between font-bold bg-blue-100 rounded px-2 py-1.5">
                  <span>إجمالي شهري / موظف</span>
                  <span className="text-blue-800">
                    {fmt(result.perEmployee.totalMonthly)} ج.م
                  </span>
                </div>
              </CardContent>
            </Card>

            {Number(employeeCount) > 1 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-bold text-green-800">إجمالي {employeeCount} موظف</h3>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>حصة صاحب العمل الشهرية</span>
                    <span className="font-bold text-orange-700">
                      {fmt(result.forAllEmployees.totalEmployerShare)} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>حصة العمال الشهرية</span>
                    <span className="font-bold text-blue-700">
                      {fmt(result.forAllEmployees.totalEmployeeShare)} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between font-bold bg-green-100 rounded px-2 py-1.5">
                    <span>الإجمالي الشهري</span>
                    <span className="text-green-800">
                      {fmt(result.forAllEmployees.totalMonthly)} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg bg-green-200 rounded px-2 py-2">
                    <span>الإجمالي السنوي</span>
                    <span className="text-green-900">
                      {fmt(result.forAllEmployees.totalAnnual)} ج.م
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────────
export default function Accounting() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAccountingSummary({
    query: { queryKey: getGetAccountingSummaryQueryKey() },
  });
  const { data: analyses, isLoading: isLoadingAnalyses } = useListPoAnalysis({
    query: { queryKey: getListPoAnalysisQueryKey() },
  });

  const s = summary as any;

  const STATUS_COLORS: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    confirmed: "bg-yellow-100 text-yellow-700",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-700",
  };
  const STATUS_LABELS: Record<string, string> = {
    draft: "مسودة",
    sent: "مُرسل",
    confirmed: "مُؤكد",
    delivered: "مُسلَّم",
    cancelled: "ملغي",
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          نظام المحاسبة المتكامل
        </h1>
        <p className="text-muted-foreground mt-1">
          مدعوم بـ{" "}
          <span className="font-bold text-primary">LedgerStack Core</span>{" "}
          — قيد مزدوج • دليل حسابات مصري • تقارير ضريبية رسمية
        </p>
      </div>

      <Tabs defaultValue="summary" dir="rtl">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="summary" className="text-xs sm:text-sm">ملخص</TabsTrigger>
          <TabsTrigger value="coa" className="text-xs sm:text-sm">دليل الحسابات</TabsTrigger>
          <TabsTrigger value="journal" className="text-xs sm:text-sm">قيود اليومية</TabsTrigger>
          <TabsTrigger value="trial" className="text-xs sm:text-sm">ميزان المراجعة</TabsTrigger>
          <TabsTrigger value="statements" className="text-xs sm:text-sm">القوائم المالية</TabsTrigger>
          <TabsTrigger value="vat" className="text-xs sm:text-sm">ضريبة القيمة المضافة</TabsTrigger>
          <TabsTrigger value="wht" className="text-xs sm:text-sm">ضريبة الخصم</TabsTrigger>
          <TabsTrigger value="insurance" className="text-xs sm:text-sm">التأمينات</TabsTrigger>
        </TabsList>

        {/* ── ملخص ── */}
        <TabsContent value="summary" className="space-y-6 mt-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <p className="font-bold mb-2">📋 الضرائب المُطبَّقة وفق القانون المصري</p>
            <div className="grid grid-cols-2 gap-x-10 gap-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                <span><strong>تأمين نهائي 3%:</strong> قانون 182/2018</span>
              </div>
              <div className="flex items-start gap-2">
                <Receipt className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                <span><strong>ضريبة القيمة المضافة 14%:</strong> قانون 67/2016</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
                <span><strong>خصم تحت حساب الضريبة 0.5%:</strong> قانون 91/2005</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-gray-500 mt-0.5 shrink-0" />
                <span><strong>ضريبة الدمغة 0.1%:</strong> قانون 111/1980</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "إجمالي الإيرادات",
                value: s?.totalRevenue ?? 0,
                icon: DollarSign,
                color: "text-green-600",
              },
              {
                label: "إجمالي التكاليف",
                value: s?.totalCost ?? 0,
                icon: TrendingDown,
                color: "text-red-500",
              },
              {
                label: "صافي الربح",
                value: s?.totalProfit ?? 0,
                icon: TrendingUp,
                color: "text-emerald-600",
              },
              {
                label: "متوسط هامش الربح",
                value: `${s?.avgProfitMargin ?? 0}%`,
                icon: BarChart3,
                color: "text-blue-600",
                isText: true,
              },
            ].map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoadingSummary ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <div className={`text-2xl font-bold ${card.color}`}>
                      {card.isText ? card.value : `${fmt(card.value as number)} ج.م`}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                label: "ضريبة القيمة المضافة",
                value: s?.totalVat ?? 0,
                color: "text-purple-600",
                sub: "14% على المشتريات",
              },
              {
                label: "ضريبة الخصم والإضافة",
                value: s?.totalWithholdingTax ?? 0,
                color: "text-amber-600",
                sub: "0.5% على المشتريات",
              },
              {
                label: "التأمين النهائي",
                value: s?.totalInsurance ?? 0,
                color: "text-orange-600",
                sub: "3% عقود حكومية",
              },
              {
                label: "ضريبة الدمغة",
                value: s?.totalStampDuty ?? 0,
                color: "text-gray-600",
                sub: "0.1% على العقود",
              },
            ].map((card) => (
              <Card key={card.label} className="bg-muted/30">
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  {isLoadingSummary ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    <p className={`text-xl font-bold ${card.color}`}>
                      {fmt(card.value)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4">
              تحليل أرباح وخسائر أوامر التوريد
            </h2>
            {isLoadingAnalyses ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="text-right">رقم الأمر</TableHead>
                      <TableHead className="text-right">المورد</TableHead>
                      <TableHead className="text-right">التكلفة الإجمالية</TableHead>
                      <TableHead className="text-right">الإيراد</TableHead>
                      <TableHead className="text-right">الربح</TableHead>
                      <TableHead className="text-right">هامش الربح</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((analyses as any[]) ?? []).map((a: any) => (
                      <TableRow key={a.supplierPoId}>
                        <TableCell className="font-mono text-xs">
                          {a.supplierPoNumber}
                        </TableCell>
                        <TableCell className="text-sm">{a.supplierName ?? "—"}</TableCell>
                        <TableCell className="font-mono text-sm text-red-600">
                          {fmt(a.totalCost)}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-green-600">
                          {a.revenue != null ? fmt(a.revenue) : "—"}
                        </TableCell>
                        <TableCell
                          className={`font-mono text-sm font-bold ${(a.profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {a.profit != null ? fmt(a.profit) : "—"}
                        </TableCell>
                        <TableCell
                          className={`text-sm font-bold ${(a.profitMargin ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {a.profitMargin != null ? `${a.profitMargin}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${STATUS_COLORS[a.status] ?? "bg-gray-100 text-gray-700"}`}
                          >
                            {STATUS_LABELS[a.status] ?? a.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="coa" className="mt-6">
          <ChartOfAccounts />
        </TabsContent>
        <TabsContent value="journal" className="mt-6">
          <JournalEntries />
        </TabsContent>
        <TabsContent value="trial" className="mt-6">
          <TrialBalance />
        </TabsContent>
        <TabsContent value="statements" className="mt-6">
          <FinancialStatements />
        </TabsContent>
        <TabsContent value="vat" className="mt-6">
          <VatReport />
        </TabsContent>
        <TabsContent value="wht" className="mt-6">
          <WhtReport />
        </TabsContent>
        <TabsContent value="insurance" className="mt-6">
          <SocialInsurance />
        </TabsContent>
      </Tabs>
    </div>
  );
}
