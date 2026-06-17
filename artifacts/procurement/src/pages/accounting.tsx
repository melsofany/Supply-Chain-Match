import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, Shield, Settings2, Receipt,
} from "lucide-react";
import {
  useGetAccountingSummary,
  useListPoAnalysis,
  getGetAccountingSummaryQueryKey,
  getListPoAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

export default function Accounting() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAccountingSummary({
    query: { queryKey: getGetAccountingSummaryQueryKey() },
  });
  const { data: analyses, isLoading: isLoadingAnalyses } = useListPoAnalysis({
    query: { queryKey: getListPoAnalysisQueryKey() },
  });

  const fmt = (n: number) => n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الحسابات</h1>
        <p className="text-muted-foreground mt-1">تحليل التكاليف والضرائب والأرباح لكل أمر توريد</p>
      </div>

      {/* Egyptian Tax Info Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold mb-1">📋 نظام الضرائب المصري 2026</p>
        <div className="flex flex-wrap gap-6 mt-1">
          <span><Shield className="inline h-3.5 w-3.5 ml-1" />تأمين أمر التوريد: <strong>3%</strong> من قيمة البضاعة</span>
          <span><Receipt className="inline h-3.5 w-3.5 ml-1" />ضريبة القيمة المضافة (VAT): <strong>14%</strong> (قانون 67 لسنة 2016)</span>
          <span>يُحسب كلٌّ منهما <strong>منفصلاً</strong> على قيمة البضاعة الأساسية</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
              <div className="text-2xl font-bold text-green-600">{fmt(summary?.totalRevenue ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">من أوامر شراء العملاء</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">إجمالي التكاليف</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
              <div className="text-2xl font-bold text-red-600">{fmt(summary?.totalCost ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">بضاعة + تأمين + ضريبة + تشغيل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
              <div className={`text-2xl font-bold ${(summary?.totalProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(summary?.totalProfit ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">الإيرادات − إجمالي التكاليف</p>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">متوسط هامش الربح</CardTitle>
            <Percent className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-16 bg-primary-foreground/20" /> : (
              <div className="text-2xl font-bold">{pct(summary?.avgProfitMargin ?? 0)}</div>
            )}
            <p className="text-xs text-primary-foreground/70 mt-1">{summary?.fulfilledCount ?? 0} أمر مكتمل</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax & Insurance & Operating Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500" />
              التأمين (3%)
            </CardTitle>
            <CardDescription>على كل أمر توريد — ثابت بالقانون المصري</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-10 w-32" /> : (
              <div>
                <div className="text-3xl font-bold text-orange-600">{fmt((summary as any)?.totalInsurance ?? 0)}</div>
                <p className="text-sm text-muted-foreground mt-1">إجمالي التأمين لجميع الأوامر</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-purple-500" />
              ضريبة القيمة المضافة (14%)
            </CardTitle>
            <CardDescription>قانون 67 لسنة 2016 — محسوبة على قيمة البضاعة</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-10 w-32" /> : (
              <div>
                <div className="text-3xl font-bold text-purple-600">{fmt((summary as any)?.totalVat ?? 0)}</div>
                <p className="text-sm text-muted-foreground mt-1">إجمالي ضريبة القيمة المضافة</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-500" />
              التكاليف التشغيلية
            </CardTitle>
            <CardDescription>تكاليف يدوية مضافة لكل أمر توريد</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-10 w-32" /> : (
              <div>
                <div className="text-3xl font-bold text-blue-600">{fmt(summary?.totalOperatingCost ?? 0)}</div>
                <p className="text-sm text-muted-foreground mt-1">إجمالي التكاليف التشغيلية</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PO Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تحليل الأرباح والخسائر لكل أمر توريد
          </CardTitle>
          <CardDescription>تفصيل كامل لتكاليف كل أمر توريد وفق القانون المصري 2026</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAnalyses ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !analyses || analyses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد أوامر توريد بعد</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-right pb-3 pl-4">الأمر / المورد</th>
                    <th className="text-left pb-3 px-2">البضاعة</th>
                    <th className="text-left pb-3 px-2 text-orange-600">تأمين 3%</th>
                    <th className="text-left pb-3 px-2 text-purple-600">ضريبة 14%</th>
                    <th className="text-left pb-3 px-2 text-blue-600">تشغيل</th>
                    <th className="text-left pb-3 px-2 font-semibold text-foreground">الإجمالي</th>
                    <th className="text-left pb-3 px-2">الإيراد</th>
                    <th className="text-left pb-3 px-2">الربح</th>
                    <th className="text-left pb-3 px-2">الهامش</th>
                    <th className="text-right pb-3 pr-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analyses.map((a) => (
                    <tr key={a.supplierPoId} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pl-4">
                        <div>
                          <Link href={`/supplier-pos/${a.supplierPoId}`}>
                            <span className="font-medium hover:text-primary cursor-pointer">
                              {a.supplierPoNumber ?? `أمر #${a.supplierPoId}`}
                            </span>
                          </Link>
                          {a.customerPoNumber && (
                            <Link href={`/customer-pos/${a.customerPoId}`}>
                              <span className="text-xs text-muted-foreground hover:text-primary cursor-pointer block">
                                ← {a.customerPoNumber ?? `أمر عميل #${a.customerPoId}`}
                              </span>
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">{a.supplierName ?? `مورد #${a.supplierId}`}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">{fmt(a.grossCost)}</td>
                      <td className="py-3 px-2 text-orange-600">{fmt((a as any).insuranceAmount ?? 0)}</td>
                      <td className="py-3 px-2 text-purple-600">{fmt((a as any).vatAmount ?? 0)}</td>
                      <td className="py-3 px-2 text-blue-600">{fmt(a.operatingCost)}</td>
                      <td className="py-3 px-2 font-semibold">{fmt(a.totalCost)}</td>
                      <td className="py-3 px-2 text-green-600">
                        {a.revenue != null ? fmt(a.revenue) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-2">
                        {a.profit != null ? (
                          <span className={a.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {fmt(a.profit)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-2">
                        {a.profitMargin != null ? (
                          <span className={a.profitMargin >= 0 ? "text-green-600" : "text-red-600"}>
                            {pct(a.profitMargin)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? ""}`}>
                          {STATUS_LABELS[a.status] ?? a.status}
                        </span>
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
  );
}
