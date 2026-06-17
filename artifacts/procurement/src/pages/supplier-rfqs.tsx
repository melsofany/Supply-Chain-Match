import { useState } from "react";
import { Link } from "wouter";
import { Search, Send, ChevronRight, Clock, CheckCircle, XCircle, FileQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAllSupplierRfqs } from "@/hooks/use-supplier-rfqs";

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:   { label: "معلق",          className: "bg-gray-100 text-gray-700",   icon: <Clock className="h-3 w-3" /> },
  sent:      { label: "أُرسل للمورد",  className: "bg-blue-100 text-blue-700",   icon: <Send className="h-3 w-3" /> },
  received:  { label: "استُلم الرد",   className: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
  cancelled: { label: "ملغي",          className: "bg-red-100 text-red-700",     icon: <XCircle className="h-3 w-3" /> },
};

export default function SupplierRfqs() {
  const { data: rfqs, isLoading } = useAllSupplierRfqs();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = (rfqs ?? []).filter((r) => {
    const matchSearch =
      (r.rfqNumber ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.supplierName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.inquiryTitle ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">عروض أسعار الموردين</h1>
        <p className="text-muted-foreground mt-1">طلبات التسعير المرسلة للموردين وردودهم</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="بحث باسم المورد أو رقم الطلب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="sent">أُرسل</option>
          <option value="received">استُلم الرد</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold">لا توجد عروض أسعار</h3>
          <p className="text-muted-foreground text-sm mt-1">
            يتم إنشاء عروض أسعار الموردين من صفحة تفاصيل الاستفسار
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <Link href={`/supplier-rfqs/${r.id}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-muted rounded-md p-2 mt-0.5">
                        <FileQuestion className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {r.rfqNumber ?? `طلب تسعير #${r.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.supplierName ?? `مورد #${r.supplierId}`}
                          {r.inquiryTitle && <span> • {r.inquiryTitle}</span>}
                          <span> • {new Date(r.createdAt).toLocaleDateString("ar-EG")}</span>
                        </p>
                        {r.quotedPrice != null && (
                          <p className="text-xs font-medium text-green-700 mt-0.5">
                            السعر المعروض: {Number(r.quotedPrice).toLocaleString()} $
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.className}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
