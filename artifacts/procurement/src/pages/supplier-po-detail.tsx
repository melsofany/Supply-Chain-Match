import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSupplierPo,
  useUpdateSupplierPo,
  getGetSupplierPoQueryKey,
  getListSupplierPosQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

export default function SupplierPoDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: po, isLoading } = useGetSupplierPo(numId, {
    query: { enabled: !!numId, queryKey: getGetSupplierPoQueryKey(numId) },
  });

  const updatePo = useUpdateSupplierPo();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/supplier-pos")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{po.poNumber ?? `Supplier PO #${po.id}`}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {po.supplierName ?? `Supplier #${po.supplierId}`} • {new Date(po.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[po.status] ?? ""}`}>
          {po.status}
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label className="text-xs text-muted-foreground">Total Amount</Label>
              <p className="mt-1 font-semibold text-lg">
                {po.totalAmount != null ? `$${po.totalAmount.toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
          {po.customerPoId && (
            <div>
              <Label className="text-xs text-muted-foreground">Linked to Customer PO</Label>
              <p className="mt-1 text-sm">
                <a
                  href={`/customer-pos/${po.customerPoId}`}
                  className="text-primary hover:underline"
                >
                  Customer PO #{po.customerPoId}
                </a>
              </p>
            </div>
          )}
          {po.notes && (
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <p className="mt-1 text-sm">{po.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
