import { useParams, useLocation } from "wouter";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInvoice,
  useUpdateInvoice,
  getGetInvoiceQueryKey,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: invoice, isLoading } = useGetInvoice(numId, {
    query: { enabled: !!numId, queryKey: getGetInvoiceQueryKey(numId) },
  });
  const updateInvoice = useUpdateInvoice();

  function handleStatusChange(status: string) {
    updateInvoice.mutate(
      { id: numId, data: { status: status as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetInvoiceQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          toast({ title: "تم تحديث حالة الفاتورة" });
        },
      }
    );
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  if (!invoice) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">لم يتم العثور على الفاتورة.</p>
      <Button variant="link" onClick={() => setLocation("/invoices")}>العودة</Button>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/invoices")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {invoice.customerName ?? "—"} • إذن التسليم: {invoice.dnNumber ?? `#${invoice.deliveryNoteId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[invoice.status] ?? ""}`}>
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            طباعة
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold">فاتورة</h1>
        <p className="text-xl mt-1">{invoice.invoiceNumber}</p>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">تفاصيل الفاتورة</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">رقم الفاتورة</Label>
              <p className="mt-1 font-bold text-lg">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الحالة</Label>
              <div className="mt-1 print:hidden">
                <Select value={invoice.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="issued">صادرة</SelectItem>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="mt-1 hidden print:block">{STATUS_LABELS[invoice.status]}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">العميل</Label>
              <p className="mt-1 font-medium">{invoice.customerName ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">أمر الشراء</Label>
              <p className="mt-1">{invoice.customerPoNumber ?? `#${invoice.customerPoId}`}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">إذن التسليم</Label>
              <div className="mt-1 flex items-center gap-1">
                <span>{invoice.dnNumber ?? `#${invoice.deliveryNoteId}`}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 print:hidden" onClick={() => setLocation(`/delivery-notes/${invoice.deliveryNoteId}`)}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">تاريخ الفاتورة</Label>
              <p className="mt-1">{invoice.issueDate ?? "—"}</p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">إجمالي الفاتورة</Label>
              <p className="mt-1 font-bold text-2xl text-green-700">
                {invoice.totalAmount != null ? `${Number(invoice.totalAmount).toLocaleString()} ج.م` : "—"}
              </p>
            </div>
            {invoice.notes && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                <p className="mt-1 text-sm">{invoice.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Links */}
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => setLocation(`/customer-pos/${invoice.customerPoId}`)}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          أمر شراء العميل
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation(`/delivery-notes/${invoice.deliveryNoteId}`)}>
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          إذن التسليم
        </Button>
      </div>
    </div>
  );
}
