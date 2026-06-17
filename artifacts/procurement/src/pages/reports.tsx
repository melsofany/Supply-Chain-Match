import { useLocation } from "wouter";
import { BarChart3, ExternalLink, CheckCircle, Clock, XCircle, FileText, FileCheck } from "lucide-react";
import { useGetPipelineReport, getGetPipelineReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const PO_STATUS_LABELS: Record<string, string> = { received: "مستلم", processing: "قيد المعالجة", fulfilled: "مكتمل", cancelled: "ملغي" };
const DN_STATUS_LABELS: Record<string, string> = { draft: "مسودة", pending_finance: "بانتظار المالية", finance_approved: "معتمد مالياً", delivered: "تم التسليم", signed: "موقع", cancelled: "ملغي" };
const INV_STATUS_LABELS: Record<string, string> = { draft: "مسودة", issued: "صادرة", paid: "مدفوعة", cancelled: "ملغاة" };

const STATUS_DOT: Record<string, string> = {
  received: "bg-blue-400", processing: "bg-yellow-400", fulfilled: "bg-green-500", cancelled: "bg-red-400",
  draft: "bg-gray-300", pending_finance: "bg-yellow-400", finance_approved: "bg-blue-500",
  delivered: "bg-purple-400", signed: "bg-green-500",
  issued: "bg-blue-500", paid: "bg-green-600",
};

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${color}`} />
      {label}
    </span>
  );
}

export default function Reports() {
  const [, setLocation] = useLocation();
  const { data: rows, isLoading } = useGetPipelineReport({ query: { queryKey: getGetPipelineReportQueryKey() } });

  const totalPos = new Set((rows ?? []).map((r) => r.customerPoId)).size;
  const totalDns = (rows ?? []).filter((r) => r.dnId != null).length;
  const totalInvoices = (rows ?? []).filter((r) => r.invoiceId != null).length;
  const paidInvoices = (rows ?? []).filter((r) => r.invoiceStatus === "paid").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">تقرير متابعة العمليات</h1>
        <p className="text-muted-foreground text-sm mt-0.5">التتبع الكامل من أمر الشراء حتى الفاتورة النهائية</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">أوامر شراء</p>
            <p className="text-2xl font-bold mt-1">{totalPos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">أذون تسليم</p>
            <p className="text-2xl font-bold mt-1">{totalDns}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">فواتير صادرة</p>
            <p className="text-2xl font-bold mt-1">{totalInvoices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">فواتير مدفوعة</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{paidInvoices}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            سلسلة العمليات الكاملة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (rows ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد بيانات بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-right py-2 pr-3 font-medium">أمر الشراء</th>
                    <th className="text-right py-2 pr-3 font-medium">العميل</th>
                    <th className="text-right py-2 pr-3 font-medium">عرض السعر</th>
                    <th className="text-right py-2 pr-3 font-medium">الإجمالي</th>
                    <th className="text-right py-2 pr-3 font-medium">إذن التسليم</th>
                    <th className="text-right py-2 pr-3 font-medium">الفاتورة</th>
                    <th className="text-right py-2 pr-3 font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(rows ?? []).map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">{row.customerPoNumber ?? `#${row.customerPoId}`}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLocation(`/customer-pos/${row.customerPoId}`)}>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        <StatusBadge label={PO_STATUS_LABELS[row.customerPoStatus] ?? row.customerPoStatus} color={STATUS_DOT[row.customerPoStatus] ?? "bg-gray-300"} />
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{row.customerName ?? "—"}</td>
                      <td className="py-3 pr-3">
                        {row.quotationId ? (
                          <div className="flex items-center gap-1">
                            <span>{row.quotationNumber ?? `#${row.quotationId}`}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLocation(`/quotations/${row.quotationId}`)}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-3 pr-3 font-medium">
                        {row.totalAmount != null ? `${Number(row.totalAmount).toLocaleString()} ج.م` : "—"}
                      </td>
                      <td className="py-3 pr-3">
                        {row.dnId ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <span>{row.dnNumber}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLocation(`/delivery-notes/${row.dnId}`)}>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <StatusBadge label={DN_STATUS_LABELS[row.dnStatus ?? ""] ?? (row.dnStatus ?? "")} color={STATUS_DOT[row.dnStatus ?? ""] ?? "bg-gray-300"} />
                          </div>
                        ) : <span className="text-xs text-muted-foreground">لا يوجد</span>}
                      </td>
                      <td className="py-3 pr-3">
                        {row.invoiceId ? (
                          <div>
                            <div className="flex items-center gap-1">
                              <span>{row.invoiceNumber}</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setLocation(`/invoices/${row.invoiceId}`)}>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                            <StatusBadge label={INV_STATUS_LABELS[row.invoiceStatus ?? ""] ?? (row.invoiceStatus ?? "")} color={STATUS_DOT[row.invoiceStatus ?? ""] ?? "bg-gray-300"} />
                          </div>
                        ) : <span className="text-xs text-muted-foreground">لا يوجد</span>}
                      </td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString("ar-EG")}
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
