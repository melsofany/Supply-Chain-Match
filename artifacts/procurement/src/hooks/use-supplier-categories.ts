import { useState, useEffect, useCallback } from "react";
import { customFetch } from "@workspace/api-client-react";

export interface SupplierCategory {
  id: number;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
}

export function useSupplierCategories() {
  const [data, setData] = useState<SupplierCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const json = await customFetch<SupplierCategory[]>("/api/supplier-categories");
      setData(json);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, isLoading, refetch: fetchData };
}

export function useCreateSupplierCategory(onSuccess: () => void) {
  const [isCreating, setIsCreating] = useState(false);
  async function create(body: { name: string; color: string; description?: string }) {
    setIsCreating(true);
    try {
      await customFetch("/api/supplier-categories", {
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

export function useUpdateSupplierCategory(onSuccess: () => void) {
  const [isUpdating, setIsUpdating] = useState(false);
  async function update(id: number, body: { name?: string; color?: string; description?: string }) {
    setIsUpdating(true);
    try {
      await customFetch(`/api/supplier-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onSuccess();
    } finally {
      setIsUpdating(false);
    }
  }
  return { update, isUpdating };
}

export function useDeleteSupplierCategory(onSuccess: () => void) {
  const [isDeleting, setIsDeleting] = useState(false);
  async function remove(id: number) {
    setIsDeleting(true);
    try {
      await customFetch(`/api/supplier-categories/${id}`, { method: "DELETE" });
      onSuccess();
    } finally {
      setIsDeleting(false);
    }
  }
  return { remove, isDeleting };
}
