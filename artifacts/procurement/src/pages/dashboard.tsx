import React from "react";
import { Link } from "wouter";
import {
  Users, Building2, FileQuestion, FileText, ShoppingCart, Truck,
  Activity, TrendingUp, AlertCircle, ArrowUpRight, ArrowDownRight,
  Clock, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";

const BRAND_BLUE   = "#1e6fa8";
const BRAND_ORANGE = "#f97316";

const ACTIVITY_ICONS: Record<string, React.ComponentType<any>> = {
  inquiry:     FileQuestion,
  quotation:   FileText,
  customer_po: ShoppingCart,
  supplier_po: Truck,
  customer:    Users,
  supplier:    Building2,
};

interface KpiDef {
  key: keyof ReturnType<typeof useSummaryData>;
  title: string;
  sub: string;
  icon: React.ComponentType<any>;
  accent: "blue" | "orange";
}

function useSummaryData() {
  return { openInquiries: 0, pendingQuotations: 0, activeCustomerPos: 0, activeSupplierPos: 0, totalCustomers: 0, totalSuppliers: 0, totalRevenue: 0 };
}

const KPI_CARDS: KpiDef[] = [
  { key: "openInquiries",     title: "الاستفسارات المفتوحة",  sub: "تحتاج إلى عرض سعر",    icon: FileQuestion, accent: "blue" },
  { key: "pendingQuotations", title: "عروض الأسعار المعلقة", sub: "بانتظار الاعتماد",       icon: FileText,     accent: "orange" },
  { key: "activeCustomerPos", title: "أوامر شراء العملاء",   sub: "قيد التنفيذ",            icon: ShoppingCart, accent: "blue" },
  { key: "activeSupplierPos", title: "أوامر شراء الموردين",  sub: "بانتظار الاستلام",       icon: Truck,        accent: "orange" },
];

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary, error: summaryError } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() },
  });

  if (summaryError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">تعذّر تحميل لوحة التحكم</h2>
        <p className="text-muted-foreground text-sm">تأكد من تشغيل خادم API أو أعد المحاولة.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map(({ key, title, sub, icon: Icon, accent }) => {
          const value = (summary as any)?.[key] ?? 0;
          return (
            <Card
              key={key}
              className="border-0 shadow-sm overflow-hidden"
              style={{ borderTop: `3px solid ${accent === "blue" ? BRAND_BLUE : BRAND_ORANGE}` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
                    {isLoadingSummary ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold text-slate-800">{value}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                  </div>
                  <div
                    className="p-2.5 rounded-xl"
                    style={{
                      background: accent === "blue" ? "#dbeafe" : "#ffedd5",
                      color: accent === "blue" ? BRAND_BLUE : BRAND_ORANGE,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Second row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-slate-100">
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
              {isLoadingSummary ? <Skeleton className="h-7 w-12 mt-1" /> : (
                <p className="text-2xl font-bold text-slate-800">{summary?.totalCustomers ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Suppliers */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الموردين</p>
              {isLoadingSummary ? <Skeleton className="h-7 w-12 mt-1" /> : (
                <p className="text-2xl font-bold text-slate-800">{summary?.totalSuppliers ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue — spans 2 cols */}
        <Card
          className="lg:col-span-2 border-0 shadow-sm text-white overflow-hidden"
          style={{ background: `linear-gradient(to left, #154d75, ${BRAND_BLUE})` }}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">إجمالي الإيرادات</p>
              {isLoadingSummary ? (
                <Skeleton className="h-9 w-36 mt-1 bg-white/20" />
              ) : (
                <p className="text-3xl font-bold mt-1">
                  {(summary?.totalRevenue ?? 0).toLocaleString("ar-EG")} ج.م
                </p>
              )}
            </div>
            <div className="p-3 rounded-xl bg-white/15">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 border-b" style={{ borderColor: "#f1f5f9" }}>
          <CardTitle className="flex items-center gap-2 text-base text-slate-800">
            <Activity className="h-4 w-4" style={{ color: BRAND_BLUE }} />
            آخر الأنشطة
          </CardTitle>
          <CardDescription>أحدث التحديثات عبر جميع الوحدات</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoadingActivity ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : activity && activity.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {activity.map((item) => {
                const Icon = ACTIVITY_ICONS[item.type] ?? Activity;
                return (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-4 py-3">
                    <div
                      className="p-2 rounded-full shrink-0"
                      style={{ background: "#dbeafe", color: BRAND_BLUE }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto opacity-20 mb-2" />
              <p className="text-sm">لا توجد أنشطة حديثة بعد.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
