/**
 * Supplier Portal — public page (no auth required).
 * Supplier opens unique link from email → sees RFQ items → enters prices → submits.
 * Supports per-item: price, taxIncluded, deliveryDays, notes.
 */
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { CheckCircle, Clock, AlertCircle, Send, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PortalItem {
  id: number;
  description: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
}

interface PortalData {
  rfq: {
    id: number;
    rfqNumber: string | null;
    inquiryTitle: string | null;
    supplierName: string | null;
    closeDate: string | null;
    notes: string | null;
    offerSubmitted: boolean;
    offerSubmittedAt: string | null;
    status: string;
  };
  items: PortalItem[];
  existingPrices: {
    inquiryItemId: number;
    quotedPrice: number | null;
    notes: string | null;
    taxIncluded?: boolean;
    deliveryDays?: number | null;
  }[];
}

interface ItemEntry {
  price: string;
  notes: string;
  taxIncluded: boolean;
  deliveryDays: string;
}

export default function SupplierPortal() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prices, setPrices] = useState<Record<number, ItemEntry>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/portal/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || `خطأ ${r.status}`);
        }
        return r.json();
      })
      .then((d: PortalData) => {
        setData(d);
        const init: Record<number, ItemEntry> = {};
        for (const p of d.existingPrices) {
          init[p.inquiryItemId] = {
            price: p.quotedPrice != null ? String(p.quotedPrice) : "",
            notes: p.notes ?? "",
            taxIncluded: p.taxIncluded ?? false,
            deliveryDays: p.deliveryDays != null ? String(p.deliveryDays) : "",
          };
        }
        setPrices(init);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [token]);

  function setField(itemId: number, field: keyof ItemEntry, value: string | boolean) {
    setPrices((prev) => ({
      ...prev,
      [itemId]: {
        price: prev[itemId]?.price ?? "",
        notes: prev[itemId]?.notes ?? "",
        taxIncluded: prev[itemId]?.taxIncluded ?? false,
        deliveryDays: prev[itemId]?.deliveryDays ?? "",
        [field]: value,
      },
    }));
  }

  async function handleSubmit() {
    if (!data) return;
    const items = data.items.map((item) => ({
      inquiryItemId: item.id,
      quotedPrice: prices[item.id]?.price ? Number(prices[item.id].price) : null,
      notes: prices[item.id]?.notes || undefined,
      taxIncluded: prices[item.id]?.taxIncluded ?? false,
      deliveryDays: prices[item.id]?.deliveryDays ? Number(prices[item.id].deliveryDays) : null,
    }));

    const hasAnyPrice = items.some((i) => i.quotedPrice != null);
    if (!hasAnyPrice) {
      alert("يرجى إدخال سعر لبند واحد على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/portal/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, generalNotes: generalNotes || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "فشل الإرسال");
      setSubmitted(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submitted ──────────────────────────────────────────────────────────────
  if (submitted || data?.rfq.offerSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-green-800">تم استلام عرض السعر!</h1>
            <p className="text-muted-foreground">
              شكراً لتعاونكم. تم استلام أسعاركم بنجاح وسيتم مراجعتها من قِبل فريق المشتريات.
            </p>
            {data?.rfq.offerSubmittedAt && (
              <p className="text-sm text-muted-foreground">
                تاريخ الإرسال: {new Date(data.rfq.offerSubmittedAt).toLocaleString("ar-EG")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8 space-y-4">
            <AlertCircle className="h-14 w-14 text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-red-700">الرابط غير صالح</h1>
            <p className="text-muted-foreground">{error || "حدث خطأ غير متوقع. يرجى التواصل مع الجهة المُرسِلة."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { rfq, items } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-[#1e3a5f] text-white rounded-xl p-5 shadow-md">
          <p className="text-blue-200 text-sm mb-1">طلب عرض سعر</p>
          <h1 className="text-2xl font-bold">{rfq.inquiryTitle ?? "طلب تسعير"}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-blue-100">
            {rfq.rfqNumber && <span>رقم الطلب: <strong className="text-white">{rfq.rfqNumber}</strong></span>}
            {rfq.closeDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                آخر موعد: <strong className="text-yellow-300">{rfq.closeDate}</strong>
              </span>
            )}
            <span>المورد: <strong className="text-white">{rfq.supplierName}</strong></span>
          </div>
          {rfq.notes && (
            <p className="mt-3 text-sm text-blue-200 border-t border-blue-700 pt-3">{rfq.notes}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>تعليمات:</strong> يرجى إدخال سعر الوحدة لكل صنف. حدد ما إذا كان السعر شامل الضريبة، وأدخل مدة التوريد المتوقعة بالأيام. يمكنك ترك الحقل فارغاً إذا لم تتوفر لديكم الصنف.
        </div>

        {/* Items */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">الأصناف المطلوبة ({items.length} صنف)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-white">
                {/* Item header */}
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      الكمية المطلوبة: <strong>{item.quantity ?? "—"} {item.unit ?? ""}</strong>
                      {item.notes && <span className="mr-2 text-gray-400">| {item.notes}</span>}
                    </p>
                  </div>
                </div>

                {/* Price + Notes */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">سعر الوحدة (ج.م)</Label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={prices[item.id]?.price ?? ""}
                        onChange={(e) => setField(item.id, "price", e.target.value)}
                        className="text-left font-mono"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">ج.م</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ملاحظة (اختياري)</Label>
                    <Input
                      placeholder="أي تفاصيل إضافية..."
                      value={prices[item.id]?.notes ?? ""}
                      onChange={(e) => setField(item.id, "notes", e.target.value)}
                    />
                  </div>
                </div>

                {/* Tax + Delivery */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t">
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id={`tax-${item.id}`}
                      checked={prices[item.id]?.taxIncluded ?? false}
                      onChange={(e) => setField(item.id, "taxIncluded", e.target.checked)}
                      className="w-4 h-4 accent-[#1e3a5f] cursor-pointer"
                    />
                    <label htmlFor={`tax-${item.id}`} className="text-xs text-muted-foreground cursor-pointer select-none">
                      السعر شامل الضريبة (VAT)
                    </label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3 w-3" /> مدة التوريد (أيام)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="مثال: 14"
                      value={prices[item.id]?.deliveryDays ?? ""}
                      onChange={(e) => setField(item.id, "deliveryDays", e.target.value)}
                      className="text-left font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* General notes */}
        <Card className="shadow-md">
          <CardContent className="pt-5">
            <div className="space-y-2">
              <Label>ملاحظات عامة (اختياري)</Label>
              <Textarea
                rows={3}
                placeholder="الشروط والأحكام، مدة صلاحية العرض، شروط الدفع..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary + Submit */}
        <div className="bg-white border rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">الإجمالي التقديري</p>
              <p className="text-2xl font-bold text-[#1e3a5f]">
                {items.reduce((sum, item) => {
                  const price = Number(prices[item.id]?.price || 0);
                  const qty = item.quantity ?? 1;
                  return sum + price * qty;
                }, 0).toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ج.م
              </p>
            </div>
            <div className="text-left text-sm text-muted-foreground space-y-0.5">
              <p>بنود أُدخلت: <strong>{Object.values(prices).filter((p) => p.price).length}</strong> من {items.length}</p>
              <p>شامل ضريبة: <strong>{Object.values(prices).filter((p) => p.taxIncluded && p.price).length}</strong> بند</p>
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white py-6 text-base"
            size="lg"
          >
            <Send className="h-5 w-5 ml-2" />
            {submitting ? "جارٍ الإرسال..." : "إرسال عرض السعر"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            بالضغط على الإرسال، تؤكدون صحة الأسعار المُدخلة وأنها ملزمة حتى تاريخ {rfq.closeDate ?? "الانتهاء"}.
          </p>
        </div>
      </div>
    </div>
  );
}
