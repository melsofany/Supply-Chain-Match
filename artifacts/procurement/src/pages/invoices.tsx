import { useLocation } from "wouter";
import { FileText, DollarSign } from "lucide-react";
import { useListInvoices, getListInvoicesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  issued: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  issued: "صادرة",
  paid: "مدفوعة",
  cancelled: "ملغاة",
};

export default function Invoices() {
  const [, setLocation] = useLocation();
  const { data: invoices, isLoading } = useListInvoices({ query: { queryKey: getListInvoicesQueryKey() } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">الفواتير</h1>
        <p className="text-muted-foreground text-sm mt-0.5">فواتير العملاء المرتبطة بأذون التسليم</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (invoices ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد فواتير بعد. أنشئ فاتورة من إذن التسليم بعد توقيع العميل.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(invoices ?? []).map((inv) => (
            <Card key={inv.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/invoices/${inv.id}`)}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold text-sm">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.customerName ?? "—"} • إذن: {inv.dnNumber ?? `#${inv.deliveryNoteId}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {inv.totalAmount != null && (
                    <span className="text-sm font-semibold">{Number(inv.totalAmount).toLocaleString()} ج.م</span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[inv.status] ?? ""}`}>
                    {STATUS_LABELS[inv.status] ?? inv.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString("ar-EG")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
