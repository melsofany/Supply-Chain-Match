import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, Truck, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSupplierPos,
  useListSuppliers,
  useCreateSupplierPo,
  getListSupplierPosQueryKey,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { SUPPLIER_PO_STATUS_COLORS } from "@/lib/status";

export default function SupplierPos() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: pos, isLoading } = useListSupplierPos({
    query: { queryKey: getListSupplierPosQueryKey() },
  });
  const { data: suppliers } = useListSuppliers({
    query: { queryKey: getListSuppliersQueryKey() },
  });

  const createMutation = useCreateSupplierPo();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ supplierId: "", poNumber: "", totalAmount: "", notes: "" });

  const filtered = (pos ?? []).filter((p) => {
    const matchSearch =
      (p.poNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.supplierName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleCreate() {
    if (!form.supplierId) {
      toast({ title: "Supplier is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          supplierId: Number(form.supplierId),
          ...(form.poNumber && { poNumber: form.poNumber }),
          ...(form.totalAmount && { totalAmount: Number(form.totalAmount) }),
          ...(form.notes && { notes: form.notes }),
          status: "draft",
        },
      },
      {
        onSuccess: (newPo) => {
          qc.invalidateQueries({ queryKey: getListSupplierPosQueryKey() });
          setDialogOpen(false);
          toast({ title: "Supplier PO created" });
          setLocation(`/supplier-pos/${newPo.id}`);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier POs</h1>
          <p className="text-muted-foreground mt-1">Purchase orders sent to your suppliers</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-supplier-po">
          <Plus className="h-4 w-4 mr-2" />
          New PO
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search POs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="confirmed">Confirmed</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Truck className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No supplier POs found</h3>
          <p className="text-muted-foreground text-sm mt-1">Create a supplier PO to order from your vendors</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((po) => (
            <Card key={po.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-supplier-po-${po.id}`}>
              <Link href={`/supplier-pos/${po.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted rounded-md p-2 mt-0.5">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{po.poNumber ?? `Supplier PO #${po.id}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {po.supplierName ?? `Supplier #${po.supplierId}`} •{" "}
                        {new Date(po.createdAt).toLocaleDateString()}
                        {po.totalAmount != null && ` • $${po.totalAmount.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SUPPLIER_PO_STATUS_COLORS[po.status] ?? ""}`}>
                      {po.status}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Supplier PO</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Supplier *</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
                <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>PO Number</Label>
                <Input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Amount</Label>
                <Input type="number" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
