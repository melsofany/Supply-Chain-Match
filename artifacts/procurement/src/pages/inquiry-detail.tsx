import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInquiry,
  useUpdateInquiry,
  useAddInquiryItem,
  useUpdateInquiryItem,
  useDeleteInquiryItem,
  useCreateQuotation,
  getGetInquiryQueryKey,
  getListInquiriesQueryKey,
  getListQuotationsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  quoted: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

export default function InquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const numId = Number(id);

  const { data: inquiry, isLoading } = useGetInquiry(numId, {
    query: { enabled: !!numId, queryKey: getGetInquiryQueryKey(numId) },
  });

  const updateInquiry = useUpdateInquiry();
  const addItem = useAddInquiryItem();
  const updateItem = useUpdateInquiryItem();
  const deleteItem = useDeleteInquiryItem();
  const createQuotation = useCreateQuotation();

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ description: "", quantity: "", unit: "", notes: "" });

  function openAddItem() {
    setEditingItemId(null);
    setItemForm({ description: "", quantity: "", unit: "", notes: "" });
    setItemDialogOpen(true);
  }

  function openEditItem(item: NonNullable<typeof inquiry>["items"][number]) {
    setEditingItemId(item.id);
    setItemForm({
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit ?? "",
      notes: item.notes ?? "",
    });
    setItemDialogOpen(true);
  }

  function handleItemSubmit() {
    if (!itemForm.description.trim() || !itemForm.quantity) {
      toast({ title: "Description and quantity are required", variant: "destructive" });
      return;
    }
    const data = {
      description: itemForm.description,
      quantity: Number(itemForm.quantity),
      ...(itemForm.unit && { unit: itemForm.unit }),
      ...(itemForm.notes && { notes: itemForm.notes }),
    };

    if (editingItemId != null) {
      updateItem.mutate(
        { id: numId, itemId: editingItemId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
            setItemDialogOpen(false);
            toast({ title: "Item updated" });
          },
        }
      );
    } else {
      addItem.mutate(
        { id: numId, data },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
            setItemDialogOpen(false);
            toast({ title: "Item added" });
          },
        }
      );
    }
  }

  function handleDeleteItem() {
    if (deleteItemId == null) return;
    deleteItem.mutate(
      { id: numId, itemId: deleteItemId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
          setDeleteItemId(null);
          toast({ title: "Item deleted" });
        },
      }
    );
  }

  function handleStatusChange(status: string) {
    updateInquiry.mutate(
      { id: numId, data: { status: status as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetInquiryQueryKey(numId) });
          qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
          toast({ title: "Status updated" });
        },
      }
    );
  }

  function handleCreateQuotation() {
    if (!inquiry) return;
    createQuotation.mutate(
      { data: { inquiryId: numId, customerId: inquiry.customerId, status: "draft" } },
      {
        onSuccess: (newQ) => {
          qc.invalidateQueries({ queryKey: getListQuotationsQueryKey() });
          toast({ title: "Quotation created" });
          setLocation(`/quotations/${newQ.id}`);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Inquiry not found.</p>
        <Button variant="link" onClick={() => setLocation("/inquiries")}>
          Back to Inquiries
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/inquiries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{inquiry.title}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {inquiry.customerName ?? `Customer #${inquiry.customerId}`} •{" "}
            {new Date(inquiry.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={inquiry.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36" data-testid="select-inquiry-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="quoted">Quoted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleCreateQuotation}
            disabled={createQuotation.isPending}
            data-testid="button-create-quotation-from-inquiry"
          >
            <FileText className="h-4 w-4 mr-2" />
            Create Quotation
          </Button>
        </div>
      </div>

      {inquiry.description && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {inquiry.description}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Items Needed</CardTitle>
          <Button size="sm" onClick={openAddItem} data-testid="button-add-item">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {inquiry.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No items yet. Add what the customer needs.
            </p>
          ) : (
            <div className="divide-y">
              {inquiry.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3"
                  data-testid={`row-item-${item.id}`}
                >
                  <div>
                    <p className="text-sm font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Qty: {item.quantity} {item.unit ?? ""}
                      {item.notes && ` • ${item.notes}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditItem(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteItemId(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItemId ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                data-testid="input-item-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={itemForm.quantity}
                  onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                  data-testid="input-item-quantity"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  placeholder="pcs, kg, m..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={itemForm.notes}
                onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleItemSubmit}
              disabled={addItem.isPending || updateItem.isPending}
              data-testid="button-submit-item"
            >
              {editingItemId ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteItemId != null} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
