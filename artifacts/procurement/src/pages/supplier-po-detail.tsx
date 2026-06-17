import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Shield, Settings2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSupplierPo,
  useUpdateSupplierPo,
  useGetPoAnalysis,
  getGetSupplierPoQueryKey,
  getListSupplierPosQueryKey,
  getGetPoAnalysisQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  confirmed: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
};

const fmt = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SupplierPoDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: po, isLoading } = useGetSupplierPo(numId, {
    query: { enabled: !!numId, queryKey: getGetSupplierPoQueryKey(numId) },
  });
  const { data: analysis, isLoading: isLoadingAnalysis } = useGetPoAnalysis(numId, {
    query: { enabled: !!numId, queryKey: getGetPoAnalysisQueryKey(numId) },
  });

  const updatePo = useUpdateSupplierPo();

  const [editingCosts, setEditingCosts] = useState(false);
  const [costForm, setCostForm] = useState({ taxInsuranceRate: "", operatingCost: "" });

  function handleStatusChange(status: string) {
    updatePo.mutate(
      { id: numId, data: { status: status as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSupplierPoQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListSupplierPosQueryKey() });
          toast({ title: "Status updated" });
        },
      }
    );
  }

  function openEditCosts() {
    if (!po) return;
    setCostForm({
      taxInsuranceRate: String(Number(po.taxInsuranceRate) * 100),
      operatingCost: String(po.operatingCost ?? 0),
    });
    setEditingCosts(true);
  }

  function saveCosts() {
    const rate = Number(costForm.taxInsuranceRate) / 100;
    const opCost = Number(costForm.operatingCost);
    if (isNaN(rate) || isNaN(opCost)) {
      toast({ title: "Invalid values", variant: "destructive" });
      return;
    }
    updatePo.mutate(
      { id: numId, data: { taxInsuranceRate: rate, operatingCost: opCost } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSupplierPoQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getGetPoAnalysisQueryKey(numId) });
          setEditingCosts(false);
          toast({ title: "Costs updated" });
        },
      }
    );
  }

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!po) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Supplier PO not found.</p>
        <Button variant="link" onClick={() => setLocation("/supplier-pos")}>Back to Supplier POs</Button>
      </div>
    );
  }

  const grossCost = po.totalAmount ?? 0;
  const taxInsuranceRate = Number(po.taxInsuranceRate);
  const operatingCost = Number(po.operatingCost);
  const taxInsuranceAmount = Math.round(grossCost * taxInsuranceRate * 100) / 100;
  const totalCost = Math.round((grossCost + taxInsuranceAmount + operatingCost) * 100) / 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/supplier-pos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{po.poNumber ?? `Supplier PO #${po.id}`}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {po.supplierName ?? `Supplier #${po.supplierId}`} • {new Date(po.createdAt).toLocaleDateString()}
            {po.customerPoId && (
              <span className="ml-2">
                • Linked to{" "}
                <a href={`/customer-pos/${po.customerPoId}`} className="text-primary hover:underline">
                  Customer PO #{po.customerPoId}
                </a>
              </span>
            )}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[po.status] ?? ""}`}>
          {po.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status & Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={po.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="mt-1" data-testid="select-supplier-po-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Supplier Amount</Label>
              <p className="mt-1 text-2xl font-bold">{grossCost > 0 ? fmt(grossCost) : "—"}</p>
              <p className="text-xs text-muted-foreground">Before tax, insurance & operating costs</p>
            </div>
            {po.notes && (
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <p className="mt-1 text-sm">{po.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Cost Breakdown</CardTitle>
              <CardDescription>Tax, insurance & operating costs</CardDescription>
            </div>
            {!editingCosts ? (
              <Button variant="outline" size="sm" onClick={openEditCosts}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingCosts(false)}>Cancel</Button>
                <Button size="sm" onClick={saveCosts} disabled={updatePo.isPending}>Save</Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editingCosts ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Tax & Insurance Rate (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={costForm.taxInsuranceRate}
                      onChange={(e) => setCostForm({ ...costForm, taxInsuranceRate: e.target.value })}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">% (default: 3%)</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Operating Cost ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costForm.operatingCost}
                    onChange={(e) => setCostForm({ ...costForm, operatingCost: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Supplier Amount</span>
                  <span className="font-medium">{fmt(grossCost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Shield className="h-3.5 w-3.5" />
                    Tax & Insurance ({(taxInsuranceRate * 100).toFixed(1)}%)
                  </span>
                  <span className="font-medium text-orange-600">+{fmt(taxInsuranceAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Settings2 className="h-3.5 w-3.5" />
                    Operating Costs
                  </span>
                  <span className="font-medium text-blue-600">+{fmt(operatingCost)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Cost</span>
                  <span className="text-xl font-bold">{fmt(totalCost)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* P&L Analysis */}
      {isLoadingAnalysis ? (
        <Skeleton className="h-32 w-full" />
      ) : analysis ? (
        <Card className={
          analysis.profit != null
            ? analysis.profit >= 0
              ? "border-green-200 bg-green-50/40"
              : "border-red-200 bg-red-50/40"
            : ""
        }>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {analysis.profit != null && analysis.profit >= 0
                ? <TrendingUp className="h-4 w-4 text-green-600" />
                : <TrendingDown className="h-4 w-4 text-red-600" />
              }
              P&L Analysis
            </CardTitle>
            <CardDescription>
              Linked to{" "}
              {analysis.customerPoId ? (
                <a href={`/customer-pos/${analysis.customerPoId}`} className="text-primary hover:underline">
                  {analysis.customerPoNumber ?? `Customer PO #${analysis.customerPoId}`}
                </a>
              ) : "no customer PO yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.revenue == null ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>No linked customer PO — P&L unavailable. Link a customer PO to see profit.</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                  <p className="text-xl font-bold text-green-600">{fmt(analysis.revenue)}</p>
                  <p className="text-xs text-muted-foreground">Customer paid</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                  <p className="text-xl font-bold text-red-600">{fmt(analysis.totalCost)}</p>
                  <p className="text-xs text-muted-foreground">Supplier + tax + ops</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                  <p className={`text-xl font-bold ${(analysis.profit ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(analysis.profit ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Margin: {analysis.profitMargin != null ? `${analysis.profitMargin.toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
