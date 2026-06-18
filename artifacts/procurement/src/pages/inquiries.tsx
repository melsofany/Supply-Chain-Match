import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, FileQuestion, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInquiries,
  useListCustomers,
  useCreateInquiry,
  useDeleteInquiry,
  useUpdateInquiry,
  getListInquiriesQueryKey,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { INQUIRY_STATUS_COLORS, INQUIRY_STATUS_LABELS } from "@/lib/status";

export default function Inquiries() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: inquiries, isLoading } = useListInquiries({
    query: { queryKey: getListInquiriesQueryKey() },
  });
  const { data: customers } = useListCustomers({
    query: { queryKey: getListCustomersQueryKey() },
  });

  const createMutation = useCreateInquiry();
  const deleteMutation = useDeleteInquiry();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ customerId: "", title: "", description: "" });

  const filtered = (inquiries ?? []).filter((i) => {
    const matchSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.customerName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function handleCreate() {
    if (!form.customerId || !form.title.trim()) {
      toast({ title: "Customer and title are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          customerId: Number(form.customerId),
          title: form.title,
          ...(form.description && { description: form.description }),
          status: "new",
        },
      },
      {
        onSuccess: (newInquiry) => {
          qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
          setDialogOpen(false);
          setForm({ customerId: "", title: "", description: "" });
          toast({ title: "Inquiry created" });
          setLocation(`/inquiries/${newInquiry.id}`);
        },
      }
    );
  }

  function handleDelete() {
    if (deleteId == null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
          setDeleteId(null);
          toast({ title: "Inquiry deleted" });
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inquiries</h1>
          <p className="text-muted-foreground mt-1">Customer needs waiting to be quoted</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-inquiry">
          <Plus className="h-4 w-4 mr-2" />
          New Inquiry
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search inquiries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-inquiries"
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="select-status-filter"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="quoted">Quoted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No inquiries found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {search ? "Try a different search term" : "Create an inquiry when a customer has a need"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inq) => (
            <Card
              key={inq.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              data-testid={`card-inquiry-${inq.id}`}
            >
              <Link href={`/inquiries/${inq.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted rounded-md p-2 mt-0.5">
                      <FileQuestion className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{inq.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inq.customerName ?? `Customer #${inq.customerId}`} •{" "}
                        {new Date(inq.createdAt).toLocaleDateString()} •{" "}
                        {inq.items.length} item{inq.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        INQUIRY_STATUS_COLORS[inq.status] ?? "bg-gray-100"
                      }`}
                    >
                      {INQUIRY_STATUS_LABELS[inq.status] ?? inq.status}
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
            <DialogTitle>New Inquiry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Customer *</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v })}
              >
                <SelectTrigger data-testid="select-inquiry-customer">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief description of what the customer needs"
                data-testid="input-inquiry-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-inquiry"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also delete all items in this inquiry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
