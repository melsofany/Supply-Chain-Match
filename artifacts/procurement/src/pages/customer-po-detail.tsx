import { useParams, useLocation } from "wouter";
import { ArrowLeft, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCustomerPo,
  useUpdateCustomerPo,
  useCreateSupplierPo,
  useListSuppliers,
  getGetCustomerPoQueryKey,
  getListCustomerPosQueryKey,
  getListSupplierPosQueryKey,
  getListSuppliersQueryKey,
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

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  fulfilled: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

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

  const updatePo = useUpdateCustomerPo();
  const createSupplierPo = useCreateSupplierPo();

  const [supplierPoDialogOpen, setSupplierPoDialogOpen] = useState(false);
  const [supplierPoForm, setSupplierPoForm] = useState({ supplierId: "", poNumber: "", totalAmount: "", notes: "" });

  function handleStatusChange(status: string) {
    updatePo.mutate(
      { id: numId, data: { status: status as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetCustomerPoQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListCustomerPosQueryKey() });
          toast({ title: "Status updated" });
        },
      }
    );
  }

  function handleCreateSupplierPo() {
    if (!supplierPoForm.supplierId) {
      toast({ title: "Supplier is required", variant: "destructive" });
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
          toast({ title: "Supplier PO created" });
          setLocation(`/supplier-pos/${newPo.id}`);
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
        <p className="text-muted-foreground">Customer PO not found.</p>
        <Button variant="link" onClick={() => setLocation("/customer-pos")}>Back to Customer POs</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customer-pos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{po.poNumber ?? `Customer PO #${po.id}`}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {po.customerName ?? `Customer #${po.customerId}`} • {new Date(po.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[po.status] ?? ""}`}>
            {po.status}
          </span>
          <Button size="sm" variant="outline" onClick={() => setSupplierPoDialogOpen(true)} data-testid="button-create-supplier-po">
            <Truck className="h-4 w-4 mr-1.5" />
            Create Supplier PO
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={po.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1" data-testid="select-customer-po-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Amount</Label>
              <p className="mt-1 font-semibold text-lg">
                {po.totalAmount != null ? `$${po.totalAmount.toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
          {po.notes && (
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <p className="mt-1 text-sm">{po.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={supplierPoDialogOpen} onOpenChange={setSupplierPoDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Supplier PO</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={supplierPoForm.supplierId} onValueChange={(v) => setSupplierPoForm({ ...supplierPoForm, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>PO Number</Label>
                <Input value={supplierPoForm.poNumber} onChange={(e) => setSupplierPoForm({ ...supplierPoForm, poNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Amount</Label>
                <Input type="number" value={supplierPoForm.totalAmount} onChange={(e) => setSupplierPoForm({ ...supplierPoForm, totalAmount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={supplierPoForm.notes} onChange={(e) => setSupplierPoForm({ ...supplierPoForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierPoDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSupplierPo} disabled={createSupplierPo.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
