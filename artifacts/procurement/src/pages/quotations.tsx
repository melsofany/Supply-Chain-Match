import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListQuotations,
  useListCustomers,
  useListInquiries,
  useCreateQuotation,
  useDeleteQuotation,
  getListQuotationsQueryKey,
  getListCustomersQueryKey,
  getListInquiriesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function Quotations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: quotations, isLoading } = useListQuotations({
    query: { queryKey: getListQuotationsQueryKey() },
  });
  const { data: customers } = useListCustomers({
    query: { queryKey: getListCustomersQueryKey() },
  });
  const { data: inquiries } = useListInquiries({
    query: { queryKey: getListInquiriesQueryKey() },
  });

  const createMutation = useCreateQuotation();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", inquiryId: "", quotationNumber: "" });

  const filteredInquiries = (inquiries ?? []).filter(
    (i) => !form.customerId || String(i.customerId) === form.customerId
  );

  const filtered = (quotations ?? []).filter((q) => {
    const matchSearch =
      (q.quotationNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (q.customerName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleCreate() {
    if (!form.customerId || !form.inquiryId) {
      toast({ title: "Customer and inquiry are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          customerId: Number(form.customerId),
          inquiryId: Number(form.inquiryId),
          ...(form.quotationNumber && { quotationNumber: form.quotationNumber }),
          status: "draft",
        },
      },
      {
        onSuccess: (newQ) => {
          qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
          setDialogOpen(false);
          toast({ title: "Quotation created" });
          setLocation(`/quotations/${newQ.id}`);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground mt-1">Price offers sent to customers</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-quotation">
          <Plus className="h-4 w-4 mr-2" />
          New Quotation
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search quotations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-quotations"
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No quotations found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create a quotation in response to a customer inquiry
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-quotation-${q.id}`}>
              <Link href={`/quotations/${q.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted rounded-md p-2 mt-0.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {q.quotationNumber ?? `Quotation #${q.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.customerName ?? `Customer #${q.customerId}`} •{" "}
                        {new Date(q.createdAt).toLocaleDateString()}
                        {q.totalAmount != null && ` • $${q.totalAmount.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[q.status] ?? ""}`}>
                      {q.status}
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
          <DialogHeader>
            <DialogTitle>New Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v, inquiryId: "" })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Inquiry *</Label>
              <Select value={form.inquiryId} onValueChange={(v) => setForm({ ...form, inquiryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select inquiry..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredInquiries.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quotation Number</Label>
              <Input
                value={form.quotationNumber}
                onChange={(e) => setForm({ ...form, quotationNumber: e.target.value })}
                placeholder="QT-2024-001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-submit-quotation">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
