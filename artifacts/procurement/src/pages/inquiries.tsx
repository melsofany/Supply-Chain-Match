import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Plus, Search, FileQuestion, ChevronRight, Clock, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListInquiries,
  useListCustomers,
  useCreateInquiry,
  useDeleteInquiry,
  getListInquiriesQueryKey,
  getListCustomersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const STATUS_OPTS = [
  { value: "all", label: "كل الحالات" },
  { value: "new", label: "جديد" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "quoted", label: "تم التسعير" },
  { value: "closed", label: "مغلق" },
];

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
  const [form, setForm] = useState({
    customerId: "",
    inquiryNumber: "",
    title: "",
    buyerName: "",
    replyDeadline: "",
    description: "",
  });

  const filtered = (inquiries ?? []).filter((i) => {
    const q = search.toLowerCase();
    const matchSearch =
      i.title.toLowerCase().includes(q) ||
      (i.customerName ?? "").toLowerCase().includes(q) ||
      (i.inquiryNumber ?? "").toLowerCase().includes(q) ||
      (i.buyerName ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Sort: newest first, then by reply deadline urgency
  const sorted = [...filtered].sort((a, b) => {
    // urgent items (close deadline) first among same-status
    if (a.replyDeadline && b.replyDeadline) {
      return new Date(a.replyDeadline).getTime() - new Date(b.replyDeadline).getTime();
    }
    if (a.replyDeadline) return -1;
    if (b.replyDeadline) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function handleCreate() {
    if (!form.customerId || !form.title.trim()) {
      toast({ title: "العميل والموضوع مطلوبان", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          customerId: Number(form.customerId),
          title: form.title,
          ...(form.inquiryNumber && { inquiryNumber: form.inquiryNumber }),
          ...(form.buyerName && { buyerName: form.buyerName }),
          ...(form.replyDeadline && { replyDeadline: form.replyDeadline }),
          ...(form.description && { description: form.description }),
          status: "new",
        },
      },
      {
        onSuccess: (newInquiry) => {
          qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
          setDialogOpen(false);
          setForm({ customerId: "", inquiryNumber: "", title: "", buyerName: "", replyDeadline: "", description: "" });
          toast({ title: "تم إنشاء طلب التسعير" });
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
          toast({ title: "تم حذف طلب التسعير" });
        },
      }
    );
  }

  function isDeadlineUrgent(deadline: string | null | undefined) {
    if (!deadline) return false;
    const diff = new Date(deadline).getTime() - Date.now();
    return diff >= 0 && diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
  }

  function isDeadlinePassed(deadline: string | null | undefined) {
    if (!deadline) return false;
    return new Date(deadline).getTime() < Date.now();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">طلبات التسعير</h1>
          <p className="text-muted-foreground mt-1">طلبات التسعير الواردة من العملاء</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-create-inquiry">
          <Plus className="h-4 w-4 mr-2" />
          طلب تسعير جديد
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="بحث بالموضوع، العميل، رقم الطلب، اسم المشتري..."
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
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">لا توجد طلبات تسعير</h3>
          <p className="text-muted-foreground text-sm mt-1">
            {search ? "جرّب كلمة بحث أخرى" : "أنشئ طلب تسعير عند ورود طلب من العميل"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((inq) => {
            const urgent = isDeadlineUrgent(inq.replyDeadline);
            const passed = isDeadlinePassed(inq.replyDeadline);
            return (
              <Card
                key={inq.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${urgent ? "border-amber-300" : passed && inq.status !== "quoted" && inq.status !== "closed" ? "border-red-300" : ""}`}
                data-testid={`card-inquiry-${inq.id}`}
              >
                <Link href={`/inquiries/${inq.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="bg-muted rounded-md p-2 mt-0.5 flex-shrink-0">
                          <FileQuestion className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{inq.title}</p>
                            {inq.inquiryNumber && (
                              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                #{inq.inquiryNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {inq.customerName ?? `عميل #${inq.customerId}`}
                            </span>
                            {inq.buyerName && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {inq.buyerName}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(inq.createdAt).toLocaleDateString("ar-EG")}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {inq.items.length} بند{inq.items.length !== 1 ? "" : ""}
                            </span>
                          </div>
                          {inq.replyDeadline && (
                            <div className={`flex items-center gap-1 mt-1 text-xs ${passed && inq.status !== "quoted" && inq.status !== "closed" ? "text-red-600 font-medium" : urgent ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>
                              <Clock className="h-3 w-3" />
                              آخر رد: {new Date(inq.replyDeadline).toLocaleDateString("ar-EG")}
                              {passed && inq.status !== "quoted" && inq.status !== "closed" && " — تجاوز الموعد"}
                              {urgent && !passed && " — قريب"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${INQUIRY_STATUS_COLORS[inq.status] ?? "bg-gray-100"}`}
                        >
                          {INQUIRY_STATUS_LABELS[inq.status] ?? inq.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── نموذج إنشاء طلب تسعير ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>طلب تسعير جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>العميل *</Label>
                <Select
                  value={form.customerId}
                  onValueChange={(v) => setForm({ ...form, customerId: v })}
                >
                  <SelectTrigger data-testid="select-inquiry-customer">
                    <SelectValue placeholder="اختر العميل..." />
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
                <Label>رقم الطلب</Label>
                <Input
                  value={form.inquiryNumber}
                  onChange={(e) => setForm({ ...form, inquiryNumber: e.target.value })}
                  placeholder="RFQ-2024-001"
                  data-testid="input-inquiry-number"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>موضوع الطلب *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="وصف مختصر لما يحتاجه العميل"
                data-testid="input-inquiry-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>اسم المشتري / المسؤل</Label>
                <Input
                  value={form.buyerName}
                  onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
                  placeholder="اسم الموظف المسؤل"
                />
              </div>
              <div className="space-y-1.5">
                <Label>آخر تاريخ للرد</Label>
                <Input
                  type="date"
                  value={form.replyDeadline}
                  onChange={(e) => setForm({ ...form, replyDeadline: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات عامة</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="ملاحظات إضافية..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              data-testid="button-submit-inquiry"
            >
              إنشاء وإضافة البنود
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف طلب التسعير؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الطلب وجميع بنوده نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
