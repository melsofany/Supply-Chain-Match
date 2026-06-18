import { useParams, useLocation } from "wouter";
import { ArrowLeft, Truck, ExternalLink, FileCheck, Plus, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCustomerPo,
  useUpdateCustomerPo,
  useCreateSupplierPo,
  useListSuppliers,
  useListSupplierPos,
  useCreateDeliveryNote,
  useGetCustomerPoTimeline,
  getGetCustomerPoQueryKey,
  getListCustomerPosQueryKey,
  getListSupplierPosQueryKey,
  getListSuppliersQueryKey,
  getListDeliveryNotesQueryKey,
  getGetCustomerPoTimelineQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  CUSTOMER_PO_STATUS_COLORS, CUSTOMER_PO_STATUS_LABELS,
  SUPPLIER_PO_STATUS_COLORS,
  DELIVERY_NOTE_STATUS_COLORS, DELIVERY_NOTE_STATUS_LABELS,
  INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS,
} from "@/lib/status";

export default function CustomerPoDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: po, isLoading } = useGetCustomerPo(numId, {
    query: { enabled: !!numId, queryKey: getGetCustomerPoQueryKey(numId) },
  });
  const { data: suppliers } = useListSuppliers({
    query: { queryKey: getListSuppliersQueryKey() },
  });
  const { data: allSupplierPos } = useListSupplierPos({
    query: { queryKey: getListSupplierPosQueryKey() },
  });
  const { data: timeline } = useGetCustomerPoTimeline(numId, {
    query: { enabled: !!numId, queryKey: getGetCustomerPoTimelineQueryKey(numId) },
  });

  const linkedSupplierPos = (allSupplierPos ?? []).filter((spo) => spo.customerPoId === numId);

  const updatePo = useUpdateCustomerPo();
  const createSupplierPo = useCreateSupplierPo();
  const createDn = useCreateDeliveryNote();

  const [supplierPoDialogOpen, setSupplierPoDialogOpen] = useState(false);
  const [supplierPoForm, setSupplierPoForm] = useState({ supplierId: "", poNumber: "", totalAmount: "", notes: "" });
  const [dnDialogOpen, setDnDialogOpen] = useState(false);
  const [dnForm, setDnForm] = useState({ issueDate: "", notes: "" });

  function handleStatusChange(status: string) {
    updatePo.mutate(
      { id: numId, data: { status: status as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCustomerPoQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListCustomerPosQueryKey() });
          toast({ title: "تم تحديث الحالة" });
        },
      }
    );
  }

  function handleCreateSupplierPo() {
    if (!supplierPoForm.supplierId) {
      toast({ title: "المورد مطلوب", variant: "destructive" });
      return;
    }
    createSupplierPo.mutate(
      {
        data: {
          supplierId: Number(supplierPoForm.supplierId),
          customerPoId: numId,
          ...(supplierPoForm.poNumber && { poNumber: supplierPoForm.poNumber }),
          ...(supplierPoForm.totalAmount && { totalAmount: Number(supplierPoForm.totalAmount) }),
          ...(supplierPoForm.notes && { notes: supplierPoForm.notes }),
          status: "draft",
        },
      },
      {
        onSuccess: (newPo) => {
          qc.invalidateQueries({ queryKey: getListSupplierPosQueryKey() });
          setSupplierPoDialogOpen(false);
          toast({ title: "تم إنشاء أمر شراء المورد" });
          setLocation(`/supplier-pos/${newPo.id}`);
        },
      }
    );
  }

  function handleCreateDn() {
    createDn.mutate(
      {
        data: {
          customerPoId: numId,
          ...(dnForm.issueDate && { issueDate: dnForm.issueDate }),
          ...(dnForm.notes && { notes: dnForm.notes }),
        },
      },
      {
        onSuccess: (dn) => {
          qc.invalidateQueries({ queryKey: getListDeliveryNotesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetCustomerPoTimelineQueryKey(numId) });
          setDnDialogOpen(false);
          toast({ title: `تم إنشاء إذن التسليم ${dn.dnNumber}` });
          setLocation(`/delivery-notes/${dn.id}`);
        },
      }
    );
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!po) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">لم يتم العثور على أمر الشراء.</p>
        <Button variant="link" onClick={() => setLocation("/customer-pos")}>العودة إلى أوامر الشراء</Button>
      </div>
    );
  }

  const deliveryNotes = timeline?.deliveryNotes ?? [];
  const invoices = timeline?.invoices ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customer-pos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{po.poNumber ?? `أمر شراء العميل #${po.id}`}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {po.customerName ?? `عميل #${po.customerId}`} • {new Date(po.createdAt).toLocaleDateString("ar-EG")}
            {po.quotationId && (
              <button className="ml-2 text-blue-600 hover:underline text-xs" onClick={() => setLocation(`/quotations/${po.quotationId}`)}>
                عرض سعر #{po.quotationId}
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${CUSTOMER_PO_STATUS_COLORS[po.status] ?? ""}`}>
            {CUSTOMER_PO_STATUS_LABELS[po.status] ?? po.status}
          </span>
          <Button size="sm" variant="outline" onClick={() => setDnDialogOpen(true)}>
            <FileCheck className="h-4 w-4 mr-1.5" />
            إذن تسليم
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSupplierPoDialogOpen(true)} data-testid="button-create-supplier-po">
            <Truck className="h-4 w-4 mr-1.5" />
            أمر شراء مورد
          </Button>
        </div>
      </div>

      {/* Details card */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">التفاصيل</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">الحالة</Label>
              <Select value={po.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1" data-testid="select-customer-po-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">مستلم</SelectItem>
                  <SelectItem value="processing">قيد المعالجة</SelectItem>
                  <SelectItem value="fulfilled">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الإجمالي</Label>
              <p className="mt-1 font-semibold text-lg">
                {po.totalAmount != null ? `${Number(po.totalAmount).toLocaleString()} ج.م` : "—"}
              </p>
            </div>
          </div>
          {po.notes && (
            <div>
              <Label className="text-xs text-muted-foreground">ملاحظات</Label>
              <p className="mt-1 text-sm">{po.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Notes */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-muted-foreground" />
            أذون التسليم
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setDnDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            جديد
          </Button>
        </CardHeader>
        <CardContent>
          {deliveryNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد أذون تسليم بعد.</p>
          ) : (
            <div className="divide-y">
              {deliveryNotes.map((dn) => (
                <div key={dn.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{dn.dnNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{dn.issueDate ?? new Date(dn.createdAt).toLocaleDateString("ar-EG")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dn.invoice && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                        {dn.invoice.invoiceNumber}
                      </span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DELIVERY_NOTE_STATUS_COLORS[dn.status] ?? ""}`}>
                      {DELIVERY_NOTE_STATUS_LABELS[dn.status] ?? dn.status}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/delivery-notes/${dn.id}`)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            الفواتير
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا توجد فواتير بعد. أنشئ إذن تسليم وقم بتوقيعه لإصدار الفاتورة.
            </p>
          ) : (
            <div className="divide-y">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">إذن: {inv.dnNumber ?? `#${inv.deliveryNoteId}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.totalAmount != null && (
                      <span className="text-sm font-semibold">{Number(inv.totalAmount).toLocaleString()} ج.م</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${INVOICE_STATUS_COLORS[inv.status] ?? ""}`}>
                      {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/invoices/${inv.id}`)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier POs */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              أوامر الشراء للموردين
            </CardTitle>
            {linkedSupplierPos.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">تم إنشاؤها تلقائياً من عرض الأسعار</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {linkedSupplierPos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد أوامر شراء للموردين.</p>
          ) : (
            <div className="divide-y">
              {linkedSupplierPos.map((spo) => (
                <div key={spo.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{spo.supplierName ?? `مورد #${spo.supplierId}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{spo.poNumber ?? `SPO-${spo.id}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {spo.totalAmount != null && (
                      <span className="text-sm font-semibold">{Number(spo.totalAmount).toLocaleString()} ج.م</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SUPPLIER_PO_STATUS_COLORS[spo.status] ?? ""}`}>
                      {spo.status}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLocation(`/supplier-pos/${spo.id}`)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Supplier PO Dialog */}
      <Dialog open={supplierPoDialogOpen} onOpenChange={setSupplierPoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء أمر شراء مورد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>المورد *</Label>
              <Select value={supplierPoForm.supplierId} onValueChange={(v) => setSupplierPoForm({ ...supplierPoForm, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>رقم الأمر</Label>
                <Input value={supplierPoForm.poNumber} onChange={(e) => setSupplierPoForm({ ...supplierPoForm, poNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الإجمالي</Label>
                <Input type="number" value={supplierPoForm.totalAmount} onChange={(e) => setSupplierPoForm({ ...supplierPoForm, totalAmount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={supplierPoForm.notes} onChange={(e) => setSupplierPoForm({ ...supplierPoForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierPoDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateSupplierPo} disabled={createSupplierPo.isPending}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Delivery Note Dialog */}
      <Dialog open={dnDialogOpen} onOpenChange={setDnDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء إذن تسليم</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">سيتم إنشاء إذن تسليم جديد مرتبط بأمر الشراء هذا برقم فريد تلقائياً.</p>
            <div className="space-y-1.5">
              <Label>تاريخ الإصدار</Label>
              <Input type="date" value={dnForm.issueDate} onChange={(e) => setDnForm({ ...dnForm, issueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={dnForm.notes} onChange={(e) => setDnForm({ ...dnForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDnDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateDn} disabled={createDn.isPending}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
