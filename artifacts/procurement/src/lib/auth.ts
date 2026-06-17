const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  roleId: number;
  roleName: string;
  roleLabel: string;
  permissions: Record<string, PermSet>;
}

export interface PermSet {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export const MODULES: { key: string; label: string }[] = [
  { key: "inquiries",     label: "الاستفسارات" },
  { key: "quotations",    label: "عروض الأسعار" },
  { key: "customer_pos",  label: "أوامر شراء العملاء" },
  { key: "supplier_pos",  label: "أوامر شراء الموردين" },
  { key: "delivery_notes",label: "أذون التسليم" },
  { key: "invoices",      label: "الفواتير" },
  { key: "customers",     label: "العملاء" },
  { key: "suppliers",     label: "الموردون" },
  { key: "accounting",    label: "المحاسبة" },
  { key: "reports",       label: "التقارير" },
  { key: "users",         label: "إدارة المستخدمين" },
];

const TOKEN_KEY = "procurement_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiLogin(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: "فشل تسجيل الدخول" }));
    throw new Error(err.error ?? "فشل تسجيل الدخول");
  }
  return r.json();
}

export async function apiMe(): Promise<AuthUser> {
  const r = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders() });
  if (!r.ok) throw new Error("Unauthorized");
  return r.json();
}

export function hasPerm(user: AuthUser | null, module: string, action: keyof PermSet): boolean {
  if (!user) return false;
  if (user.roleName === "admin") return true;
  return user.permissions[module]?.[action] ?? false;
}
