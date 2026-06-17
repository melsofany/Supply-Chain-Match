import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, FileText, Send, CheckCircle, Clock, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInquiry,
  useUpdateInquiry,
  useAddInquiryItem,
  useUpdateInquiryItem,
  useDeleteInquiryItem,
  useCreateQuotation,
  useListSuppliers,
  getGetInquiryQueryKey,
  getListInquiriesQueryKey,
  getListQuotationsQueryKey,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useSupplierRfqsByInquiry,
  useCreateSupplierRfq,
  useUpdateSupplierRfq,
  useDeleteSupplierRfq,
  type SupplierRfq,
} from "@/hooks/use-supplier-rfqs";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  quoted: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

const RFQ_STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: "bg-gray-100 text-gray-700", label: "معلق", icon: <Clock className="h-3.5 w-3.5" /> },
  sent:    { color: "bg-blue-100 text-blue-700", label: "أُرسل", icon: <Send className="h-3.5 w-3.5" /> },
  received:{ color: "bg-green-100 text-green-800", label: "استُلم الرد", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled:{ color: "bg-red-100 text-red-700", label: "ملغي", icon: <XCircle className="h-3.5 w-3.5" /> },
};

function RfqCard({ rfq, onEdit, onDelete }: { rfq: SupplierRfq; onEdit: (rfq: SupplierRfq) => void; onDelete: (id: number) => void }) {
  const cfg = RFQ_STATUS_CONFIG[rfq.status] ?? RFQ_STATUS_CONFIG.pending;
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0" data-testid={`row-rfq-${rfq.id}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{rfq.supplierName ?? `مورد #${rfq.supplierId}`}</p>
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {rfq.rfqNumber && <span className="ml-2">{rfq.rfqNumber} •</span>}
          {rfq.quotedPrice != null
            ? <span className="font-semibold text-green-700"> سعر المورد: ${Number(rfq.quotedPrice).toLocaleString()}</span>
            : <span className="italic"> لم يُستلم سعر بعد</span>
          }
          {rfq.notes && <span className="ml-2 text-muted-foreground"> • {rfq.notes}</span>}
        </p>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(rfq)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(rfq.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function InquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: inquiry, isLoading } = useGetInquiry(numId, {
    query: { enabled: !!numId, queryKey: getGetInquiryQueryKey(numId) },
  });
  const { data: suppliers } = useListSuppliers({
    query: { queryKey: getListSuppliersQueryKey() },
  });

  const updateInquiry = useUpdateInquiry();
  const addItem = useAddInquiryItem();
  const updateItem = useUpdateInquiryItem();
  const deleteItem = useDeleteInquiryItem();
  const createQuotation = useCreateQuotation();

  // RFQ state
  const { data: rfqs, isLoading: isLoadingRfqs, refetch: refetchRfqs } = useSupplierRfqsByInquiry(numId);
  const { create: createRfq, isCreating: isCreatingRfq } = useCreateSupplierRfq(refetchRfqs);
  const { remove: deleteRfq } = useDeleteSupplierRfq(refetchRfqs);

  const [editingRfq, setEditingRfq] = useState<SupplierRfq | null>(null);
  const { update: updateRfq, isUpdating: isUpdatingRfq } = useUpdateSupplierRfq(editingRfq?.id ?? 0, refetchRfqs);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ description: "", quantity: "", unit: "", notes: "" });

  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const [rfqDeleteId, setRfqDeleteId] = useState<number | null>(null);
  const [rfqForm, setRfqForm] = useState({
    supplierId: "", rfqNumber: "", quotedPrice: "", status: "pending", notes: "",
  });

  function openAddItem() {
    setEditingItemId(null);
    setItemForm({ description: "", quantity: "", unit: "", notes: "" });
    setItemDialogOpen(true);
  }

  function openEditItem(item: NonNullable<typeof inquiry>["items"][number]) {
    setEditingItemId(item.id);
    setItemForm({
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit ?? "",
      notes: item.notes ?? "",
    });
    setItemDialogOpen(true);
  }

  function handleItemSubmit() {
    if (!itemForm.description.trim() || !itemForm.quantity) {
      toast({ title: "الوصف والكمية مطلوبان", variant: "destructive" });
      return;
    }
    const data = {
      description: itemForm.description,
      quantity: Number(itemForm.quantity),
      ...(itemForm.unit && { unit: itemForm.unit }),
      ...(itemForm.notes && { notes: itemForm.notes }),
    };
    if (editingItemId != null) {
      updateItem.mutate(
        { id: numId, itemId: editingItemId, data },
        { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) }); setItemDialogOpen(false); toast({ title: "تم تحديث البند" }); } }
      );
    } else {
      addItem.mutate(
        { id: numId, data },
        { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) }); setItemDialogOpen(false); toast({ title: "تمت إضافة البند" }); } }
      );
    }
  }

  function handleDeleteItem() {
    if (deleteItemId == null) return;
    deleteItem.mutate(
      { id: numId, itemId: deleteItemId },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) }); setDeleteItemId(null); toast({ title: "تم حذف البند" }); } }
    );
  }

  function handleStatusChange(status: string) {
    updateInquiry.mutate(
      { id: numId, data: { status: status as any } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) }); qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() }); toast({ title: "تم تحديث الحالة" }); } }
    );
  }

  function handleCreateQuotation() {
    if (!inquiry) return;
    createQuotation.mutate(
      { data: { inquiryId: numId, customerId: inquiry.customerId, status: "draft" } },
      {
        onSuccess: (newQ) => {
          qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
          updateInquiry.mutate(
            { id: numId, data: { status: "quoted" as any } },
            { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) }); qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() }); } }
          );
          toast({ title: "تم إنشاء عرض السعر — تم تحديث حالة الاستفسار إلى «تم تقديم العرض»" });
          setLocation(`/quotations/${newQ.id}`);
        },
      }
    );
  }

  function openAddRfq() {
    setEditingRfq(null);
    setRfqForm({ supplierId: "", rfqNumber: "", quotedPrice: "", status: "pending", notes: "" });
    setRfqDialogOpen(true);
  }

  function openEditRfq(rfq: SupplierRfq) {
    setEditingRfq(rfq);
    setRfqForm({
      supplierId: String(rfq.supplierId),
      rfqNumber: rfq.rfqNumber ?? "",
      quotedPrice: rfq.quotedPrice != null ? String(rfq.quotedPrice) : "",
      status: rfq.status,
      notes: rfq.notes ?? "",
    });
    setRfqDialogOpen(true);
  }

  function handleRfqSubmit() {
    if (!rfqForm.supplierId) {
      toast({ title: "المورد مطلوب", variant: "destructive" });
      return;
    }
    if (editingRfq) {
      updateRfq(
        {
          status: rfqForm.status as any,
          ...(rfqForm.quotedPrice && { quotedPrice: Number(rfqForm.quotedPrice) }),
          ...(rfqForm.rfqNumber && { rfqNumber: rfqForm.rfqNumber }),
          ...(rfqForm.notes && { notes: rfqForm.notes }),
        },
        { onSuccess: () => { setRfqDialogOpen(false); toast({ title: "تم تحديث طلب التسعير" }); } }
      );
    } else {
      createRfq({
        inquiryId: numId,
        supplierId: Number(rfqForm.supplierId),
        ...(rfqForm.rfqNumber && { rfqNumber: rfqForm.rfqNumber }),
        ...(rfqForm.notes && { notes: rfqForm.notes }),
      });
      setRfqDialogOpen(false);
      toast({ title: "تم إرسال طلب التسعير للمورد" });
    }
  }

  function handleDeleteRfq() {
    if (rfqDeleteId == null) return;
    deleteRfq(rfqDeleteId);
    setRfqDeleteId(null);
    toast({ title: "تم حذف طلب التسعير" });
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!inquiry) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">الاستفسار غير موجود.</p>
        <Button variant="link" onClick={() => setLocation("/inquiries")}>العودة للاستفسارات</Button>
      </div>
    );
  }

  const receivedRfqs = rfqs.filter(r => r.status === "received" && r.quotedPrice != null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/inquiries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{inquiry.title}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {inquiry.customerName ?? `عميل #${inquiry.customerId}`} •{" "}
            {new Date(inquiry.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={inquiry.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36" data-testid="select-inquiry-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">جديد</SelectItem>
              <SelectItem value="in_progress">قيد المعالجة</SelectItem>
              <SelectItem value="quoted">تم تقديم العرض</SelectItem>
              <SelectItem value="closed">مغلق</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreateQuotation} disabled={createQuotation.isPending} data-testid="button-create-quotation-from-inquiry">
            <FileText className="h-4 w-4 mr-2" />
            إنشاء عرض سعر
          </Button>
        </div>
      </div>

      {inquiry.description && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{inquiry.description}</CardContent>
        </Card>
      )}

      {/* بنود الاستفسار */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">البنود المطلوبة</CardTitle>
          <Button size="sm" onClick={openAddItem} data-testid="button-add-item">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            إضافة بند
          </Button>
        </CardHeader>
        <CardContent>
          {inquiry.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد بنود بعد.</p>
          ) : (
            <div className="divide-y">
              {inquiry.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3" data-testid={`row-item-${item.id}`}>
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      الكمية: {item.quantity} {item.unit ?? ""}
                      {item.notes && ` • ${item.notes}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteItemId(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== قسم طلبات تسعير الموردين ===== */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              طلبات تسعير الموردين
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              الطلبات المرسلة للموردين بناءً على هذا الاستفسار
              {rfqs.length > 0 && <span className="ml-1">({rfqs.length} طلب)</span>}
            </p>
          </div>
          <Button size="sm" onClick={openAddRfq} data-testid="button-add-rfq">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            طلب تسعير مورد
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingRfqs ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rfqs.length === 0 ? (
            <div className="text-center py-6">
              <Send className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لم يُرسل أي طلب تسعير للموردين بعد.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openAddRfq}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                إرسال طلب تسعير
              </Button>
            </div>
          ) : (
            <div>
              {rfqs.map((rfq) => (
                <RfqCard
                  key={rfq.id}
                  rfq={rfq}
                  onEdit={openEditRfq}
                  onDelete={(id) => setRfqDeleteId(id)}
                />
              ))}
              {receivedRfqs.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-100">
                  <p className="text-xs font-medium text-green-800 mb-2">
                    ✓ استُلمت أسعار من {receivedRfqs.length} مورد
                  </p>
                  <div className="space-y-1">
                    {receivedRfqs.map((r) => (
                      <div key={r.id} className="flex justify-between text-sm">
                        <span className="text-green-700">{r.supplierName}</span>
                        <span className="font-semibold text-green-800">${Number(r.quotedPrice).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    يمكنك الآن إنشاء عرض سعر للعميل بناءً على أفضل سعر.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== Dialogs ====== */}

      {/* بند الاستفسار */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItemId ? "تعديل البند" : "إضافة بند"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الوصف *</Label>
              <Input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} data-testid="input-item-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الكمية *</Label>
                <Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} data-testid="input-item-quantity" />
              </div>
              <div className="space-y-1.5">
                <Label>الوحدة</Label>
                <Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="قطعة، كجم، متر..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleItemSubmit} disabled={addItem.isPending || updateItem.isPending} data-testid="button-submit-item">
              {editingItemId ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* طلب تسعير مورد */}
      <Dialog open={rfqDialogOpen} onOpenChange={setRfqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRfq ? "تعديل طلب تسعير المورد" : "طلب تسعير من مورد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>المورد *</Label>
              <Select
                value={rfqForm.supplierId}
                onValueChange={(v) => setRfqForm({ ...rfqForm, supplierId: v })}
                disabled={!!editingRfq}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورد..." />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>رقم الطلب</Label>
                <Input
                  value={rfqForm.rfqNumber}
                  onChange={(e) => setRfqForm({ ...rfqForm, rfqNumber: e.target.value })}
                  placeholder="RFQ-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={rfqForm.status} onValueChange={(v) => setRfqForm({ ...rfqForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="sent">أُرسل للمورد</SelectItem>
                    <SelectItem value="received">استُلم الرد</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>السعر المعروض من المورد</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rfqForm.quotedPrice}
                  onChange={(e) => setRfqForm({ ...rfqForm, quotedPrice: e.target.value })}
                  placeholder="يُملأ عند استلام رد المورد"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={rfqForm.notes} onChange={(e) => setRfqForm({ ...rfqForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRfqDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleRfqSubmit} disabled={isCreatingRfq || isUpdatingRfq}>
              {editingRfq ? "تحديث" : "إرسال الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حذف بند */}
      <AlertDialog open={deleteItemId != null} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف البند؟</AlertDialogTitle>
            <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حذف طلب تسعير */}
      <AlertDialog open={rfqDeleteId != null} onOpenChange={(o) => !o && setRfqDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف طلب التسعير؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف طلب التسعير المرسل لهذا المورد.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRfq}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
