import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, Plus, Pencil, Trash2, FileText, Send, CheckCircle,
  Clock, XCircle, Table2, Star, Mail, Eye, Link2, Copy, Download, User, Hash, Tag, MessageCircle,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  useSendBulk,
  type SupplierRfq,
  type BulkSendResult,
} from "@/hooks/use-supplier-rfqs";
import { INQUIRY_STATUS_COLORS, INQUIRY_STATUS_LABELS } from "@/lib/status";

const RFQ_STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending:  { color: "bg-gray-100 text-gray-600",   label: "معلق",        icon: <Clock       className="h-3.5 w-3.5" /> },
  sent:     { color: "bg-blue-100 text-blue-700",   label: "أُرسل",       icon: <Send        className="h-3.5 w-3.5" /> },
  received: { color: "bg-green-100 text-green-700", label: "استُلم الرد", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled:{ color: "bg-red-100 text-red-700",     label: "ملغي",        icon: <XCircle     className="h-3.5 w-3.5" /> },
};

/* ─────────────────────── RFQ card ─────────────────────── */
function RfqCard({
  rfq, onEdit, onDelete, onEnterPrices, onSendEmail, onGenerateLink, isSendingEmail,
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
      ? <span className="text-[10px] text-blue-600 flex items-center gap-0.5"><Eye className="h-3 w-3" />فُتح{rfq.openCount > 1 ? ` (${rfq.openCount})` : ""}</span>
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
            {(emailBadge || linkBadge || offerBadge) && (
              <div className="flex items-center gap-2 mt-1">
                {emailBadge}{linkBadge}{offerBadge}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {rfq.status !== "cancelled" && (
            <>
              {rfq.supplierEmail && rfq.emailStatus !== "sent" && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                  onClick={() => onSendEmail(rfq)} disabled={isSendingEmail} title="إرسال بالإيميل">
                  <Mail className="h-3 w-3" />إيميل
                </Button>
              )}
              {rfq.emailStatus === "sent" && rfq.token && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => {
                    const base = window.location.origin + (import.meta.env.BASE_URL || "").replace(/\/$/, "");
                    navigator.clipboard.writeText(`${base}/portal/${rfq.token}`);
                  }} title="نسخ رابط البوابة">
                  <Copy className="h-3 w-3" />
                </Button>
              )}
              {!rfq.token && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => onGenerateLink(rfq)} title="توليد رابط بوابة المورد">
                  <Link2 className="h-3 w-3" />
                </Button>
              )}
            </>
          )}
          {(rfq.status === "sent" || rfq.status === "received") && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEnterPrices(rfq)}>
              أسعار البنود
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-blue-600"
            title="تحميل PDF" onClick={downloadPdf}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(rfq)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(rfq.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
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
  const updateInquiry  = useUpdateInquiry();
  const addItem        = useAddInquiryItem();
  const updateItem     = useUpdateInquiryItem();
  const deleteItem     = useDeleteInquiryItem();
  const createQuotation = useCreateQuotation();

  /* ── RFQ hooks ── */
  const { data: rfqs, isLoading: isLoadingRfqs, refetch: refetchRfqs } = useSupplierRfqsByInquiry(numId);
  const { data: comparison, refetch: refetchComparison } = useRfqComparison(numId);
  const { create: createRfq, isCreating: isCreatingRfq } = useCreateSupplierRfq(() => {
    refetchRfqs(); refetchComparison();
  });

  /* ── Edit header dialog ── */
  const [editHeaderOpen, setEditHeaderOpen] = useState(false);
  const [headerForm, setHeaderForm] = useState({ inquiryNumber: "", buyerName: "", replyDeadline: "", title: "", description: "" });

  /* ── Item dialog ── */
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({
    description: "", partNo: "", customerInternalCode: "", quantity: "", unit: "", notes: "",
  });
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  /* ── RFQ dialog ── */
  const [rfqDialogOpen, setRfqDialogOpen] = useState(false);
  const [editingRfq, setEditingRfq] = useState<SupplierRfq | null>(null);
  const [rfqForm, setRfqForm] = useState({ supplierId: "", rfqNumber: "", quotedPrice: "", status: "pending", notes: "" });
  const [rfqDeleteId, setRfqDeleteId] = useState<number | null>(null);

  /* ── Per-item price dialog ── */
  const [priceDialogRfq, setPriceDialogRfq] = useState<SupplierRfq | null>(null);
  const [itemPrices, setItemPrices] = useState<Record<number, string>>({});

  /* ── Quotation builder dialog ── */
  const [quotationDialogOpen, setQuotationDialogOpen] = useState(false);
  const [selectedPrices, setSelectedPrices] = useState<Record<number, { rfqId: number; supplierId: number | null; unitPrice: number; sellingPrice: number } | null>>({});

  /* ── Email dialog ── */
  const [sendEmailDialogRfq, setSendEmailDialogRfq] = useState<SupplierRfq | null>(null);
  const [emailCloseDate, setEmailCloseDate] = useState("");
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);

  /* ── Batch send ── */
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<number>>(new Set());
  const [batchCloseDate, setBatchCloseDate] = useState("");
  const [batchCategoryFilter, setBatchCategoryFilter] = useState("all");
  const [bulkResults, setBulkResults] = useState<BulkSendResult[] | null>(null);

  /* ── Item selection for RFQ ── */
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (inquiry?.items && inquiry.items.length > 0) {
      setSelectedItemIds(new Set(inquiry.items.map((i) => i.id)));
    }
  }, [inquiry?.id]);

  const { isUpdating: isUpdatingRfq, update: updateRfqFn } = useUpdateSupplierRfq(
    editingRfq?.id ?? 0,
    () => { refetchRfqs(); refetchComparison(); }
  );
  const { remove: deleteRfqFn } = useDeleteSupplierRfq(() => {
    refetchRfqs(); refetchComparison();
  });
  const { save: saveItemPrices, isSaving: isSavingPrices } = useUpsertRfqItems(
    priceDialogRfq?.id ?? 0,
    () => { refetchComparison(); }
  );
  const { create: createQuotationFromRfqs, isCreating: isCreatingFromRfqs } = useCreateQuotationFromRfqs(numId);
  const { send: sendBulk, isSending: isSendingBulk } = useSendBulk(numId, () => { refetchRfqs(); refetchComparison(); });

  /* ── Header handlers ── */
  function openEditHeader() {
    if (!inquiry) return;
    setHeaderForm({
      inquiryNumber: inquiry.inquiryNumber ?? "",
      buyerName: inquiry.buyerName ?? "",
      replyDeadline: inquiry.replyDeadline ?? "",
      title: inquiry.title,
      description: inquiry.description ?? "",
    });
    setEditHeaderOpen(true);
  }

  function handleSaveHeader() {
    updateInquiry.mutate(
      { id: numId, data: { ...headerForm } as any },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
          setEditHeaderOpen(false);
          toast({ title: "تم تحديث بيانات الطلب" });
        },
      }
    );
  }

  function handleStatusChange(value: string) {
    updateInquiry.mutate(
      { id: numId, data: { status: value as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
          toast({ title: "تم تحديث الحالة" });
        },
      }
    );
  }

  /* ── Item handlers ── */
  function openAddItem() {
    setEditingItemId(null);
    setItemForm({ description: "", partNo: "", customerInternalCode: "", quantity: "", unit: "", notes: "" });
    setItemDialogOpen(true);
  }

  function openEditItem(item: NonNullable<typeof inquiry>["items"][number]) {
    setEditingItemId(item.id);
    setItemForm({
      description: item.description,
      partNo: (item as any).partNo ?? "",
      customerInternalCode: (item as any).customerInternalCode ?? "",
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
    const data: any = {
      description: itemForm.description,
      quantity: Number(itemForm.quantity),
      ...(itemForm.partNo && { partNo: itemForm.partNo }),
      ...(itemForm.customerInternalCode && { customerInternalCode: itemForm.customerInternalCode }),
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
        {
          onSuccess: (newItem: any) => {
            qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
            setItemDialogOpen(false);
            toast({ title: "تمت إضافة البند" });
            if (newItem?.id) {
              setSelectedItemIds((prev) => new Set([...prev, newItem.id]));
            }
          },
        }
      );
    }
  }

  function handleDeleteItem() {
    if (deleteItemId == null) return;
    const idToDelete = deleteItemId;
    deleteItem.mutate(
      { id: numId, itemId: idToDelete },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
          setDeleteItemId(null);
          toast({ title: "تم حذف البند" });
          setSelectedItemIds((prev) => { const next = new Set(prev); next.delete(idToDelete); return next; });
        },
      }
    );
  }

  /* ── Create quotation (empty) ── */
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

  /* ── Email ── */
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
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
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
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
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

  async function handleBulkSend() {
    if (selectedSupplierIds.size === 0) return;
    if (selectedItemIds.size === 0) {
      toast({ title: "يجب تحديد بند واحد على الأقل لإرساله", variant: "destructive" });
      return;
    }
    setBulkResults(null);
    const allItemIds = (inquiry?.items ?? []).map((i) => i.id);
    const sendItemIds = selectedItemIds.size === allItemIds.length ? undefined : [...selectedItemIds];
    try {
      const results = await sendBulk([...selectedSupplierIds], batchCloseDate || undefined, sendItemIds);
      setBulkResults(results);
      setSelectedSupplierIds(new Set());
      setBatchCloseDate("");
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  }

  /* ── RFQ management ── */
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
    if (!rfqForm.supplierId) { toast({ title: "المورد مطلوب", variant: "destructive" }); return; }
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
      toast({ title: "تم إنشاء طلب التسعير للمورد" });
    }
  }

  function handleDeleteRfq() {
    if (rfqDeleteId == null) return;
    deleteRfqFn(rfqDeleteId);
    setRfqDeleteId(null);
    toast({ title: "تم حذف طلب التسعير" });
  }

  /* ── Per-item price entry ── */
  function openEnterPrices(rfq: SupplierRfq) {
    setPriceDialogRfq(rfq);
    if (!comparison) { setItemPrices({}); return; }
    const existing: Record<number, string> = {};
    for (const p of comparison.prices) {
      if (p.rfqId === rfq.id && p.quotedPrice != null) existing[p.inquiryItemId] = String(p.quotedPrice);
    }
    setItemPrices(existing);
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

  /* ── Create quotation from RFQ prices ── */
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
        sellingPrice: v!.sellingPrice,
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

  /* ── Batch send derived ── */
  const supplierCategories = [...new Set((suppliers ?? []).map((s) => s.category).filter((c): c is string => !!c))];
  const filteredSuppliers = (suppliers ?? []).filter((s) =>
    batchCategoryFilter === "all" || s.category === batchCategoryFilter
  );

  /* ── Derived ── */
  const hasPricesInComparison = comparison && comparison.prices.some((p) => p.quotedPrice != null);

  /* ─── Loading / not found ─── */
  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }
  if (!inquiry) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">الطلب غير موجود.</p>
        <Button variant="link" onClick={() => setLocation("/inquiries")}>العودة لطلبات التسعير</Button>
      </div>
    );
  }

  const isDeadlinePassed = inquiry.replyDeadline && new Date(inquiry.replyDeadline).getTime() < Date.now();
  const isDeadlineUrgent = inquiry.replyDeadline && !isDeadlinePassed &&
    (new Date(inquiry.replyDeadline).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000;

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/inquiries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{inquiry.title}</h1>
            {inquiry.inquiryNumber && (
              <Badge variant="outline" className="font-mono text-xs">#{inquiry.inquiryNumber}</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 flex-wrap text-sm text-muted-foreground">
            <span>{inquiry.customerName ?? `عميل #${inquiry.customerId}`}</span>
            {inquiry.buyerName && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {inquiry.buyerName}
              </span>
            )}
            <span>{new Date(inquiry.createdAt).toLocaleDateString("ar-EG")}</span>
            {inquiry.replyDeadline && (
              <span className={`flex items-center gap-1 font-medium ${isDeadlinePassed ? "text-red-600" : isDeadlineUrgent ? "text-amber-600" : "text-muted-foreground"}`}>
                <Clock className="h-3.5 w-3.5" />
                آخر رد: {new Date(inquiry.replyDeadline).toLocaleDateString("ar-EG")}
                {isDeadlinePassed && " ⚠ تجاوز الموعد"}
                {isDeadlineUrgent && " — قريب"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="ghost" size="sm" onClick={openEditHeader}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            تعديل البيانات
          </Button>
          <Select value={inquiry.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40" data-testid="select-inquiry-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">جديد</SelectItem>
              <SelectItem value="in_progress">قيد المعالجة</SelectItem>
              <SelectItem value="quoted">تم التسعير</SelectItem>
              <SelectItem value="closed">مغلق</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleCreateQuotation} disabled={createQuotation.isPending}
            data-testid="button-create-quotation-from-inquiry">
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

      {/* ── STEP 1: بنود الطلب ── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">1</span>
              بنود طلب التسعير
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">أضف البنود المطلوبة مع رقم القطعة والكود الداخلي للعميل</p>
          </div>
          <Button size="sm" onClick={openAddItem} data-testid="button-add-item">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            إضافة بند
          </Button>
        </CardHeader>
        <CardContent>
          {inquiry.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">لا توجد بنود بعد.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={openAddItem}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                إضافة أول بند
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="py-2 pr-2 w-8">
                      <Checkbox
                        checked={inquiry.items.length > 0 && inquiry.items.every((i) => selectedItemIds.has(i.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItemIds(new Set(inquiry.items.map((i) => i.id)));
                          } else {
                            setSelectedItemIds(new Set());
                          }
                        }}
                        aria-label="تحديد الكل"
                      />
                    </th>
                    <th className="text-right py-2 pr-2 font-medium w-6">#</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[180px]">الوصف</th>
                    <th className="text-right py-2 px-2 font-medium min-w-[110px]">
                      <span className="flex items-center gap-1"><Hash className="h-3 w-3" />Part No</span>
                    </th>
                    <th className="text-right py-2 px-2 font-medium min-w-[110px]">
                      <span className="flex items-center gap-1"><Tag className="h-3 w-3" />كود العميل</span>
                    </th>
                    <th className="text-right py-2 px-2 font-medium">الكمية</th>
                    <th className="text-right py-2 px-2 font-medium">الوحدة</th>
                    <th className="py-2 px-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {inquiry.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b last:border-b-0 hover:bg-muted/30 ${selectedItemIds.has(item.id) ? "" : "opacity-50"}`}
                      data-testid={`row-item-${item.id}`}
                    >
                      <td className="py-3 pr-2">
                        <Checkbox
                          checked={selectedItemIds.has(item.id)}
                          onCheckedChange={(checked) => {
                            setSelectedItemIds((prev) => {
                              const next = new Set(prev);
                              checked ? next.add(item.id) : next.delete(item.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="py-3 pr-2 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="py-3 px-2">
                        <p className="font-medium">{item.description}</p>
                        {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                      </td>
                      <td className="py-3 px-2">
                        {(item as any).partNo
                          ? <span className="font-mono text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{(item as any).partNo}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-3 px-2">
                        {(item as any).customerInternalCode
                          ? <span className="font-mono text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{(item as any).customerInternalCode}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-3 px-2 font-medium">{item.quantity}</td>
                      <td className="py-3 px-2 text-muted-foreground text-xs">{item.unit ?? "—"}</td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditItem(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteItemId(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inquiry.items.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {selectedItemIds.size === inquiry.items.length
                    ? "جميع البنود محددة للإرسال"
                    : selectedItemIds.size === 0
                    ? <span className="text-amber-600 font-medium">لا توجد بنود محددة — حدد بنداً واحداً على الأقل للإرسال</span>
                    : <span className="text-blue-600 font-medium">{selectedItemIds.size} من {inquiry.items.length} بند محدد للإرسال</span>
                  }
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── STEP 2: إرسال للموردين (Batch Send) ── */}
      <Card className="border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">2</span>
            <Send className="h-4 w-4 text-blue-600" />
            إرسال طلبات التسعير للموردين
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            اختر الموردين وأرسل لهم طلب التسعير دفعة واحدة عبر الإيميل والواتساب
            {rfqs.length > 0 && <span className="mr-1 font-medium text-blue-600">• {rfqs.length} في سجل الإرسال</span>}
          </p>
          {inquiry.items.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">البنود المرفقة:</span>
              {selectedItemIds.size === 0 ? (
                <span className="text-amber-600 font-medium">لا توجد بنود محددة</span>
              ) : selectedItemIds.size === inquiry.items.length ? (
                <span className="text-green-700 font-medium">جميع البنود ({inquiry.items.length})</span>
              ) : (
                <span className="text-blue-700 font-medium">{selectedItemIds.size} من {inquiry.items.length} بند</span>
              )}
              <button
                className="text-muted-foreground underline hover:text-gray-700 mr-1"
                onClick={() => setSelectedItemIds(new Set(inquiry.items.map((i) => i.id)))}
              >
                تحديد الكل
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category filter pills */}
          {supplierCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {["all", ...supplierCategories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setBatchCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    batchCategoryFilter === cat
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {cat === "all" ? "كل الموردين" : cat}
                </button>
              ))}
            </div>
          )}

          {/* Supplier list with checkboxes */}
          {!suppliers || suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              لا يوجد موردون مسجلون.{" "}
              <a href="/suppliers" className="underline text-blue-600">إضافة مورد</a>
            </p>
          ) : (
            <div className="border rounded-md divide-y">
              {/* Select all header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 sticky top-0">
                <Checkbox
                  id="select-all-suppliers"
                  checked={filteredSuppliers.length > 0 && filteredSuppliers.every((s) => selectedSupplierIds.has(s.id))}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedSupplierIds(new Set(filteredSuppliers.map((s) => s.id)));
                    } else {
                      setSelectedSupplierIds(new Set());
                    }
                  }}
                />
                <label htmlFor="select-all-suppliers" className="text-xs text-muted-foreground cursor-pointer select-none">
                  تحديد الكل ({filteredSuppliers.length} مورد)
                </label>
              </div>
              {/* Supplier rows */}
              <div className="max-h-52 overflow-y-auto divide-y">
                {filteredSuppliers.map((supplier) => {
                  const alreadySent = rfqs.some((r) => r.supplierId === supplier.id);
                  return (
                    <div key={supplier.id} className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 ${alreadySent ? "bg-blue-50/40" : ""}`}>
                      <Checkbox
                        checked={selectedSupplierIds.has(supplier.id)}
                        onCheckedChange={(checked) => {
                          setSelectedSupplierIds((prev) => {
                            const next = new Set(prev);
                            checked ? next.add(supplier.id) : next.delete(supplier.id);
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{supplier.name}</p>
                          {alreadySent && <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 py-0">أُرسل</Badge>}
                        </div>
                        <div className="flex gap-3 mt-0.5">
                          {supplier.email && (
                            <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                              <Mail className="h-2.5 w-2.5" />{supplier.email}
                            </span>
                          )}
                          {supplier.phone && (
                            <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                              <MessageCircle className="h-2.5 w-2.5" />{supplier.phone}
                            </span>
                          )}
                          {!supplier.email && !supplier.phone && (
                            <span className="text-[10px] text-red-400">لا توجد وسيلة تواصل مسجلة</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Close date + Send button */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">آخر موعد للرد (اختياري)</Label>
              <Input type="date" value={batchCloseDate} onChange={(e) => setBatchCloseDate(e.target.value)} />
            </div>
            <Button
              onClick={handleBulkSend}
              disabled={selectedSupplierIds.size === 0 || isSendingBulk}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSendingBulk ? "جارٍ الإرسال..." : `إرسال${selectedSupplierIds.size > 0 ? ` لـ ${selectedSupplierIds.size} مورد` : ""}`}
            </Button>
            <Button size="sm" variant="outline" onClick={openAddRfq}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              يدوي
            </Button>
          </div>

          {/* Bulk send results */}
          {bulkResults && (
            <div className="rounded-md border bg-gray-50 p-3 space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-muted-foreground">نتائج الإرسال</p>
                <button onClick={() => setBulkResults(null)} className="text-xs text-muted-foreground hover:text-gray-700">✕</button>
              </div>
              {bulkResults.map((r) => (
                <div key={r.supplierId} className="flex items-center gap-2 text-xs">
                  <span className="font-medium min-w-[120px] truncate">{r.supplierName ?? `مورد #${r.supplierId}`}</span>
                  <span className={`flex items-center gap-0.5 ${r.email.status === "sent" ? "text-green-600" : r.email.status === "no_email" ? "text-muted-foreground" : "text-red-500"}`}>
                    <Mail className="h-3 w-3" />
                    {r.email.status === "sent" ? "✓" : r.email.status === "no_email" ? "—" : "✗"}
                  </span>
                  <span className={`flex items-center gap-0.5 ${r.whatsapp.status === "sent" ? "text-green-600" : r.whatsapp.status === "no_phone" ? "text-muted-foreground" : "text-red-500"}`}>
                    <MessageCircle className="h-3 w-3" />
                    {r.whatsapp.status === "sent" ? "✓" : r.whatsapp.status === "no_phone" ? "—" : "✗"}
                  </span>
                  {(r.email.reason || r.whatsapp.reason) && (
                    <span className="text-red-500 truncate">{r.email.reason ?? r.whatsapp.reason}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tracking: existing RFQ cards */}
          {isLoadingRfqs ? (
            <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : rfqs.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> سجل الإرسال والمتابعة
              </p>
              <div className="border rounded-md">
                {rfqs.map((rfq) => (
                  <RfqCard
                    key={rfq.id} rfq={rfq}
                    onEdit={openEditRfq}
                    onDelete={(id) => setRfqDeleteId(id)}
                    onEnterPrices={openEnterPrices}
                    onSendEmail={openSendEmail}
                    onGenerateLink={handleGenerateLink}
                    isSendingEmail={sendingEmailId === rfq.id}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ── STEP 3: مقارنة الأسعار + إنشاء عرض السعر ── */}
      {comparison && comparison.rfqs.length > 0 && comparison.items.length > 0 && (
        <Card className="border-green-100">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">3</span>
                <Table2 className="h-4 w-4 text-green-600" />
                مقارنة عروض أسعار الموردين
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                قارن أسعار البنود من كل المورّدين ثم اختر الأنسب لبناء عرض السعر للعميل
              </p>
            </div>
            {hasPricesInComparison && (
              <Button size="sm" onClick={openQuotationFromRfqs} className="bg-green-600 hover:bg-green-700">
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                بناء عرض السعر للعميل
              </Button>
            )}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right py-2 pr-3 font-medium text-muted-foreground min-w-[180px]">البند</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground text-xs min-w-[80px]">Part No</th>
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
                  <th className="text-center py-2 px-2 font-medium text-green-700 text-xs whitespace-nowrap border-r border-l">الأقل ↓</th>
                  <th className="text-center py-2 px-2 font-medium text-blue-600 text-xs whitespace-nowrap">المتوسط</th>
                  <th className="text-center py-2 px-2 font-medium text-red-600 text-xs whitespace-nowrap">الأعلى ↑</th>
                </tr>
              </thead>
              <tbody>
                {comparison.items.map((item) => {
                  const itemPricesList = comparison.rfqs.map((rfq) => {
                    const p = comparison.prices.find((px) => px.rfqId === rfq.id && px.inquiryItemId === item.id);
                    return p?.quotedPrice ?? null;
                  });
                  const validPrices = itemPricesList.filter((p): p is number => p != null);
                  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
                  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : null;
                  const avgPrice = validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : null;

                  function priceColorClass(price: number | null): string {
                    if (price == null || minPrice == null || maxPrice == null || minPrice === maxPrice) return "";
                    const ratio = (price - minPrice) / (maxPrice - minPrice);
                    if (ratio === 0) return "text-green-700 font-bold";
                    if (ratio < 0.35) return "text-green-600";
                    if (ratio < 0.65) return "text-amber-600";
                    return "text-red-600";
                  }

                  return (
                    <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{item.description}</p>
                        {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                      </td>
                      <td className="py-3 px-2">
                        {(item as any).partNo
                          ? <span className="font-mono text-xs text-blue-700">{(item as any).partNo}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
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
                              <span className={priceColorClass(price)}>
                                {isLowest && <Star className="h-3 w-3 inline mr-0.5 fill-green-600 text-green-600" />}
                                {price.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-2 text-center border-r border-l">
                        {minPrice != null
                          ? <span className="text-green-700 font-bold text-xs">{minPrice.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {avgPrice != null
                          ? <span className="text-blue-600 text-xs">{avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {maxPrice != null && validPrices.length > 1
                          ? <span className="text-red-600 text-xs">{maxPrice.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════ DIALOGS ══════════════════════════════════════ */}

      {/* تعديل بيانات الطلب */}
      <Dialog open={editHeaderOpen} onOpenChange={setEditHeaderOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تعديل بيانات طلب التسعير</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>رقم الطلب</Label>
                <Input value={headerForm.inquiryNumber} onChange={(e) => setHeaderForm({ ...headerForm, inquiryNumber: e.target.value })} placeholder="RFQ-2024-001" />
              </div>
              <div className="space-y-1.5">
                <Label>آخر تاريخ للرد</Label>
                <Input type="date" value={headerForm.replyDeadline} onChange={(e) => setHeaderForm({ ...headerForm, replyDeadline: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>موضوع الطلب *</Label>
              <Input value={headerForm.title} onChange={(e) => setHeaderForm({ ...headerForm, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>اسم المشتري / المسؤل لدى العميل</Label>
              <Input value={headerForm.buyerName} onChange={(e) => setHeaderForm({ ...headerForm, buyerName: e.target.value })} placeholder="اسم الموظف المسؤل" />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات عامة</Label>
              <Textarea rows={2} value={headerForm.description} onChange={(e) => setHeaderForm({ ...headerForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditHeaderOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveHeader} disabled={updateInquiry.isPending}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إضافة / تعديل بند */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItemId ? "تعديل البند" : "إضافة بند"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الوصف *</Label>
              <Input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="وصف المنتج أو المادة المطلوبة" data-testid="input-item-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Hash className="h-3 w-3" />رقم القطعة (Part No)</Label>
                <Input value={itemForm.partNo} onChange={(e) => setItemForm({ ...itemForm, partNo: e.target.value })}
                  placeholder="الرقم لدى المصنع" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Tag className="h-3 w-3" />الكود الداخلي للعميل</Label>
                <Input value={itemForm.customerInternalCode} onChange={(e) => setItemForm({ ...itemForm, customerInternalCode: e.target.value })}
                  placeholder="كود العميل الداخلي" className="font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الكمية *</Label>
                <Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                  data-testid="input-item-quantity" />
              </div>
              <div className="space-y-1.5">
                <Label>الوحدة</Label>
                <Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  placeholder="قطعة، كجم، متر..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات / المواصفات</Label>
              <Textarea rows={2} value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                placeholder="المواصفات التفصيلية..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleItemSubmit} disabled={addItem.isPending || updateItem.isPending}
              data-testid="button-submit-item">
              {editingItemId ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* طلب تسعير من مورد */}
      <Dialog open={rfqDialogOpen} onOpenChange={setRfqDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRfq ? "تعديل طلب التسعير" : "إرسال لمورد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>المورد *</Label>
              <Select value={rfqForm.supplierId} onValueChange={(v) => setRfqForm({ ...rfqForm, supplierId: v })} disabled={!!editingRfq}>
                <SelectTrigger><SelectValue placeholder="اختر المورد..." /></SelectTrigger>
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
                <Input type="number" min="0" step="0.01" value={rfqForm.quotedPrice}
                  onChange={(e) => setRfqForm({ ...rfqForm, quotedPrice: e.target.value })}
                  placeholder="يُملأ عند استلام رد المورد" />
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
            <DialogTitle>أسعار البنود — {priceDialogRfq?.supplierName ?? `مورد #${priceDialogRfq?.supplierId}`}</DialogTitle>
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground">{item.quantity} {item.unit ?? "وحدة"}</p>
                        {(item as any).partNo && (
                          <span className="font-mono text-[10px] text-blue-600">{(item as any).partNo}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input type="number" min="0" step="0.01" className="w-28" placeholder="السعر"
                        value={itemPrices[item.id] ?? ""}
                        onChange={(e) => setItemPrices((prev) => ({ ...prev, [item.id]: e.target.value }))} />
                      <span className="text-xs text-muted-foreground w-8">ج.م</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">أضف بنوداً للطلب أولاً.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogRfq(null)}>إلغاء</Button>
            <Button onClick={handleSaveItemPrices} disabled={isSavingPrices}>حفظ الأسعار</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* بناء عرض السعر من أسعار الموردين */}
      <Dialog open={quotationDialogOpen} onOpenChange={setQuotationDialogOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-l from-[#1e6fa8] to-[#17527d] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/15 rounded-lg p-2">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base">إعداد عرض السعر للعميل</h2>
                <p className="text-blue-100 text-xs mt-0.5">
                  اختر لكل بند المورد الأنسب — النجمة{" "}
                  <Star className="h-3 w-3 inline fill-amber-300 text-amber-300" />{" "}
                  تدل على أقل سعر مُقدَّم
                </p>
              </div>
            </div>
          </div>

          {/* Summary bar */}
          {comparison && (
            <div className="bg-gray-50 border-b px-6 py-2.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                البنود المحددة:{" "}
                <span className="font-semibold text-foreground">
                  {Object.values(selectedPrices).filter(Boolean).length}
                </span>{" "}
                من {comparison.items.length}
              </span>
              <div className="flex items-center gap-6">
                <span className="text-muted-foreground">
                  تكلفة الشراء:{" "}
                  <span className="font-semibold text-gray-700">
                    {Object.entries(selectedPrices)
                      .filter(([, v]) => v != null)
                      .reduce((sum, [itemId, v]) => {
                        const it = comparison.items.find((i) => i.id === Number(itemId));
                        return sum + (it ? it.quantity * v!.unitPrice : 0);
                      }, 0)
                      .toLocaleString()}{" "}
                    ج.م
                  </span>
                </span>
                <span className="font-bold text-[#1e6fa8] text-base">
                  إجمالي العرض:{" "}
                  {Object.entries(selectedPrices)
                    .filter(([, v]) => v != null)
                    .reduce((sum, [itemId, v]) => {
                      const it = comparison.items.find((i) => i.id === Number(itemId));
                      return sum + (it ? it.quantity * v!.sellingPrice : 0);
                    }, 0)
                    .toLocaleString()}{" "}
                  ج.م
                </span>
              </div>
            </div>
          )}

          {/* Table */}
          {comparison && (
            <div className="overflow-auto max-h-[55vh]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 border-b-2 border-gray-200">
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-700 min-w-[160px]">البند</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">الكمية</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-700 min-w-[240px]">اختيار المورد</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">سعر الشراء</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-[#1e6fa8] whitespace-nowrap min-w-[130px]">
                      سعر البيع للعميل
                    </th>
                    <th className="text-center px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparison.items.map((item, idx) => {
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
                    const isSkipped = selected === null;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSkipped ? "bg-gray-50 opacity-60" : selected ? "bg-blue-50/40" : "bg-white hover:bg-blue-50/20"
                        }`}
                      >
                        {/* Item description */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <p className={`font-medium leading-snug ${isSkipped ? "line-through text-gray-400" : ""}`}>
                                {item.description}
                              </p>
                              {(item as any).partNo && (
                                <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 rounded mt-0.5 inline-block">
                                  {(item as any).partNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Qty */}
                        <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">
                          {item.quantity} {item.unit ?? ""}
                        </td>

                        {/* Supplier options */}
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {itemPriceOptions.map((opt) => {
                              const isSelected = selected?.rfqId === opt.rfqId;
                              const isLowest = opt.unitPrice === minPrice && itemPriceOptions.length > 1;
                              return (
                                <button
                                  key={opt.rfqId}
                                  onClick={() => setSelectedPrices((prev) => ({
                                    ...prev,
                                    [item.id]: isSelected ? null : {
                                      rfqId: opt.rfqId,
                                      supplierId: opt.supplierId,
                                      unitPrice: opt.unitPrice,
                                      sellingPrice: prev[item.id]?.sellingPrice ?? opt.unitPrice,
                                    },
                                  }))}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs font-medium transition-all ${
                                    isSelected
                                      ? "bg-[#1e6fa8] text-white border-[#1e6fa8] shadow-sm"
                                      : "bg-white border-gray-200 text-gray-700 hover:border-[#1e6fa8] hover:bg-blue-50"
                                  }`}
                                >
                                  {isLowest && (
                                    <Star className={`h-3 w-3 flex-shrink-0 ${isSelected ? "fill-amber-300 text-amber-300" : "fill-amber-400 text-amber-400"}`} />
                                  )}
                                  <span className="max-w-[90px] truncate">{opt.supplierName ?? `#${opt.supplierId}`}</span>
                                  <span className={`font-bold ${isSelected ? "text-blue-100" : "text-[#1e6fa8]"}`}>
                                    {opt.unitPrice.toLocaleString()}
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setSelectedPrices((prev) => ({ ...prev, [item.id]: null }))}
                              className={`px-2.5 py-1 rounded border text-xs transition-all ${
                                isSkipped
                                  ? "bg-gray-200 border-gray-300 text-gray-600 font-medium"
                                  : "bg-white border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600"
                              }`}
                            >
                              تجاهل
                            </button>
                          </div>
                        </td>

                        {/* Supplier cost price */}
                        <td className="px-3 py-3 text-center">
                          {selected ? (
                            <span className="font-medium text-gray-500 text-xs">{selected.unitPrice.toLocaleString()} ج.م</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Selling price to customer — editable */}
                        <td className="px-3 py-3 text-center">
                          {selected ? (
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={selected.sellingPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSelectedPrices((prev) => ({
                                    ...prev,
                                    [item.id]: prev[item.id] ? { ...prev[item.id]!, sellingPrice: val } : null,
                                  }));
                                }}
                                className="w-24 text-center border border-[#1e6fa8] rounded px-2 py-1 text-sm font-semibold text-[#1e6fa8] focus:outline-none focus:ring-1 focus:ring-[#1e6fa8]"
                              />
                              <span className="text-xs text-gray-500">ج.م</span>
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Row total (based on selling price) */}
                        <td className="px-3 py-3 text-center">
                          {selected ? (
                            <span className="font-bold text-[#1e6fa8]">
                              {(item.quantity * selected.sellingPrice).toLocaleString()} ج.م
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Grand total footer */}
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td colSpan={5} className="px-4 py-3 text-right font-semibold text-gray-700">
                      الإجمالي الكلي لعرض السعر للعميل
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-[#1e6fa8] text-base">
                      {Object.entries(selectedPrices)
                        .filter(([, v]) => v != null)
                        .reduce((sum, [itemId, v]) => {
                          const it = comparison.items.find((i) => i.id === Number(itemId));
                          return sum + (it ? it.quantity * v!.sellingPrice : 0);
                        }, 0)
                        .toLocaleString()}{" "}
                      ج.م
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Footer actions */}
          <div className="border-t bg-white px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              سيتم إنشاء مسودة عرض السعر بالبنود المحددة فقط
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setQuotationDialogOpen(false)}>إلغاء</Button>
              <Button
                size="sm"
                onClick={handleCreateQuotationFromRfqs}
                disabled={isCreatingFromRfqs}
                className="bg-[#1e6fa8] hover:bg-[#17527d] text-white gap-2"
              >
                <FileText className="h-4 w-4" />
                {isCreatingFromRfqs ? "جارٍ الإنشاء..." : "إنشاء عرض السعر"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* إرسال إيميل */}
      <Dialog open={!!sendEmailDialogRfq} onOpenChange={(o) => !o && setSendEmailDialogRfq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال طلب التسعير بالإيميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              سيتم إرسال رابط بوابة التسعير لـ <span className="font-medium text-foreground">{sendEmailDialogRfq?.supplierName}</span>
            </p>
            <div className="space-y-1.5">
              <Label>آخر موعد للرد (اختياري)</Label>
              <Input type="date" value={emailCloseDate} onChange={(e) => setEmailCloseDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEmailDialogRfq(null)}>إلغاء</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmailId != null}>
              <Mail className="h-4 w-4 mr-2" />
              إرسال الإيميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تأكيد حذف البند */}
      <AlertDialog open={deleteItemId != null} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف البند؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف هذا البند نهائياً.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* تأكيد حذف طلب تسعير مورد */}
      <AlertDialog open={rfqDeleteId != null} onOpenChange={(o) => !o && setRfqDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف طلب التسعير؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف طلب التسعير الخاص بهذا المورد.</AlertDialogDescription>
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
