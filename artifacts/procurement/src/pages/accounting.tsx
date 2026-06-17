import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, BarChart3,
  Shield, Settings2, Receipt, FileText,
} from "lucide-react";
import {
  useGetAccountingSummary,
  useListPoAnalysis,
  getGetAccountingSummaryQueryKey,
  getListPoAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", sent: "مُرسل", confirmed: "مُؤكد", delivered: "مُسلَّم", cancelled: "ملغي",
};

export default function Accounting() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAccountingSummary({
    query: { queryKey: getGetAccountingSummaryQueryKey() },
  });
  const { data: analyses, isLoading: isLoadingAnalyses } = useListPoAnalysis({
    query: { queryKey: getListPoAnalysisQueryKey() },
  });

  const s = summary as any;

  const fmt = (n: number) => n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الحسابات</h1>
        <p className="text-muted-foreground mt-1">تحليل التكاليف والضرائب والأرباح لكل أمر توريد — القانون المصري 2026</p>
      </div>

      {/* Egyptian Tax Law Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p className="font-bold mb-2">📋 الضرائب المُطبَّقة وفق القانون المصري 2026</p>
        <div className="grid grid-cols-2 gap-x-10 gap-y-1.5 text-xs">
          <div className="flex items-start gap-2">
            <Shield className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
            <span><strong>تأمين نهائي 3%:</strong> قانون 182/2018 — عقود الجهات الحكومية والعامة فقط</span>
          </div>
          <div className="flex items-start gap-2">
            <Receipt className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
            <span><strong>ضريبة القيمة المضافة 14%:</strong> قانون 67/2016 — جميع المعاملات التجارية</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
            <span><strong>خصم تحت حساب الضريبة 0.5%:</strong> المادة 59 — قانون 91/2005 — يُورَّد لمصلحة الضرائب</span>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="h-3.5 w-3.5 text-gray-500 mt-0.5 shrink-0" />
            <span><strong>ضريبة الدمغة 0.1%:</strong> قانون 111/1980 — على عقود التوريد التجارية</span>
          </div>
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
              <div className="text-2xl font-bold text-green-600">{fmt(s?.totalRevenue ?? 0)}</div>
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
              <div className="text-2xl font-bold text-red-600">{fmt(s?.totalCost ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">بضاعة + ضرائب + تشغيل</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
              <div className={`text-2xl font-bold ${(s?.totalProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(s?.totalProfit ?? 0)}
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
              <div className="text-2xl font-bold">{pct(s?.avgProfitMargin ?? 0)}</div>
            )}
            <p className="text-xs text-primary-foreground/70 mt-1">{s?.fulfilledCount ?? 0} أمر مكتمل</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: <Shield className="h-4 w-4 text-orange-500" />,
            title: "التأمين النهائي (3%)",
            desc: "عقود حكومية — قانون 182/2018",
            color: "text-orange-600",
            value: s?.totalInsurance ?? 0,
          },
          {
            icon: <Receipt className="h-4 w-4 text-purple-500" />,
            title: "ضريبة القيمة المضافة (14%)",
            desc: "قانون 67/2016",
            color: "text-purple-600",
            value: s?.totalVat ?? 0,
          },
          {
            icon: <FileText className="h-4 w-4 text-yellow-600" />,
            title: "خصم تحت حساب الضريبة (0.5%)",
            desc: "المادة 59 — قانون 91/2005",
            color: "text-yellow-700",
            value: s?.totalWithholdingTax ?? 0,
          },
          {
            icon: <FileText className="h-4 w-4 text-gray-500" />,
            title: "ضريبة الدمغة (0.1%)",
            desc: "قانون 111/1980",
            color: "text-gray-600",
            value: s?.totalStampDuty ?? 0,
          },
        ].map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {card.icon}
                {card.title}
              </CardTitle>
              <CardDescription className="text-xs">{card.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-8 w-28" /> : (
                <div className={`text-2xl font-bold ${card.color}`}>{fmt(card.value)}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operating Cost */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Settings2 className="h-4 w-4 text-blue-500" />
          <div>
            <CardTitle className="text-base">التكاليف التشغيلية</CardTitle>
            <CardDescription>تكاليف يدوية مُضافة لكل أمر توريد</CardDescription>
          </div>
          <div className="mr-auto">
            {isLoadingSummary ? <Skeleton className="h-7 w-28" /> : (
              <span className="text-2xl font-bold text-blue-600">{fmt(s?.totalOperatingCost ?? 0)}</span>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* PO Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تحليل الأرباح والخسائر لكل أمر توريد
          </CardTitle>
          <CardDescription>تفصيل كامل وفق القانون المصري 2026</CardDescription>
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
                    <th className="text-left pb-3 px-2 text-orange-500">تأمين 3%</th>
                    <th className="text-left pb-3 px-2 text-purple-500">VAT 14%</th>
                    <th className="text-left pb-3 px-2 text-yellow-600">خصم 0.5%</th>
                    <th className="text-left pb-3 px-2 text-gray-500">دمغة 0.1%</th>
                    <th className="text-left pb-3 px-2 text-blue-500">تشغيل</th>
                    <th className="text-left pb-3 px-2 font-semibold text-foreground">الإجمالي</th>
                    <th className="text-left pb-3 px-2">الإيراد</th>
                    <th className="text-left pb-3 px-2">الربح</th>
                    <th className="text-left pb-3 px-2">الهامش</th>
                    <th className="text-right pb-3 pr-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analyses.map((a: any) => (
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
                                ← {a.customerPoNumber}
                              </span>
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">{a.supplierName ?? `مورد #${a.supplierId}`}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2 tabular-nums">{fmt(a.grossCost)}</td>
                      <td className="py-3 px-2 text-orange-600 tabular-nums">{fmt(a.insuranceAmount ?? 0)}</td>
                      <td className="py-3 px-2 text-purple-600 tabular-nums">{fmt(a.vatAmount ?? 0)}</td>
                      <td className="py-3 px-2 text-yellow-700 tabular-nums">{fmt(a.withholdingTaxAmount ?? 0)}</td>
                      <td className="py-3 px-2 text-gray-600 tabular-nums">{fmt(a.stampDutyAmount ?? 0)}</td>
                      <td className="py-3 px-2 text-blue-600 tabular-nums">{fmt(a.operatingCost)}</td>
                      <td className="py-3 px-2 font-semibold tabular-nums">{fmt(a.totalCost)}</td>
                      <td className="py-3 px-2 text-green-600 tabular-nums">
                        {a.revenue != null ? fmt(a.revenue) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-2 tabular-nums">
                        {a.profit != null ? (
                          <span className={a.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {fmt(a.profit)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-2 tabular-nums">
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
