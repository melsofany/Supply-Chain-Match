import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Pencil, Trash2, Building2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";

interface SupplierFormData {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  notes: string;
}

const emptyForm: SupplierFormData = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  category: "",
  notes: "",
};

export default function Suppliers() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: suppliers, isLoading } = useListSuppliers({
    query: { queryKey: getListSuppliersQueryKey() },
  });

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);

  const categories = Array.from(
    new Set((suppliers ?? []).map((s) => s.category).filter(Boolean))
  ) as string[];

  const filtered = (suppliers ?? []).filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.contactName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || s.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(s: NonNullable<typeof suppliers>[number]) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      contactName: s.contactName ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
      category: s.category ?? "",
      notes: s.notes ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    const data = {
      name: form.name,
      ...(form.contactName && { contactName: form.contactName }),
      ...(form.email && { email: form.email }),
      ...(form.phone && { phone: form.phone }),
      ...(form.address && { address: form.address }),
      ...(form.category && { category: form.category }),
      ...(form.notes && { notes: form.notes }),
    };
    if (editingId != null) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
            setDialogOpen(false);
            toast({ title: "Supplier updated" });
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
            setDialogOpen(false);
            toast({ title: "Supplier created" });
          },
        }
      );
    }
  }

  function handleDelete() {
    if (deleteId == null) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
          setDeleteId(null);
          toast({ title: "Supplier deleted" });
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage your vendor network</p>
        </div>
        <Button onClick={openCreate} data-testid="button-create-supplier">
          <Plus className="h-4 w-4 mr-2" />
          New Supplier
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-suppliers"
          />
        </div>
        {categories.length > 0 && (
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            data-testid="select-category-filter"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">No suppliers found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {search ? "Try a different search term" : "Add your first supplier to get started"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow" data-testid={`card-supplier-${s.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link href={`/suppliers/${s.id}`}>
                      <CardTitle className="text-base hover:text-primary cursor-pointer transition-colors">
                        {s.name}
                      </CardTitle>
                    </Link>
                    {s.category && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {s.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(s)}
                      data-testid={`button-edit-supplier-${s.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(s.id)}
                      data-testid={`button-delete-supplier-${s.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {s.contactName && (
                  <p className="text-muted-foreground">Contact: {s.contactName}</p>
                )}
                {s.email && <p className="text-muted-foreground truncate">{s.email}</p>}
                {s.phone && <p className="text-muted-foreground">{s.phone}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Supplier" : "New Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="input-supplier-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact Person</Label>
                <Input
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Electronics, Steel..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-supplier"
            >
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
