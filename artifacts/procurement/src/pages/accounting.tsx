import { Link } from "wouter";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, Shield, Settings2,
  AlertTriangle, CheckCircle, Clock,
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

export default function Accounting() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAccountingSummary({
    query: { queryKey: getGetAccountingSummaryQueryKey() },
  });
  const { data: analyses, isLoading: isLoadingAnalyses } = useListPoAnalysis({
    query: { queryKey: getListPoAnalysisQueryKey() },
  });

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground mt-1">Cost analysis, tax & insurance, and P&L per supplier PO</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
              <div className="text-2xl font-bold text-green-600">{fmt(summary?.totalRevenue ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Customer PO amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
              <div className="text-2xl font-bold text-red-600">{fmt(summary?.totalCost ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Supplier + tax + operating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-24" /> : (
              <div className={`text-2xl font-bold ${(summary?.totalProfit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {fmt(summary?.totalProfit ?? 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Revenue − Total Cost</p>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">Avg. Margin</CardTitle>
            <Percent className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-7 w-16 bg-primary-foreground/20" /> : (
              <div className="text-2xl font-bold">{pct(summary?.avgProfitMargin ?? 0)}</div>
            )}
            <p className="text-xs text-primary-foreground/70 mt-1">{summary?.fulfilledCount ?? 0} completed POs</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax & Operating breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Tax & Insurance (3%)
            </CardTitle>
            <CardDescription>Automatically applied to all supplier POs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-10 w-32" /> : (
              <div>
                <div className="text-3xl font-bold text-orange-600">{fmt(summary?.totalTaxInsurance ?? 0)}</div>
                <p className="text-sm text-muted-foreground mt-1">Total tax & insurance across all POs</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Operating Costs
            </CardTitle>
            <CardDescription>Manual costs added per supplier PO</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-10 w-32" /> : (
              <div>
                <div className="text-3xl font-bold text-blue-600">{fmt(summary?.totalOperatingCost ?? 0)}</div>
                <p className="text-sm text-muted-foreground mt-1">Total operating costs across all POs</p>
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
            P&L per Supplier PO
          </CardTitle>
          <CardDescription>Full cost breakdown for every supplier purchase order</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAnalyses ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !analyses || analyses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No supplier POs yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left pb-3 pr-4">PO / Supplier</th>
                    <th className="text-right pb-3 px-3">Gross Cost</th>
                    <th className="text-right pb-3 px-3">Tax & Ins. (3%)</th>
                    <th className="text-right pb-3 px-3">Operating</th>
                    <th className="text-right pb-3 px-3 font-semibold text-foreground">Total Cost</th>
                    <th className="text-right pb-3 px-3">Revenue</th>
                    <th className="text-right pb-3 px-3">Profit</th>
                    <th className="text-right pb-3 pl-3">Margin</th>
                    <th className="text-left pb-3 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {analyses.map((a) => (
                    <tr key={a.supplierPoId} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pr-4">
                        <div>
                          <Link href={`/supplier-pos/${a.supplierPoId}`}>
                            <span className="font-medium hover:text-primary cursor-pointer">
                              {a.supplierPoNumber ?? `SPO #${a.supplierPoId}`}
                            </span>
                          </Link>
                          {a.customerPoNumber && (
                            <Link href={`/customer-pos/${a.customerPoId}`}>
                              <span className="text-xs text-muted-foreground hover:text-primary cursor-pointer block">
                                ← {a.customerPoNumber ?? `CPO #${a.customerPoId}`}
                              </span>
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">{a.supplierName ?? `Supplier #${a.supplierId}`}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">{fmt(a.grossCost)}</td>
                      <td className="py-3 px-3 text-right text-orange-600">{fmt(a.taxInsuranceAmount)}</td>
                      <td className="py-3 px-3 text-right text-blue-600">{fmt(a.operatingCost)}</td>
                      <td className="py-3 px-3 text-right font-semibold">{fmt(a.totalCost)}</td>
                      <td className="py-3 px-3 text-right text-green-600">
                        {a.revenue != null ? fmt(a.revenue) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {a.profit != null ? (
                          <span className={a.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {fmt(a.profit)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        {a.profitMargin != null ? (
                          <span className={a.profitMargin >= 0 ? "text-green-600" : "text-red-600"}>
                            {pct(a.profitMargin)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 pl-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[a.status] ?? ""}`}>
                          {a.status}
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
