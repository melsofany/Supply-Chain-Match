import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle, TrendingDown, History, Printer, FileQuestion } from "lucide-react";
import { PrintHeader } from "@/components/print-header";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetQuotation,
  useUpdateQuotation,
  useAddQuotationItem,
  useUpdateQuotationItem,
  useDeleteQuotationItem,
  useApproveQuotation,
  useRejectQuotation,
  useListSuppliers,
  useCreateCustomerPo,
  useGetPriceHistorySuggestions,
  getGetQuotationQueryKey,
  getListQuotationsQueryKey,
  getListCustomerPosQueryKey,
  getListSuppliersQueryKey,
  getGetPriceHistorySuggestionsQueryKey,
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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function PriceHistoryWarning({ description }: { description: string }) {
  const { data: suggestions } = useGetPriceHistorySuggestions(
    { q: description },
    { query: { enabled: description.trim().length >= 3, queryKey: getGetPriceHistorySuggestionsQueryKey({ q: description }) } }
  );

  if (!suggestions || !suggestions.hasWarning) return null;

  return (
    <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm flex gap-2">
      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-yellow-800">تحذير تسعير</p>
        <p className="text-yellow-700 mt-0.5">{suggestions.warningMessage}</p>
        {suggestions.lowestSuccessfulPrice != null && (
          <p className="text-green-700 mt-1 flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" />
            أقل سعر نجح سابقاً: ${suggestions.lowestSuccessfulPrice.toLocaleString()}
          </p>
        )}
        {suggestions.suggestedMaxPrice != null && (
          <p className="text-xs text-yellow-600 mt-1">
            السقف المقترح: أقل من ${suggestions.suggestedMaxPrice.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function PriceHistoryList({ description }: { description: string }) {
  const { data: suggestions } = useGetPriceHistorySuggestions(
    { q: description },
    { query: { enabled: description.trim().length >= 3, queryKey: getGetPriceHistorySuggestionsQueryKey({ q: description }) } }
  );

  if (!suggestions || suggestions.entries.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
        <History className="h-3.5 w-3.5" />
        تاريخ التسعير لهذا البند ({suggestions.entries.length} سجل)
      </p>
      <div className="space-y-1.5">
        {suggestions.entries.slice(0, 5).map((e) => (
          <div key={e.id} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{new Date(e.createdAt).toLocaleDateString("ar-EG")}</span>
            <span className="font-medium">${Number(e.unitPrice).toLocaleString()}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${e.resultedInPo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {e.resultedInPo ? "✓ صدر PO" : "✗ لم يصدر"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: quotation, isLoading } = useGetQuotation(numId, {
    query: { enabled: !!numId, queryKey: getGetQuotationQueryKey(numId) },
  });
  const { data: suppliers } = useListSuppliers({
    query: { queryKey: getListSuppliersQueryKey() },
  });

  const updateQuotation = useUpdateQuotation();
  const addItem = useAddQuotationItem();
  const updateItem = useUpdateQuotationItem();
  const deleteItem = useDeleteQuotationItem();
  const approveMutation = useApproveQuotation();
  const rejectMutation = useRejectQuotation();
  const createCustomerPo = useCreateCustomerPo();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({
    description: "", quantity: "", unit: "", unitPrice: "", supplierId: "", notes: "",
  });
  const [descriptionForHistory, setDescriptionForHistory] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDescriptionForHistory(itemForm.description), 400);
    return () => clearTimeout(timer);
  }, [itemForm.description]);

  function openAddItem() {
    setEditingItemId(null);
    setItemForm({ description: "", quantity: "", unit: "", unitPrice: "", supplierId: "", notes: "" });
    setDescriptionForHistory("");
    setItemDialogOpen(true);
  }

  function openEditItem(item: NonNullable<typeof quotation>["items"][number]) {
    setEditingItemId(item.id);
    setItemForm({
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit ?? "",
      unitPrice: String(item.unitPrice),
      supplierId: item.supplierId != null ? String(item.supplierId) : "",
      notes: item.notes ?? "",
    });
    setDescriptionForHistory(item.description);
    setItemDialogOpen(true);
  }

  function handleItemSubmit() {
    if (!itemForm.description.trim() || !itemForm.quantity || !itemForm.unitPrice) {
      toast({ title: "الوصف والكمية والسعر حقول مطلوبة", variant: "destructive" });
      return;
    }
    const data = {
      description: itemForm.description,
      quantity: Number(itemForm.quantity),
      unitPrice: Number(itemForm.unitPrice),
      ...(itemForm.unit && { unit: itemForm.unit }),
      ...(itemForm.supplierId && itemForm.supplierId !== "" && { supplierId: Number(itemForm.supplierId) }),
      ...(itemForm.notes && { notes: itemForm.notes }),
    };

    if (editingItemId != null) {
      updateItem.mutate(
        { id: numId, itemId: editingItemId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetQuotationQueryKey(numId) });
            setItemDialogOpen(false);
            toast({ title: "تم تحديث البند" });
          },
        }
      );
    } else {
      addItem.mutate(
        { id: numId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetQuotationQueryKey(numId) });
            setItemDialogOpen(false);
            toast({ title: "تمت إضافة البند — تم تسجيل السعر في السجل" });
          },
        }
      );
    }
  }

  function handleDeleteItem() {
    if (deleteItemId == null) return;
    deleteItem.mutate(
      { id: numId, itemId: deleteItemId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetQuotationQueryKey(numId) });
          setDeleteItemId(null);
          toast({ title: "تم حذف البند" });
        },
      }
    );
  }

  function handleApprove() {
    approveMutation.mutate(
      { id: numId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetQuotationQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
          toast({ title: "تمت الموافقة على عرض السعر — تم تحديث سجل الأسعار بنجاح" });
        },
      }
    );
  }

  function handleReject() {
    rejectMutation.mutate(
      { id: numId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetQuotationQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
          toast({ title: "تم رفض عرض السعر — تم تحديث سجل الأسعار بالفشل" });
        },
      }
    );
  }

  function handleCreateCustomerPo() {
    if (!quotation) return;
    createCustomerPo.mutate(
      {
        data: {
          customerId: quotation.customerId,
          quotationId: numId,
          status: "received",
          totalAmount: totalAmount > 0 ? totalAmount : undefined,
        },
      },
      {
        onSuccess: (newPo) => {
          qc.invalidateQueries({ queryKey: getListCustomerPosQueryKey() });
          const itemsWithSupplier = quotation?.items.filter((i) => i.supplierId != null) ?? [];
          const uniqueSuppliers = new Set(itemsWithSupplier.map((i) => i.supplierId)).size;
          toast({
            title: "تم إنشاء أمر شراء العميل",
            description: uniqueSuppliers > 0
              ? `تم إنشاء ${uniqueSuppliers} أمر شراء للمورد${uniqueSuppliers > 1 ? "ين" : ""} تلقائياً`
              : "لا توجد بنود مرتبطة بموردين لإنشاء أوامر شراء تلقائياً",
          });
          setLocation(`/customer-pos/${newPo.id}`);
        },
      }
    );
  }

  const totalAmount = quotation?.items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0) ?? 0;

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!quotation) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">لم يتم العثور على عرض السعر.</p>
        <Button variant="link" onClick={() => setLocation("/quotations")}>العودة إلى عروض الأسعار</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrintHeader title="عرض سعر" subtitle={quotation.quotationNumber ?? `#${quotation.id}`} />
      <div className="flex items-center gap-3 print:hidden">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/quotations")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {quotation.quotationNumber ?? `عرض سعر #${quotation.id}`}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2">
            <span>{quotation.customerName ?? `عميل #${quotation.customerId}`}</span>
            <span>•</span>
            <span>{new Date(quotation.createdAt).toLocaleDateString("ar-EG")}</span>
            {quotation.inquiryId && (
              <>
                <span>•</span>
                <button
                  className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                  onClick={() => setLocation(`/inquiries/${quotation.inquiryId}`)}
                >
                  <FileQuestion className="h-3.5 w-3.5" />
                  استفسار #{quotation.inquiryId}
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[quotation.status] ?? ""}`}>
            {quotation.status === "draft" ? "مسودة" : quotation.status === "sent" ? "مرسل" : quotation.status === "approved" ? "معتمد" : quotation.status === "rejected" ? "مرفوض" : quotation.status}
          </span>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" />
            طباعة
          </Button>
          {(quotation.status === "draft" || quotation.status === "sent") && (
            <>
              <Button variant="outline" size="sm" onClick={handleReject} disabled={rejectMutation.isPending} data-testid="button-reject-quotation">
                <XCircle className="h-4 w-4 mr-1.5" />
                رفض
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending} data-testid="button-approve-quotation">
                <CheckCircle className="h-4 w-4 mr-1.5" />
                اعتماد
              </Button>
            </>
          )}
          {quotation.status === "approved" && (
            <Button size="sm" onClick={handleCreateCustomerPo} disabled={createCustomerPo.isPending} data-testid="button-create-customer-po">
              إنشاء أمر شراء
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">البنود والتسعير</CardTitle>
            {totalAmount > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                الإجمالي: <span className="font-semibold text-foreground">{totalAmount.toLocaleString()} ج.م</span>
              </p>
            )}
          </div>
          <Button size="sm" onClick={openAddItem} data-testid="button-add-quotation-item">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            إضافة بند
          </Button>
        </CardHeader>
        <CardContent>
          {quotation.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              لا توجد بنود بعد. أضف بنوداً بأسعار من مورديك.
            </p>
          ) : (
            <div className="divide-y">
              {quotation.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3" data-testid={`row-quotation-item-${item.id}`}>
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.quantity} {item.unit ?? "وحدة"} × {Number(item.unitPrice).toLocaleString()} ج.م
                      {item.supplierName && ` • المورد: ${item.supplierName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{(item.totalPrice ?? 0).toLocaleString()} ج.م</span>
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

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "تعديل البند" : "إضافة بند"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الوصف *</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="مثال: مضخة مياه 10HP..."
                data-testid="input-item-description"
              />
            </div>

            {/* Price history suggestions */}
            {descriptionForHistory.length >= 3 && (
              <div className="space-y-2">
                <PriceHistoryWarning description={descriptionForHistory} />
                <PriceHistoryList description={descriptionForHistory} />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>الكمية *</Label>
                <Input
                  type="number"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>سعر الوحدة *</Label>
                <Input
                  type="number"
                  value={itemForm.unitPrice}
                  onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>الوحدة</Label>
                <Input
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  placeholder="قطعة، كجم..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>المورد</Label>
              <Select
                value={itemForm.supplierId}
                onValueChange={(v) => setItemForm({ ...itemForm, supplierId: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المورد..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون مورد</SelectItem>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea
                rows={2}
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleItemSubmit} disabled={addItem.isPending || updateItem.isPending}>
              {editingItemId ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteItemId != null} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف البند؟</AlertDialogTitle>
            <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
