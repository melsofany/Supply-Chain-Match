import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, ShoppingCart, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomerPos,
  useListCustomers,
  useCreateCustomerPo,
  getListCustomerPosQueryKey,
  getListCustomersQueryKey,
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

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  fulfilled: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

export default function CustomerPos() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: pos, isLoading } = useListCustomerPos({
    query: { queryKey: getListCustomerPosQueryKey() },
  });
  const { data: customers } = useListCustomers({
    query: { queryKey: getListCustomersQueryKey() },
  });

  const createMutation = useCreateCustomerPo();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", poNumber: "", totalAmount: "", notes: "" });

  const filtered = (pos ?? []).filter((p) => {
    const matchSearch =
      (p.poNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.customerName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleCreate() {
    if (!form.customerId) {
      toast({ title: "Customer is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          customerId: Number(form.customerId),
          ...(form.poNumber && { poNumber: form.poNumber }),
          ...(form.totalAmount && { totalAmount: Number(form.totalAmount) }),
          ...(form.notes && { notes: form.notes }),
          status: "received",
        },
      },
      {
        onSuccess: (newPo) => {
          qc.invalidateQueries({ queryKey: getListCustomerPosQueryKey() });
          setDialogOpen(false);
          toast({ title: "Customer PO created" });
          setLocation(`/customer-pos/${newPo.id}`);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer POs</h1>
          <p className="text-muted-foreground mt-1">Purchase orders received from customers</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-customer-po">
          <Plus className="h-4 w-4 mr-2" />
          New PO
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search POs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="received">Received</option>
          <option value="processing">Processing</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No customer POs found</h3>
          <p className="text-muted-foreground text-sm mt-1">POs are created when a customer approves a quotation</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((po) => (
            <Card key={po.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-customer-po-${po.id}`}>
              <Link href={`/customer-pos/${po.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted rounded-md p-2 mt-0.5">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{po.poNumber ?? `PO #${po.id}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {po.customerName ?? `Customer #${po.customerId}`} •{" "}
                        {new Date(po.createdAt).toLocaleDateString()}
                        {po.totalAmount != null && ` • $${po.totalAmount.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[po.status] ?? ""}`}>
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
          <DialogHeader><DialogTitle>New Customer PO</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder="Select customer..." /></SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>PO Number</Label>
                <Input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="PO-2024-001" />
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
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-customer-po">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
