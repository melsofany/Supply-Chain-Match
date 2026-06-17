import { useState, useEffect, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";

export interface SupplierRfq {
  id: number;
  inquiryId: number;
  inquiryTitle: string | null;
  supplierId: number;
  supplierName: string | null;
  rfqNumber: string | null;
  status: "pending" | "sent" | "received" | "cancelled";
  quotedPrice: number | null;
  notes: string | null;
  createdAt: string;
}

export interface RfqComparisonItem {
  id: number;
  description: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
}

export interface RfqComparisonRfq {
  id: number;
  supplierId: number;
  supplierName: string | null;
  rfqNumber: string | null;
  status: string;
}

export interface RfqComparisonPrice {
  id: number;
  rfqId: number;
  inquiryItemId: number;
  quotedPrice: number | null;
  notes: string | null;
}

export interface RfqComparison {
  items: RfqComparisonItem[];
  rfqs: RfqComparisonRfq[];
  prices: RfqComparisonPrice[];
}

export function useSupplierRfqsByInquiry(inquiryId: number) {
  const [data, setData] = useState<SupplierRfq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!inquiryId) return;
    setIsLoading(true);
    try {
      const json = await customFetch<SupplierRfq[]>(`/api/supplier-rfqs/by-inquiry/${inquiryId}`);
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}

export function useRfqComparison(inquiryId: number) {
  const [data, setData] = useState<RfqComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!inquiryId) return;
    setIsLoading(true);
    try {
      const json = await customFetch<RfqComparison>(
        `/api/supplier-rfqs/by-inquiry/${inquiryId}/comparison`
      );
      setData(json);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, refetch: fetchData };
}

export function useSupplierRfq(id: number) {
  const [data, setData] = useState<SupplierRfq | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const json = await customFetch<SupplierRfq>(`/api/supplier-rfqs/${id}`);
      setData(json);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, mutate: fetchData };
}

export function useCreateSupplierRfq(onSuccess: () => void) {
  const [isCreating, setIsCreating] = useState(false);

  async function create(body: {
    inquiryId: number;
    supplierId: number;
    rfqNumber?: string;
    notes?: string;
  }) {
    setIsCreating(true);
    try {
      await customFetch<SupplierRfq>("/api/supplier-rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSuccess();
    } finally {
      setIsCreating(false);
    }
  }

  return { create, isCreating };
}

export function useUpdateSupplierRfq(id: number, refetch: () => void) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function update(
    body: Partial<{ status: string; quotedPrice: number; rfqNumber: string; notes: string }>,
    callbacks?: { onSuccess?: () => void }
  ) {
    setIsUpdating(true);
    try {
      await customFetch<SupplierRfq>(`/api/supplier-rfqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await refetch();
      callbacks?.onSuccess?.();
    } finally {
      setIsUpdating(false);
    }
  }

  return { update, isUpdating };
}

export function useDeleteSupplierRfq(onSuccess: () => void) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function remove(id: number) {
    setIsDeleting(true);
    try {
      await customFetch(`/api/supplier-rfqs/${id}`, { method: "DELETE" });
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }

  return { remove, isDeleting };
}

export function useUpsertRfqItems(rfqId: number, onSuccess: () => void) {
  const [isSaving, setIsSaving] = useState(false);

  async function save(
    items: { inquiryItemId: number; quotedPrice: number | null; notes?: string }[]
  ) {
    setIsSaving(true);
    try {
      await customFetch(`/api/supplier-rfqs/${rfqId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      onSuccess();
    } finally {
      setIsSaving(false);
    }
  }

  return { save, isSaving };
}

export function useCreateQuotationFromRfqs(inquiryId: number) {
  const [isCreating, setIsCreating] = useState(false);

  async function create(
    selections: {
      inquiryItemId: number;
      supplierId: number | null;
      unitPrice: number;
      rfqId: number | null;
    }[]
  ) {
    setIsCreating(true);
    try {
      const result = await customFetch<{ id: number; quotationNumber: string | null }>(
        `/api/inquiries/${inquiryId}/quotation-from-rfqs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selections }),
        }
      );
      return result;
    } finally {
      setIsCreating(false);
    }
  }

  return { create, isCreating };
}
