import { AppError } from "../middlewares/error.middleware";

interface SafeParseSchema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { message: string } };
}

export function validate<T>(schema: SafeParseSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new AppError(400, result.error.message);
  return result.data;
}

export function parseId(param: string | undefined): number {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) throw new AppError(400, "Invalid id");
  return id;
}

export function parseAmount(v: string | null | undefined): number | null {
  return v != null ? Number(v) : null;
}
