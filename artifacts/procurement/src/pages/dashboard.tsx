import React from "react";
import { Link } from "wouter";
import { 
  Users, Building2, FileQuestion, FileText, ShoppingCart, Truck, Activity, TrendingUp, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useGetDashboardSummary, 
  useGetRecentActivity,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey
} from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary, error: summaryError } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  if (summaryError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
        <p className="text-muted-foreground">The API server might not be running or available.</p>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon, description, isLoading }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Pipeline overview and recent activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Inquiries"
          value={summary?.openInquiries ?? 0}
          icon={FileQuestion}
          description="Needs quotation"
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Pending Quotations"
          value={summary?.pendingQuotations ?? 0}
          icon={FileText}
          description="Waiting for approval"
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Active Customer POs"
          value={summary?.activeCustomerPos ?? 0}
          icon={ShoppingCart}
          description="To be fulfilled"
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Active Supplier POs"
          value={summary?.activeSupplierPos ?? 0}
          icon={Truck}
          description="Waiting for delivery"
          isLoading={isLoadingSummary}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={summary?.totalCustomers ?? 0}
          icon={Users}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Suppliers"
          value={summary?.totalSuppliers ?? 0}
          icon={Building2}
          isLoading={isLoadingSummary}
        />
        <Card className="lg:col-span-2 bg-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary-foreground/80" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-7 w-32 bg-primary-foreground/20" />
            ) : (
              <div className="text-3xl font-bold">
                ${(summary?.totalRevenue ?? 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates across all modules</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-6">
                {activity.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-start gap-4">
                    <div className="bg-muted p-2 rounded-full mt-0.5">
                      {item.type === "inquiry" && <FileQuestion className="h-4 w-4" />}
                      {item.type === "quotation" && <FileText className="h-4 w-4" />}
                      {item.type === "customer_po" && <ShoppingCart className="h-4 w-4" />}
                      {item.type === "supplier_po" && <Truck className="h-4 w-4" />}
                      {item.type === "customer" && <Users className="h-4 w-4" />}
                      {item.type === "supplier" && <Building2 className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No recent activity found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
