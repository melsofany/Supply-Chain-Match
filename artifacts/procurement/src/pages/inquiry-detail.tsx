import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, FileText, Send, CheckCircle, Clock, XCircle, Table2, Star, Mail, Eye, Link2, Copy, Download } from "lucide-react";
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
  useRfqComparison,
  useCreateSupplierRfq,
  useUpdateSupplierRfq,
  useDeleteSupplierRfq,
  useUpsertRfqItems,
  useCreateQuotationFromRfqs,
  type SupplierRfq,
  type RfqComparisonItem,
} from "@/hooks/use-supplier-rfqs";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  quoted: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

const RFQ_STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: "bg-gray-100 text-gray-600", label: "معلق", icon: <Clock className="h-3.5 w-3.5" /> },
  sent: { color: "bg-blue-100 text-blue-700", label: "أُرسل", icon: <Send className="h-3.5 w-3.5" /> },
  received: { color: "bg-green-100 text-green-700", label: "استُلم الرد", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled: { color: "bg-red-100 text-red-700", label: "ملغي", icon: <XCircle className="h-3.5 w-3.5" /> },
};

function RfqCard({
  rfq,
  onEdit,
  onDelete,
  onEnterPrices,
  onSendEmail,
  onGenerateLink,
  isSendingEmail,
}: {
  rfq: SupplierRfq;
  onEdit: (rfq: SupplierRfq) => void;
  onDelete: (id: number) => void;
  onEnterPrices: (rfq: SupplierRfq) => void;
  onSendEmail: (rfq: SupplierRfq) => void;
  onGenerateLink: (rfq: SupplierRfq) => void;
  isSendingEmail: boolean;
}) {
  const cfg = RFQ_STATUS_CONFIG[rfq.status] ?? RFQ_STATUS_CONFIG.pending;
  const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

  async function downloadPdf() {
    const resp = await fetch(`${API_BASE}/api/supplier-rfqs/${rfq.id}/pdf`);
    if (!resp.ok) { alert("فشل توليد PDF"); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RFQ-${rfq.rfqNumber ?? rfq.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const emailBadge = rfq.emailStatus === "sent"
    ? <span className="text-[10px] text-green-600 flex items-center gap-0.5"><Mail className="h-3 w-3" />أُرسل بالإيميل</span>
    : rfq.emailStatus === "failed"
    ? <span className="text-[10px] text-red-500 flex items-center gap-0.5"><Mail className="h-3 w-3" />فشل الإرسال</span>
    : null;

  const linkBadge = rfq.token
    ? rfq.linkOpened
      ? <span className="text-[10px] text-blue-600 flex items-center gap-0.5"><Eye className="h-3 w-3" />فُتح {rfq.openCount > 1 ? `(${rfq.openCount})` : ""}</span>
      : <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Eye className="h-3 w-3" />لم يُفتح</span>
    : null;

  const offerBadge = rfq.offerSubmitted
    ? <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><CheckCircle className="h-3 w-3" />عرض مُرسَل</span>
    : null;

  return (
    <div className="py-3 border-b last:border-b-0" data-testid={`row-rfq-${rfq.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{rfq.supplierName ?? `مورد #${rfq.supplierId}`}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rfq.rfqNumber && <span>{rfq.rfqNumber} • </span>}
              {rfq.quotedPrice != null
                ? <span className="font-semibold text-green-700">سعر إجمالي: {Number(rfq.quotedPrice).toLocaleString()} ج.م</span>
                : <span className="text-muted-foreground">لم يُحدد سعر إجمالي</span>
              }
              {rfq.closeDate && <span className="mr-2 text-amber-600">• آخر موعد: {rfq.closeDate}</span>}
            </p>
            {/* Tracking badges */}
            {(emailBadge || linkBadge || offerBadge) && (
              <div className="flex items-center gap-2 mt-1">
                {emailBadge}
                {linkBadge}
                {offerBadge}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {rfq.status !== "cancelled" && (
            <>
              {rfq.supplierEmail && rfq.emailStatus !== "sent" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onSendEmail(rfq)}
                  disabled={isSendingEmail}
                  title="إرسال رابط التسعير بالإيميل"
                >
                  <Mail className="h-3 w-3" />
                  إيميل
                </Button>
              )}
              {rfq.emailStatus === "sent" && rfq.token && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => {
                    const base = window.location.origin + (import.meta.env.BASE_URL || "").replace(/\/$/, "");
                    const url = `${base}/portal/${rfq.token}`;
                    navigator.clipboard.writeText(url);
                  }}
                  title="نسخ رابط البوابة"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              )}
              {!rfq.token && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => onGenerateLink(rfq)}
                  title="توليد رابط بوابة المورد"
                >
                  <Link2 className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
          {(rfq.status === "sent" || rfq.status === "received") && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onEnterPrices(rfq)}
            >
              أسعار البنود
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-blue-600"
            title="تحميل PDF"
            onClick={downloadPdf}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(rfq)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(rfq.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
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
  const { data: suppliers } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const updateInquiry = useUpdateInquiry();
  const addItem = useAddInquiryItem();
  const updateItem = useUpdateInquiryItem();
  const deleteItem = useDeleteInquiryItem();
  const createQuotation = useCreateQuotation();

  // RFQ state
  const { data: rfqs, isLoading: isLoadingRfqs, refetch: refetchRfqs } = useSupplierRfqsByInquiry(numId);
  const { data: comparison, refetch: refetchComparison } = useRfqComparison(numId);
  const { create: createRfq, isCreating: isCreatingRfq } = useCreateSupplierRfq(() => {
    refetchRfqs();
    refetchComparison();
  });

  // Inquiry item dialog
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ description: "", quantity: "", unit: "", notes: "" });
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // RFQ dialog
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const [editingRfq, setEditingRfq] = useState<SupplierRfq | null>(null);
  const [rfqForm, setRfqForm] = useState({ supplierId: "", rfqNumber: "", quotedPrice: "", status: "pending", notes: "" });
  const [rfqDeleteId, setRfqDeleteId] = useState<number | null>(null);

  // Per-item price dialog
  const [priceDialogRfq, setPriceDialogRfq] = useState<SupplierRfq | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<number, string>>({}); // inquiryItemId -> price string

  // Quotation-from-RFQ dialog
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState<Record<number, { rfqId: number; supplierId: number | null; unitPrice: number } | null>>({}); // inquiryItemId -> selection

  // Email send dialog
  const [sendEmailDialogRfq, setSendEmailDialogRfq] = useState<SupplierRfq | null>(null);
  const [emailCloseDate, setEmailCloseDate] = useState("");
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  const { isUpdating: isUpdatingRfq, update: updateRfqFn } = useUpdateSupplierRfq(
    editingRfq?.id ?? 0,
    () => { refetchRfqs(); refetchComparison(); }
  );
  const { remove: deleteRfqFn, isDeleting } = useDeleteSupplierRfq(() => {
    refetchRfqs();
    refetchComparison();
  });

  const { save: saveItemPrices, isSaving: isSavingPrices } = useUpsertRfqItems(
    priceDialogRfq?.id ?? 0,
    () => { refetchComparison(); }
  );

  const { create: createQuotationFromRfqs, isCreating: isCreatingFromRfqs } = useCreateQuotationFromRfqs(numId);

  function handleStatusChange(value: string) {
    updateInquiry.mutate(
      { id: numId, data: { status: value as any } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) }); qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() }); toast({ title: "تم تحديث الحالة" }); } }
    );
  }

  // ── Inquiry items ──────────────────────────────────────────────────────────
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

  // ── Create quotation (empty) from inquiry ─────────────────────────────────
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
          toast({ title: "تم إنشاء عرض السعر" });
          setLocation(`/quotations/${newQ.id}`);
        },
      }
    );
  }

  // ── Email sending ──────────────────────────────────────────────────────────
  function openSendEmail(rfq: SupplierRfq) {
    setSendEmailDialogRfq(rfq);
    setEmailCloseDate("");
  }

  async function handleSendEmail() {
    if (!sendEmailDialogRfq) return;
    setSendingEmailId(sendEmailDialogRfq.id);
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const r = await fetch(`${BASE}/api/supplier-rfqs/${sendEmailDialogRfq.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ closeDate: emailCloseDate || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.reason || j.error || `خطأ ${r.status}`);
      toast({ title: `تم إرسال الإيميل لـ ${j.supplierName}` });
      setSendEmailDialogRfq(null);
      refetchRfqs();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSendingEmailId(null);
    }
  }

  async function handleGenerateLink(rfq: SupplierRfq) {
    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const r = await fetch(`${BASE}/api/supplier-rfqs/${rfq.id}/generate-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل توليد الرابط");
      await navigator.clipboard.writeText(j.portalUrl);
      toast({ title: "تم توليد الرابط ونسخه في الحافظة" });
      refetchRfqs();
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  }

  // ── RFQ management ────────────────────────────────────────────────────────
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
      updateRfqFn(
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
    deleteRfqFn(rfqDeleteId);
    setRfqDeleteId(null);
    toast({ title: "تم حذف طلب التسعير" });
  }

  // ── Per-item price entry ──────────────────────────────────────────────────
  function openEnterPrices(rfq: SupplierRfq) {
    setPriceDialogRfq(rfq);
    if (!comparison) { setItemPrices({}); return; }
    const existingPrices: Record<number, string> = {};
    for (const p of comparison.prices) {
      if (p.rfqId === rfq.id && p.quotedPrice != null) {
        existingPrices[p.inquiryItemId] = String(p.quotedPrice);
      }
    }
    setItemPrices(existingPrices);
  }

  async function handleSaveItemPrices() {
    if (!priceDialogRfq || !comparison) return;
    const items = comparison.items.map((item) => ({
      inquiryItemId: item.id,
      quotedPrice: itemPrices[item.id] ? Number(itemPrices[item.id]) : null,
    }));
    await saveItemPrices(items);
    toast({ title: "تم حفظ أسعار البنود" });
    setPriceDialogRfq(null);
  }

  // ── Create quotation from RFQ selected prices ────────────────────────────
  function openQuotationFromRfqs() {
    if (!comparison) return;
    const initial: Record<number, { rfqId: number; supplierId: number | null; unitPrice: number } | null> = {};
    for (const item of comparison.items) {
      const prices = comparison.prices.filter((p) => p.rfqId !== null && p.inquiryItemId === item.id && p.quotedPrice != null);
      if (prices.length > 0) {
        const lowest = prices.reduce((a, b) => (a.quotedPrice! < b.quotedPrice! ? a : b));
        const rfq = comparison.rfqs.find((r) => r.id === lowest.rfqId);
        initial[item.id] = { rfqId: lowest.rfqId, supplierId: rfq?.supplierId ?? null, unitPrice: lowest.quotedPrice! };
      } else {
        initial[item.id] = null;
      }
    }
    setSelectedPrices(initial);
    setQuotationDialogOpen(true);
  }

  async function handleCreateQuotationFromRfqs() {
    const selections = Object.entries(selectedPrices)
      .filter(([, v]) => v != null)
      .map(([itemId, v]) => ({
        inquiryItemId: Number(itemId),
        supplierId: v!.supplierId,
        unitPrice: v!.unitPrice,
        rfqId: v!.rfqId,
      }));

    if (selections.length === 0) {
      toast({ title: "اختر سعراً لبند واحد على الأقل", variant: "destructive" });
      return;
    }

    try {
      const newQ = await createQuotationFromRfqs(selections);
      qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
      updateInquiry.mutate(
        { id: numId, data: { status: "quoted" as any } },
        { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) }); qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() }); } }
      );
      toast({ title: "تم إنشاء عرض السعر بأسعار الموردين المختارة" });
      setQuotationDialogOpen(false);
      setLocation(`/quotations/${newQ.id}`);
    } catch (e: any) {
      toast({ title: e?.message ?? "فشل إنشاء عرض السعر", variant: "destructive" });
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const hasPricesInComparison = comparison && comparison.prices.some((p) => p.quotedPrice != null);
  const receivedRfqs = rfqs.filter((r) => r.status === "received");

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

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/inquiries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{inquiry.title}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {inquiry.customerName ?? `عميل #${inquiry.customerId}`} •{" "}
            {new Date(inquiry.createdAt).toLocaleDateString("ar-EG")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Select value={inquiry.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40" data-testid="select-inquiry-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">جديد</SelectItem>
              <SelectItem value="in_progress">قيد المعالجة</SelectItem>
              <SelectItem value="quoted">تم تقديم العرض</SelectItem>
              <SelectItem value="closed">مغلق</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleCreateQuotation} disabled={createQuotation.isPending} data-testid="button-create-quotation-from-inquiry">
            <FileText className="h-4 w-4 mr-2" />
            عرض سعر فارغ
          </Button>
        </div>
      </div>

      {inquiry.description && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">{inquiry.description}</CardContent>
        </Card>
      )}

      {/* ── Inquiry items ──────────────────────────────────────────────────── */}
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

      {/* ── Supplier RFQs ──────────────────────────────────────────────────── */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              طلبات تسعير الموردين
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              أرسل طلبات للموردين وأدخل أسعارهم لكل بند ثم قارن واختر الأنسب
              {rfqs.length > 0 && <span className="ml-1">({rfqs.length} طلب)</span>}
            </p>
          </div>
          <Button size="sm" onClick={openAddRfq} data-testid="button-add-rfq">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            طلب تسعير جديد
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingRfqs ? (
            <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
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
                  onEnterPrices={openEnterPrices}
                  onSendEmail={openSendEmail}
                  onGenerateLink={handleGenerateLink}
                  isSendingEmail={sendingEmailId === rfq.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Price comparison table ─────────────────────────────────────────── */}
      {comparison && comparison.rfqs.length > 0 && comparison.items.length > 0 && (
        <Card className="border-green-100">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Table2 className="h-4 w-4 text-green-600" />
                مقارنة أسعار الموردين
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                مقارنة أسعار البنود من كل المورّدين — أدخل أسعار البنود باستخدام زر "أسعار البنود" في كل طلب
              </p>
            </div>
            {hasPricesInComparison && (
              <Button
                size="sm"
                onClick={openQuotationFromRfqs}
                className="bg-green-600 hover:bg-green-700"
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                إنشاء عرض سعر من الأسعار
              </Button>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-2 pr-3 font-medium text-muted-foreground min-w-[160px]">البند</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground text-xs">الكمية</th>
                  {comparison.rfqs.map((rfq) => (
                    <th key={rfq.id} className="text-center py-2 px-3 font-medium min-w-[110px]">
                      <p className="text-xs truncate max-w-[100px]">{rfq.supplierName ?? `مورد #${rfq.supplierId}`}</p>
                      <p className={`text-[10px] font-normal mt-0.5 ${
                        rfq.status === "received" ? "text-green-600" :
                        rfq.status === "sent" ? "text-blue-600" : "text-muted-foreground"
                      }`}>
                        {rfq.status === "received" ? "✓ استُلم الرد" : rfq.status === "sent" ? "أُرسل" : "معلق"}
                      </p>
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 font-medium text-green-700 text-xs min-w-[80px]">الأقل سعراً</th>
                </tr>
              </thead>
              <tbody>
                {comparison.items.map((item) => {
                  const itemPricesList = comparison.rfqs.map((rfq) => {
                    const p = comparison.prices.find(
                      (px) => px.rfqId === rfq.id && px.inquiryItemId === item.id
                    );
                    return p?.quotedPrice ?? null;
                  });
                  const validPrices = itemPricesList.filter((p): p is number => p != null);
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

                  return (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{item.description}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground text-xs whitespace-nowrap">
                        {item.quantity} {item.unit ?? ""}
                      </td>
                      {comparison.rfqs.map((rfq, i) => {
                        const price = itemPricesList[i];
                        const isLowest = price != null && price === minPrice && validPrices.length > 1;
                        return (
                          <td key={rfq.id} className="py-3 px-3 text-center">
                            {price != null ? (
                              <span className={`font-semibold ${isLowest ? "text-green-700" : ""}`}>
                                {isLowest && <Star className="h-3 w-3 inline mr-0.5 fill-green-600 text-green-600" />}
                                {price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-3 text-center">
                        {minPrice != null ? (
                          <span className="text-green-700 font-bold text-xs">
                            {minPrice.toLocaleString()} ج.م
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════════════ */}

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
              <Label>ملاحظات / المواصفات</Label>
              <Textarea rows={2} value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} placeholder="المواصفات التفصيلية للبند..." />
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
            <DialogTitle>{editingRfq ? "تعديل طلب التسعير" : "طلب تسعير من مورد"}</DialogTitle>
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
                <Input value={rfqForm.rfqNumber} onChange={(e) => setRfqForm({ ...rfqForm, rfqNumber: e.target.value })} placeholder="RFQ-001" />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select value={rfqForm.status} onValueChange={(v) => setRfqForm({ ...rfqForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>السعر الإجمالي المعروض (اختياري)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rfqForm.quotedPrice}
                  onChange={(e) => setRfqForm({ ...rfqForm, quotedPrice: e.target.value })}
                  placeholder="يُملأ عند استلام رد المورد"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">ج.م</span>
              </div>
              <p className="text-xs text-muted-foreground">للتسعير بالبند استخدم زر "أسعار البنود" بعد استلام الرد</p>
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

      {/* إدخال أسعار البنود من مورد */}
      <Dialog open={!!priceDialogRfq} onOpenChange={(o) => !o && setPriceDialogRfq(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              أسعار البنود — {priceDialogRfq?.supplierName ?? `مورد #${priceDialogRfq?.supplierId}`}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              أدخل سعر الوحدة الذي عرضه هذا المورد لكل بند. اترك الحقل فارغاً إذا لم يُقدم سعراً للبند.
            </p>
            {comparison && comparison.items.length > 0 ? (
              <div className="space-y-3">
                {comparison.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} {item.unit ?? "وحدة"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-28"
                        placeholder="السعر"
                        value={itemPrices[item.id] ?? ""}
                        onChange={(e) => setItemPrices((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                      <span className="text-xs text-muted-foreground w-8">ج.م</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                أضف بنوداً للاستفسار أولاً لتتمكن من إدخال أسعارها.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogRfq(null)}>إلغاء</Button>
            <Button onClick={handleSaveItemPrices} disabled={isSavingPrices}>
              حفظ الأسعار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إنشاء عرض سعر من أسعار الموردين */}
      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              إنشاء عرض سعر من أسعار الموردين
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              اختر لكل بند المورد الذي ستعتمد سعره في عرض السعر للعميل. النجمة ⭐ تشير لأقل سعر.
            </p>
            {comparison && (
              <div className="space-y-4">
                {comparison.items.map((item) => {
                  const itemPriceOptions = comparison.prices
                    .filter((p) => p.inquiryItemId === item.id && p.quotedPrice != null)
                    .map((p) => {
                      const rfq = comparison.rfqs.find((r) => r.id === p.rfqId);
                      return { rfqId: p.rfqId, supplierId: rfq?.supplierId ?? null, supplierName: rfq?.supplierName ?? null, unitPrice: p.quotedPrice! };
                    });

                  if (itemPriceOptions.length === 0) return null;

                  const minPrice = Math.min(...itemPriceOptions.map((o) => o.unitPrice));
                  const selected = selectedPrices[item.id];
                  const totalPrice = selected ? item.quantity * selected.unitPrice : null;

                  return (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{item.description}</p>
                          <p className="text-xs text-muted-foreground">الكمية: {item.quantity} {item.unit ?? ""}</p>
                        </div>
                        {totalPrice != null && (
                          <span className="text-sm font-bold text-green-700">
                            الإجمالي: {totalPrice.toLocaleString()} ج.م
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {itemPriceOptions.map((opt) => {
                          const isSelected = selected?.rfqId === opt.rfqId;
                          const isLowest = opt.unitPrice === minPrice && itemPriceOptions.length > 1;
                          return (
                            <button
                              key={opt.rfqId}
                              onClick={() => setSelectedPrices((prev) => ({
                                ...prev,
                                [item.id]: isSelected ? null : { rfqId: opt.rfqId, supplierId: opt.supplierId, unitPrice: opt.unitPrice },
                              }))}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                isSelected
                                  ? "bg-green-600 text-white border-green-600"
                                  : "border-gray-200 hover:border-green-400 hover:bg-green-50"
                              }`}
                            >
                              {isLowest && <Star className={`h-3 w-3 ${isSelected ? "fill-white text-white" : "fill-green-500 text-green-500"}`} />}
                              <span>{opt.supplierName ?? `مورد #${opt.supplierId}`}</span>
                              <span className="font-semibold">{opt.unitPrice.toLocaleString()} ج.م</span>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setSelectedPrices((prev) => ({ ...prev, [item.id]: null }))}
                          className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                            !selected ? "bg-gray-100 border-gray-300 text-gray-600" : "border-gray-200 text-muted-foreground hover:bg-gray-50"
                          }`}
                        >
                          تجاهل هذا البند
                        </button>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}

            {/* Totals summary */}
            {comparison && (
              <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-green-800">
                    البنود المختارة: {Object.values(selectedPrices).filter((v) => v != null).length} من {comparison.items.filter((item) => comparison.prices.some((p) => p.inquiryItemId === item.id && p.quotedPrice != null)).length}
                  </span>
                  <span className="text-sm font-bold text-green-800">
                    الإجمالي: {Object.entries(selectedPrices).reduce((sum, [itemId, sel]) => {
                      if (!sel) return sum;
                      const item = comparison.items.find((i) => i.id === Number(itemId));
                      return sum + (item ? item.quantity * sel.unitPrice : 0);
                    }, 0).toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuotationDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreateQuotationFromRfqs} disabled={isCreatingFromRfqs} className="bg-green-600 hover:bg-green-700">
              <FileText className="h-4 w-4 mr-1.5" />
              إنشاء عرض السعر
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

      {/* إرسال بالإيميل */}
      <Dialog open={sendEmailDialogRfq != null} onOpenChange={(o) => !o && setSendEmailDialogRfq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              إرسال طلب التسعير بالإيميل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-blue-800">{sendEmailDialogRfq?.supplierName}</p>
              <p className="text-blue-600 mt-0.5">{sendEmailDialogRfq?.supplierEmail}</p>
            </div>
            <div className="space-y-1.5">
              <Label>آخر موعد لتقديم العرض (اختياري)</Label>
              <Input
                type="date"
                value={emailCloseDate}
                onChange={(e) => setEmailCloseDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground">سيظهر هذا التاريخ في الإيميل وفي بوابة المورد.</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <strong>تنبيه:</strong> يتطلب الإرسال ضبط متغيرات SMTP_USER و SMTP_PASS في إعدادات البيئة.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEmailDialogRfq(null)}>إلغاء</Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmailId != null}
              className="gap-1.5"
            >
              <Mail className="h-4 w-4" />
              {sendingEmailId != null ? "جارٍ الإرسال..." : "إرسال الإيميل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
