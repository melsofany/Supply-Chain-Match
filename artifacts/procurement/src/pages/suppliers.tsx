import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Building2, Tags, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import {
  useSupplierCategories,
  useCreateSupplierCategory,
  useUpdateSupplierCategory,
  useDeleteSupplierCategory,
  type SupplierCategory,
} from "@/hooks/use-supplier-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// ── Colour palette for categories ────────────────────────────────────────────
const PALETTE = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

function CategoryBadge({ category, categories }: { category: string | null | undefined; categories: SupplierCategory[] }) {
  if (!category) return null;
  const cat = categories.find((c) => c.name === category);
  const color = cat?.color ?? "#6366f1";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {category}
    </span>
  );
}

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
  name: "", contactName: "", email: "", phone: "", address: "", category: "", notes: "",
};

export default function Suppliers() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: suppliers, isLoading } = useListSuppliers({ query: { queryKey: getListSuppliersQueryKey() } });
  const { data: categories, refetch: refetchCategories } = useSupplierCategories();

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  // category CRUD hooks
  const { create: createCat, isCreating: isCreatingCat } = useCreateSupplierCategory(refetchCategories);
  const { update: updateCat, isUpdating: isUpdatingCat } = useUpdateSupplierCategory(refetchCategories);
  const { remove: deleteCat } = useDeleteSupplierCategory(refetchCategories);

  // suppliers list state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // supplier dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // categories management dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", color: PALETTE[0], description: "" });
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = (suppliers ?? []).filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.contactName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || s.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  // ── Supplier dialog ────────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(s: NonNullable<typeof suppliers>[number]) {
    setEditingId(s.id);
    setForm({
      name: s.name, contactName: s.contactName ?? "", email: s.email ?? "",
      phone: s.phone ?? "", address: s.address ?? "", category: s.category ?? "", notes: s.notes ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) { toast({ title: "اسم المورد مطلوب", variant: "destructive" }); return; }
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
        { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setDialogOpen(false); toast({ title: "تم تحديث المورد" }); } }
      );
    } else {
      createMutation.mutate(
        { data },
        { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setDialogOpen(false); toast({ title: "تمت إضافة المورد" }); } }
      );
    }
  }

  function handleDelete() {
    if (deleteId == null) return;
    deleteMutation.mutate(
      { id: deleteId },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setDeleteId(null); toast({ title: "تم حذف المورد" }); } }
    );
  }

  // ── Category management ────────────────────────────────────────────────────
  function openAddCat() {
    setEditingCatId(null);
    setCatForm({ name: "", color: PALETTE[0], description: "" });
  }

  function openEditCat(cat: SupplierCategory) {
    setEditingCatId(cat.id);
    setCatForm({ name: cat.name, color: cat.color, description: cat.description ?? "" });
  }

  async function handleCatSubmit() {
    if (!catForm.name.trim()) { toast({ title: "اسم التصنيف مطلوب", variant: "destructive" }); return; }
    if (editingCatId != null) {
      await updateCat(editingCatId, { name: catForm.name, color: catForm.color, description: catForm.description || undefined });
      toast({ title: "تم تحديث التصنيف" });
    } else {
      await createCat({ name: catForm.name, color: catForm.color, description: catForm.description || undefined });
      toast({ title: "تمت إضافة التصنيف" });
    }
    openAddCat();
  }

  async function handleDeleteCat() {
    if (deleteCatId == null) return;
    await deleteCat(deleteCatId);
    qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() });
    setDeleteCatId(null);
    toast({ title: "تم حذف التصنيف" });
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الموردون</h1>
          <p className="text-muted-foreground mt-1">إدارة شبكة الموردين والمتعاقدين</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { openAddCat(); setCatDialogOpen(true); }}>
            <Tags className="h-4 w-4 mr-2" />
            إدارة التصنيفات
          </Button>
          <Button onClick={openCreate} data-testid="button-create-supplier">
            <Plus className="h-4 w-4 mr-2" />
            إضافة مورد
          </Button>
        </div>
      </div>

      {/* ── Category chips filter ──────────────────────────────────────────── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${!categoryFilter ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted"}`}
          >
            الكل ({(suppliers ?? []).length})
          </button>
          {categories.map((cat) => {
            const count = (suppliers ?? []).filter((s) => s.category === cat.name).length;
            const isActive = categoryFilter === cat.name;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(isActive ? "" : cat.name)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors font-medium ${isActive ? "text-white border-transparent" : "border-border hover:opacity-80"}`}
                style={isActive ? { backgroundColor: cat.color, borderColor: cat.color } : { color: cat.color, borderColor: cat.color + "60" }}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="البحث باسم المورد أو البريد الإلكتروني أو المسؤول..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="input-search-suppliers"
        />
      </div>

      {/* ── Suppliers grid ────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">لا يوجد موردون</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {search || categoryFilter ? "لا توجد نتائج مطابقة للبحث" : "أضف أول مورد للبدء"}
          </p>
          {!search && !categoryFilter && (
            <Button size="sm" variant="outline" className="mt-3" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              إضافة مورد
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow" data-testid={`card-supplier-${s.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    {s.category && (
                      <div className="mt-1.5">
                        <CategoryBadge category={s.category} categories={categories} />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} data-testid={`button-edit-supplier-${s.id}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)} data-testid={`button-delete-supplier-${s.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm pt-0">
                {s.contactName && <p className="text-muted-foreground">المسؤول: {s.contactName}</p>}
                {s.email && <p className="text-muted-foreground truncate">{s.email}</p>}
                {s.phone && <p className="text-muted-foreground">{s.phone}</p>}
                {s.address && <p className="text-muted-foreground text-xs truncate">{s.address}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════════════════════ */}

      {/* مورد — إضافة/تعديل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل المورد" : "إضافة مورد جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الاسم *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-supplier-name" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>المسؤول / مندوب التواصل</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>التصنيف</Label>
                <Select value={form.category || "__none__"} onValueChange={(v) => setForm({ ...form, category: v === "__none__" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="بدون تصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون تصنيف</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <span className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    لا توجد تصنيفات بعد —{" "}
                    <button className="underline text-primary" onClick={() => { setDialogOpen(false); openAddCat(); setCatDialogOpen(true); }}>
                      أضف تصنيفات
                    </button>
                  </p>
                )}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-supplier">
              {editingId ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* إدارة التصنيفات */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              إدارة تصنيفات الموردين
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* form */}
            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">{editingCatId ? "تعديل التصنيف" : "إضافة تصنيف جديد"}</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الاسم *</Label>
                  <Input
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    placeholder="مثال: مواد بناء، كهرباء..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>اللون</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatForm({ ...catForm, color: c })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${catForm.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>وصف (اختياري)</Label>
                <Input
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  placeholder="وصف مختصر للتصنيف..."
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCatSubmit} disabled={isCreatingCat || isUpdatingCat}>
                  {editingCatId ? "تحديث" : "إضافة التصنيف"}
                </Button>
                {editingCatId && (
                  <Button size="sm" variant="outline" onClick={openAddCat}>إلغاء</Button>
                )}
              </div>
            </div>

            {/* list */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">التصنيفات الحالية ({categories.length})</p>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">لا توجد تصنيفات بعد. أضف أول تصنيف أعلاه.</p>
              ) : (
                <div className="divide-y rounded-md border overflow-hidden">
                  {categories.map((cat) => {
                    const supplierCount = (suppliers ?? []).filter((s) => s.category === cat.name).length;
                    return (
                      <div key={cat.id} className="flex items-center justify-between px-3 py-2.5 bg-background hover:bg-muted/30">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{cat.name}</p>
                            {cat.description && <p className="text-xs text-muted-foreground truncate">{cat.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{supplierCount} مورد</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditCat(cat)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setDeleteCatId(cat.id)}
                            disabled={supplierCount > 0}
                            title={supplierCount > 0 ? "لا يمكن حذف تصنيف مرتبط بموردين" : "حذف"}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حذف مورد */}
      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المورد؟</AlertDialogTitle>
            <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* حذف تصنيف */}
      <AlertDialog open={deleteCatId != null} onOpenChange={(o) => !o && setDeleteCatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف التصنيف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا التصنيف نهائياً. الموردون المرتبطون به لن يتأثروا.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCat}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
