import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSupplierRfq, useUpdateSupplierRfq } from "@/hooks/use-supplier-rfqs";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "معلق",
  sent: "أُرسل",
  received: "استُلم الرد",
  cancelled: "ملغي",
};

export default function SupplierRfqDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const numId = Number(id);

  const { data: rfq, isLoading, mutate } = useSupplierRfq(numId);
  const { update, isUpdating } = useUpdateSupplierRfq(numId, mutate);

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceForm, setPriceForm] = useState({ quotedPrice: "", notes: "" });

  function openEditPrice() {
    if (!rfq) return;
    setPriceForm({
      quotedPrice: rfq.quotedPrice != null ? String(rfq.quotedPrice) : "",
      notes: rfq.notes ?? "",
    });
    setEditingPrice(true);
  }

  function savePrice() {
    const price = priceForm.quotedPrice ? Number(priceForm.quotedPrice) : undefined;
    update(
      { quotedPrice: price, notes: priceForm.notes || undefined },
      {
        onSuccess: () => {
          setEditingPrice(false);
          toast({ title: "تم تحديث السعر" });
        },
      }
    );
  }

  function handleStatusChange(status: string) {
    update({ status: status as any }, {
      onSuccess: () => toast({ title: "تم تحديث الحالة" }),
    });
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!rfq) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">طلب التسعير غير موجود.</p>
        <Button variant="link" onClick={() => setLocation("/supplier-rfqs")}>العودة</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {rfq.rfqNumber ?? `طلب تسعير مورد #${rfq.id}`}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {rfq.supplierName ?? `مورد #${rfq.supplierId}`}
            {rfq.inquiryTitle && (
              <span> • استفسار: {rfq.inquiryTitle}</span>
            )}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[rfq.status] ?? ""}`}>
          {STATUS_LABELS[rfq.status] ?? rfq.status}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">التفاصيل</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">الحالة</Label>
              <Select value={rfq.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1">
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
            <div>
              <Label className="text-xs text-muted-foreground">المورد</Label>
              <p className="mt-1 font-medium">{rfq.supplierName ?? `#${rfq.supplierId}`}</p>
            </div>
            {rfq.inquiryTitle && (
              <div>
                <Label className="text-xs text-muted-foreground">الاستفسار المرتبط</Label>
                <p className="mt-1 text-sm">
                  <a
                    href={`/inquiries/${rfq.inquiryId}`}
                    className="text-primary hover:underline"
                    onClick={(e) => { e.preventDefault(); setLocation(`/inquiries/${rfq.inquiryId}`); }}
                  >
                    {rfq.inquiryTitle}
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">السعر المعروض من المورد</CardTitle>
            {!editingPrice && (
              <Button variant="outline" size="sm" onClick={openEditPrice}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                تعديل
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {editingPrice ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>السعر الإجمالي</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceForm.quotedPrice}
                    onChange={(e) => setPriceForm({ ...priceForm, quotedPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ملاحظات</Label>
                  <Textarea
                    rows={2}
                    value={priceForm.notes}
                    onChange={(e) => setPriceForm({ ...priceForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingPrice(false)}>إلغاء</Button>
                  <Button size="sm" onClick={savePrice} disabled={isUpdating}>حفظ</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-3xl font-bold">
                    {rfq.quotedPrice != null
                      ? `$${Number(rfq.quotedPrice).toLocaleString()}`
                      : <span className="text-muted-foreground text-lg">لم يُستلم بعد</span>
                    }
                  </p>
                </div>
                {rfq.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                    <p className="mt-1 text-sm">{rfq.notes}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
