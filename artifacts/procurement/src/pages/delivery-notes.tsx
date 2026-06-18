import { useLocation } from "wouter";
import { Plus, FileCheck, Clock, CheckCircle, XCircle, PenLine, Truck } from "lucide-react";
import { useListDeliveryNotes, useCreateDeliveryNote, useListCustomerPos, getListDeliveryNotesQueryKey, getListCustomerPosQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { DELIVERY_NOTE_STATUS_COLORS, DELIVERY_NOTE_STATUS_LABELS } from "@/lib/status";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <Clock className="h-4 w-4" />,
  pending_finance: <Clock className="h-4 w-4 text-yellow-600" />,
  finance_approved: <CheckCircle className="h-4 w-4 text-blue-600" />,
  delivered: <Truck className="h-4 w-4 text-purple-600" />,
  signed: <PenLine className="h-4 w-4 text-green-600" />,
  cancelled: <XCircle className="h-4 w-4 text-red-600" />,
};

export default function DeliveryNotes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: notes, isLoading } = useListDeliveryNotes({ query: { queryKey: getListDeliveryNotesQueryKey() } });
  const { data: customerPos } = useListCustomerPos({ query: { queryKey: getListCustomerPosQueryKey() } });
  const createDn = useCreateDeliveryNote();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ customerPoId: "", issueDate: "", notes: "" });

  function handleCreate() {
    if (!form.customerPoId) {
      toast({ title: "أمر الشراء مطلوب", variant: "destructive" });
      return;
    }
    createDn.mutate(
      { data: { customerPoId: Number(form.customerPoId), ...(form.issueDate && { issueDate: form.issueDate }), ...(form.notes && { notes: form.notes }) } },
      {
        onSuccess: (dn) => {
          qc.invalidateQueries({ queryKey: getListDeliveryNotesQueryKey() });
          setDialogOpen(false);
          toast({ title: `تم إنشاء إذن التسليم ${dn.dnNumber}` });
          setLocation(`/delivery-notes/${dn.id}`);
        },
        onError: () => toast({ title: "فشل إنشاء إذن التسليم", variant: "destructive" }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">أذون التسليم</h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة أذون تسليم البضائع للعملاء</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          إذن تسليم جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (notes ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد أذون تسليم بعد.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(notes ?? []).map((dn) => (
            <Card key={dn.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/delivery-notes/${dn.id}`)}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {STATUS_ICONS[dn.status]}
                  <div>
                    <p className="font-semibold text-sm">{dn.dnNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dn.customerName ?? "—"} • {dn.customerPoNumber ? `PO: ${dn.customerPoNumber}` : `Customer PO #${dn.customerPoId}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {dn.invoice && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {dn.invoice.invoiceNumber}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${DELIVERY_NOTE_STATUS_COLORS[dn.status] ?? ""}`}>
                    {DELIVERY_NOTE_STATUS_LABELS[dn.status] ?? dn.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{new Date(dn.createdAt).toLocaleDateString("ar-EG")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>إنشاء إذن تسليم جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>أمر شراء العميل *</Label>
              <Select value={form.customerPoId} onValueChange={(v) => setForm({ ...form, customerPoId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر أمر الشراء..." /></SelectTrigger>
                <SelectContent>
                  {(customerPos ?? []).map((po) => (
                    <SelectItem key={po.id} value={String(po.id)}>
                      {po.poNumber ?? `PO #${po.id}`} — {po.customerName ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ الإصدار</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createDn.isPending}>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
