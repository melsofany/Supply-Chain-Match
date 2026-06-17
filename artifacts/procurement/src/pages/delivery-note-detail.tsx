import { useParams, useLocation } from "wouter";
import { ArrowLeft, CheckCircle, PenLine, FileText, AlertTriangle, Printer, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDeliveryNote,
  useApproveDeliveryNoteFinance,
  useMarkDeliveryNoteSigned,
  useUpdateDeliveryNote,
  useCreateInvoice,
  getGetDeliveryNoteQueryKey,
  getListDeliveryNotesQueryKey,
  getListInvoicesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_finance: "bg-yellow-100 text-yellow-800",
  finance_approved: "bg-blue-100 text-blue-700",
  delivered: "bg-purple-100 text-purple-700",
  signed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending_finance: "بانتظار اعتماد المالية",
  finance_approved: "معتمد مالياً",
  delivered: "تم التسليم",
  signed: "موقع من العميل",
  cancelled: "ملغي",
};

export default function DeliveryNoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: dn, isLoading } = useGetDeliveryNote(numId, {
    query: { enabled: !!numId, queryKey: getGetDeliveryNoteQueryKey(numId) },
  });

  const approveFin = useApproveDeliveryNoteFinance();
  const markSigned = useMarkDeliveryNoteSigned();
  const updateDn = useUpdateDeliveryNote();
  const createInvoice = useCreateInvoice();

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signedFileUrl, setSignedFileUrl] = useState("");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ issueDate: "", totalAmount: "", notes: "" });
  const [submitForFinanceOpen, setSubmitForFinanceOpen] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: getGetDeliveryNoteQueryKey(numId) });
    qc.invalidateQueries({ queryKey: getListDeliveryNotesQueryKey() });
  }

  function handleSubmitForFinance() {
    updateDn.mutate(
      { id: numId, data: { status: "pending_finance" } },
      {
        onSuccess: () => { invalidate(); setSubmitForFinanceOpen(false); toast({ title: "تم إرسال الإذن لاعتماد المالية" }); },
      }
    );
  }

  function handleApproveFinance() {
    approveFin.mutate(
      { id: numId },
      { onSuccess: () => { invalidate(); toast({ title: "تم اعتماد إذن التسليم مالياً" }); } }
    );
  }

  function handleMarkDelivered() {
    updateDn.mutate(
      { id: numId, data: { status: "delivered" } },
      { onSuccess: () => { invalidate(); toast({ title: "تم تحديث الحالة إلى: تم التسليم" }); } }
    );
  }

  function handleMarkSigned() {
    markSigned.mutate(
      { id: numId, data: signedFileUrl ? { signedFileUrl } : {} },
      {
        onSuccess: () => {
          invalidate();
          setSignDialogOpen(false);
          toast({ title: "تم تسجيل توقيع العميل — يمكن الآن إصدار الفاتورة" });
        },
      }
    );
  }

  function handleCreateInvoice() {
    createInvoice.mutate(
      {
        data: {
          deliveryNoteId: numId,
          ...(invoiceForm.issueDate && { issueDate: invoiceForm.issueDate }),
          ...(invoiceForm.totalAmount && { totalAmount: Number(invoiceForm.totalAmount) }),
          ...(invoiceForm.notes && { notes: invoiceForm.notes }),
        },
      },
      {
        onSuccess: (inv) => {
          qc.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
          invalidate();
          setInvoiceDialogOpen(false);
          toast({ title: `تم إنشاء الفاتورة ${inv.invoiceNumber}` });
          setLocation(`/invoices/${inv.id}`);
        },
        onError: (e: any) => {
          const msg = e?.response?.data?.error ?? "فشل إنشاء الفاتورة";
          toast({ title: msg, variant: "destructive" });
        },
      }
    );
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  if (!dn) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">لم يتم العثور على إذن التسليم.</p>
      <Button variant="link" onClick={() => setLocation("/delivery-notes")}>العودة</Button>
    </div>
  );

  const canSubmitForFinance = dn.status === "draft";
  const canApproveFinance = dn.status === "pending_finance";
  const canMarkDelivered = dn.status === "finance_approved";
  const canMarkSigned = dn.status === "delivered";
  const canCreateInvoice = dn.status === "signed" && !dn.invoice;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/delivery-notes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{dn.dnNumber}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {dn.customerName ?? "—"} • {dn.customerPoNumber ? `أمر شراء: ${dn.customerPoNumber}` : `Customer PO #${dn.customerPoId}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[dn.status] ?? ""}`}>
            {STATUS_LABELS[dn.status] ?? dn.status}
          </span>
          {canSubmitForFinance && (
            <Button size="sm" variant="outline" onClick={() => setSubmitForFinanceOpen(true)}>
              إرسال للمالية
            </Button>
          )}
          {canApproveFinance && (
            <Button size="sm" onClick={handleApproveFinance} disabled={approveFin.isPending} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="h-4 w-4 mr-1.5" />
              اعتماد المالية
            </Button>
          )}
          {canMarkDelivered && (
            <Button size="sm" variant="outline" onClick={handleMarkDelivered}>
              تأكيد التسليم
            </Button>
          )}
          {canMarkSigned && (
            <Button size="sm" onClick={() => setSignDialogOpen(true)} className="bg-green-600 hover:bg-green-700">
              <PenLine className="h-4 w-4 mr-1.5" />
              تسجيل توقيع العميل
            </Button>
          )}
          {/* Print button - only active after finance_approved */}
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            disabled={dn.status === "draft" || dn.status === "pending_finance"}
            title={dn.status === "draft" || dn.status === "pending_finance" ? "يتطلب اعتماد المالية أولاً" : "طباعة إذن التسليم"}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            طباعة
          </Button>
          {canCreateInvoice && (
            <Button size="sm" onClick={() => setInvoiceDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <FileText className="h-4 w-4 mr-1.5" />
              إنشاء فاتورة
            </Button>
          )}
        </div>
      </div>

      {/* Print Header (visible only when printing) */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold">إذن التسليم</h1>
        <p className="text-xl mt-1">{dn.dnNumber}</p>
      </div>

      {/* Finance approval warning */}
      {(dn.status === "draft" || dn.status === "pending_finance") && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 print:hidden">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            {dn.status === "draft"
              ? "يجب إرسال الإذن لاعتماد المالية قبل طباعته أو تسليمه."
              : "في انتظار اعتماد إدارة المالية — لا يمكن طباعة الإذن حتى الاعتماد."}
          </p>
        </div>
      )}

      {/* DN Details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">تفاصيل إذن التسليم</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">رقم الإذن</Label>
              <p className="mt-1 font-semibold">{dn.dnNumber}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الحالة</Label>
              <p className="mt-1"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[dn.status] ?? ""}`}>{STATUS_LABELS[dn.status] ?? dn.status}</span></p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">العميل</Label>
              <p className="mt-1">{dn.customerName ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">أمر الشراء</Label>
              <p className="mt-1">{dn.customerPoNumber ?? `#${dn.customerPoId}`}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">تاريخ الإصدار</Label>
              <p className="mt-1">{dn.issueDate ?? "—"}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">تاريخ اعتماد المالية</Label>
              <p className="mt-1">{dn.financeApprovedAt ? new Date(dn.financeApprovedAt).toLocaleDateString("ar-EG") : "—"}</p>
            </div>
            {dn.signedFileUrl && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">النسخة الموقعة</Label>
                <a href={dn.signedFileUrl} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-sm text-blue-600 hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />
                  عرض الملف الموقع
                </a>
              </div>
            )}
            {dn.notes && (
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                <p className="mt-1 text-sm">{dn.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Linked Invoice */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />الفاتورة المرتبطة</CardTitle></CardHeader>
        <CardContent>
          {dn.invoice ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{dn.invoice.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dn.invoice.status}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setLocation(`/invoices/${dn.invoice!.id}`)}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                فتح الفاتورة
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {dn.status === "signed"
                ? "يمكنك الآن إصدار الفاتورة."
                : "لا يمكن إصدار الفاتورة إلا بعد توقيع العميل على هذا الإذن."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submit for Finance Dialog */}
      <Dialog open={submitForFinanceOpen} onOpenChange={setSubmitForFinanceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إرسال للمالية</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            هل تريد إرسال هذا الإذن لإدارة المالية للاعتماد؟ بعد الإرسال لا يمكن تعديله إلا بعد الاعتماد.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitForFinanceOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmitForFinance} disabled={updateDn.isPending}>إرسال</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Signed Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تسجيل توقيع العميل</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">أدخل رابط النسخة الموقعة من العميل (اختياري). بعد التسجيل يمكن إصدار الفاتورة.</p>
            <div className="space-y-1.5">
              <Label>رابط الملف الموقع (URL)</Label>
              <Input
                placeholder="https://..."
                value={signedFileUrl}
                onChange={(e) => setSignedFileUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleMarkSigned} disabled={markSigned.isPending} className="bg-green-600 hover:bg-green-700">
              تأكيد التوقيع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إصدار فاتورة</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>تاريخ الفاتورة</Label>
              <Input type="date" value={invoiceForm.issueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, issueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>إجمالي الفاتورة</Label>
              <Input type="number" value={invoiceForm.totalAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, totalAmount: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateInvoice} disabled={createInvoice.isPending}>إصدار</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
