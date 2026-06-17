import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { authHeaders, MODULES, type PermSet } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Shield, Plus, Pencil, Trash2, Eye, EyeOff, CheckCircle2, XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface UserRow {
  id: number; email: string; name: string; roleId: number;
  roleName: string; roleLabel: string; isActive: boolean; createdAt: string;
}
interface Permission {
  id?: number; roleId?: number; module: string;
  canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean;
}
interface Role { id: number; name: string; label: string; isSystem: boolean; permissions: Permission[]; }

const PERM_KEYS: { key: keyof PermSet; label: string; color: string }[] = [
  { key: "canView",    label: "عرض",   color: "text-blue-600" },
  { key: "canCreate",  label: "إنشاء", color: "text-green-600" },
  { key: "canEdit",    label: "تعديل", color: "text-yellow-600" },
  { key: "canDelete",  label: "حذف",   color: "text-red-600" },
  { key: "canApprove", label: "اعتماد",color: "text-purple-600" },
];

function emptyPerms(roleId: number): Permission[] {
  return MODULES.map((m) => ({ module: m.key, roleId, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false }));
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("users");

  // ── Users state ──
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userDialog, setUserDialog] = useState<{ open: boolean; editing?: UserRow }>({ open: false });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", roleId: "", isActive: true });
  const [showPass, setShowPass] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

  // ── Roles state ──
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; editing?: Role }>({ open: false });
  const [roleForm, setRoleForm] = useState({ name: "", label: "" });
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [permData, setPermData] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);

  async function loadUsers() {
    const r = await fetch(`${BASE}/api/users`, { headers: authHeaders() });
    if (r.ok) setUsers(await r.json());
  }
  async function loadRoles() {
    const r = await fetch(`${BASE}/api/roles`, { headers: authHeaders() });
    if (r.ok) setRoles(await r.json());
  }

  useEffect(() => { loadUsers(); loadRoles(); }, []);

  // ── User CRUD ──
  function openCreateUser() {
    setUserForm({ name: "", email: "", password: "", roleId: String(roles[0]?.id ?? ""), isActive: true });
    setUserDialog({ open: true });
  }
  function openEditUser(u: UserRow) {
    setUserForm({ name: u.name, email: u.email, password: "", roleId: String(u.roleId), isActive: u.isActive });
    setUserDialog({ open: true, editing: u });
  }
  async function saveUser() {
    setSaving(true);
    try {
      const body: any = { name: userForm.name, email: userForm.email, roleId: userForm.roleId, isActive: userForm.isActive };
      if (userForm.password) body.password = userForm.password;
      const editing = userDialog.editing;
      const r = await fetch(`${BASE}/api/users${editing ? `/${editing.id}` : ""}`, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); return; }
      toast({ title: editing ? "تم تحديث المستخدم" : "تم إنشاء المستخدم" });
      setUserDialog({ open: false });
      loadUsers();
    } finally { setSaving(false); }
  }
  async function confirmDeleteUser() {
    if (!deleteUser) return;
    await fetch(`${BASE}/api/users/${deleteUser.id}`, { method: "DELETE", headers: authHeaders() });
    toast({ title: "تم حذف المستخدم" });
    setDeleteUser(null);
    loadUsers();
  }

  // ── Role CRUD ──
  function openCreateRole() {
    setRoleForm({ name: "", label: "" });
    setRoleDialog({ open: true });
  }
  async function saveRole() {
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(roleForm),
      });
      if (!r.ok) { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); return; }
      toast({ title: "تم إنشاء الدور" });
      setRoleDialog({ open: false });
      await loadRoles();
    } finally { setSaving(false); }
  }
  async function confirmDeleteRole() {
    if (!deleteRole) return;
    const r = await fetch(`${BASE}/api/roles/${deleteRole.id}`, { method: "DELETE", headers: authHeaders() });
    if (!r.ok) { const e = await r.json(); toast({ title: e.error, variant: "destructive" }); setDeleteRole(null); return; }
    toast({ title: "تم حذف الدور" });
    setDeleteRole(null);
    if (permRole?.id === deleteRole.id) setPermRole(null);
    loadRoles();
  }

  // ── Permissions ──
  function openPermissions(role: Role) {
    setPermRole(role);
    const existing = new Map(role.permissions.map((p) => [p.module, p]));
    setPermData(MODULES.map((m) => {
      const p = existing.get(m.key);
      return { module: m.key, canView: !!p?.canView, canCreate: !!p?.canCreate, canEdit: !!p?.canEdit, canDelete: !!p?.canDelete, canApprove: !!p?.canApprove };
    }));
  }
  function togglePerm(module: string, key: keyof PermSet, val: boolean) {
    setPermData((prev) => prev.map((p) => p.module === module ? { ...p, [key]: val } : p));
  }
  function setAllForModule(module: string, val: boolean) {
    setPermData((prev) => prev.map((p) => p.module === module
      ? { ...p, canView: val, canCreate: val, canEdit: val, canDelete: val, canApprove: val } : p));
  }
  function setAllForPerm(key: keyof PermSet, val: boolean) {
    setPermData((prev) => prev.map((p) => ({ ...p, [key]: val })));
  }
  async function savePermissions() {
    if (!permRole) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/api/roles/${permRole.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ permissions: permData }),
      });
      if (!r.ok) { toast({ title: "فشل الحفظ", variant: "destructive" }); return; }
      toast({ title: "تم حفظ الصلاحيات" });
      await loadRoles();
    } finally { setSaving(false); }
  }

  if (me?.roleName !== "admin") {
    return (
      <div className="text-center py-20">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-lg font-semibold">غير مصرح</p>
        <p className="text-muted-foreground text-sm mt-1">هذه الصفحة للمديرين فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">إدارة المستخدمين والصلاحيات</h1>
        <p className="text-muted-foreground text-sm mt-0.5">إنشاء الحسابات وتحديد الأدوار والصلاحيات</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" />المستخدمون ({users.length})</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-4 w-4" />الأدوار والصلاحيات ({roles.length})</TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">المستخدمون</CardTitle>
              <Button size="sm" onClick={openCreateUser}><Plus className="h-4 w-4 mr-1.5" />مستخدم جديد</Button>
            </CardHeader>
            <CardContent className="pt-0">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا يوجد مستخدمون.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="text-right py-2 pr-3 font-medium">الاسم</th>
                        <th className="text-right py-2 pr-3 font-medium">البريد الإلكتروني</th>
                        <th className="text-right py-2 pr-3 font-medium">الدور</th>
                        <th className="text-right py-2 pr-3 font-medium">الحالة</th>
                        <th className="text-right py-2 pr-3 font-medium">تاريخ الإنشاء</th>
                        <th className="py-2 pr-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-muted/30">
                          <td className="py-3 pr-3 font-medium">{u.name}</td>
                          <td className="py-3 pr-3 text-muted-foreground text-sm">{u.email}</td>
                          <td className="py-3 pr-3">
                            <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{u.roleLabel}</span>
                          </td>
                          <td className="py-3 pr-3">
                            {u.isActive
                              ? <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="h-3.5 w-3.5" />نشط</span>
                              : <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" />موقوف</span>}
                          </td>
                          <td className="py-3 pr-3 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("ar-EG")}</td>
                          <td className="py-3 pr-3">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditUser(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => setDeleteUser(u)} disabled={u.email === "admin@system.local"}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ROLES TAB ── */}
        <TabsContent value="roles" className="mt-4">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Roles list */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">الأدوار</CardTitle>
                <Button size="sm" variant="outline" onClick={openCreateRole}><Plus className="h-4 w-4 mr-1" />جديد</Button>
              </CardHeader>
              <CardContent className="pt-0 space-y-1.5">
                {roles.map((r) => (
                  <div key={r.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${permRole?.id === r.id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                    onClick={() => openPermissions(r)}>
                    <div>
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted-foreground">{r.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {r.isSystem && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">نظام</span>}
                      {!r.isSystem && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteRole(r); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Permissions matrix */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {permRole ? `صلاحيات: ${permRole.label}` : "اختر دوراً لتعديل صلاحياته"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {!permRole ? (
                  <p className="text-sm text-muted-foreground text-center py-12">انقر على أحد الأدوار في القائمة</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-xs text-muted-foreground">
                            <th className="text-right py-2 pr-2 font-medium">الوحدة</th>
                            {PERM_KEYS.map((pk) => (
                              <th key={pk.key} className="text-center py-2 px-2 font-medium min-w-[56px]">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={pk.color}>{pk.label}</span>
                                  <Checkbox
                                    checked={permData.every((p) => p[pk.key])}
                                    onCheckedChange={(v) => setAllForPerm(pk.key, !!v)}
                                    className="h-3.5 w-3.5"
                                    title="تفعيل الكل"
                                  />
                                </div>
                              </th>
                            ))}
                            <th className="text-center py-2 px-2 font-medium text-xs">الكل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {permData.map((p) => {
                            const mod = MODULES.find((m) => m.key === p.module);
                            const allOn = PERM_KEYS.every((pk) => p[pk.key]);
                            return (
                              <tr key={p.module} className="hover:bg-muted/20">
                                <td className="py-2.5 pr-2">
                                  <span className="text-xs font-medium">{mod?.label ?? p.module}</span>
                                </td>
                                {PERM_KEYS.map((pk) => (
                                  <td key={pk.key} className="py-2.5 px-2 text-center">
                                    <Checkbox
                                      checked={p[pk.key]}
                                      onCheckedChange={(v) => togglePerm(p.module, pk.key, !!v)}
                                      className="h-4 w-4"
                                    />
                                  </td>
                                ))}
                                <td className="py-2.5 px-2 text-center">
                                  <Checkbox
                                    checked={allOn}
                                    onCheckedChange={(v) => setAllForModule(p.module, !!v)}
                                    className="h-4 w-4"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end mt-4 pt-3 border-t">
                      <Button onClick={savePermissions} disabled={saving}>
                        {saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog open={userDialog.open} onOpenChange={(o) => !o && setUserDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{userDialog.editing ? "تعديل مستخدم" : "مستخدم جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>الاسم *</Label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} placeholder="اسم المستخدم" />
            </div>
            <div className="space-y-1.5">
              <Label>البريد الإلكتروني *</Label>
              <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{userDialog.editing ? "كلمة مرور جديدة (اتركها فارغة إذا لم تريد التغيير)" : "كلمة المرور *"}</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="pl-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>الدور *</Label>
              <Select value={userForm.roleId} onValueChange={(v) => setUserForm({ ...userForm, roleId: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الدور..." /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="active" checked={userForm.isActive} onCheckedChange={(v) => setUserForm({ ...userForm, isActive: v })} />
              <Label htmlFor="active">حساب نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog({ open: false })}>إلغاء</Button>
            <Button onClick={saveUser} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={(o) => !o && setRoleDialog({ open: false })}>
        <DialogContent>
          <DialogHeader><DialogTitle>دور جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>المفتاح (بالإنجليزية، بدون مسافات) *</Label>
              <Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.toLowerCase().replace(/\s/g, "_") })} placeholder="custom_role" />
            </div>
            <div className="space-y-1.5">
              <Label>الاسم العربي *</Label>
              <Input value={roleForm.label} onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })} placeholder="مثال: مدير المبيعات" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialog({ open: false })}>إلغاء</Button>
            <Button onClick={saveRole} disabled={saving}>{saving ? "جارٍ الحفظ..." : "إنشاء"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف المستخدم</AlertDialogTitle><AlertDialogDescription>سيتم حذف "{deleteUser?.name}" نهائياً. هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteUser} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Role */}
      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف الدور</AlertDialogTitle><AlertDialogDescription>سيتم حذف "{deleteRole?.label}" وجميع صلاحياته. هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>إلغاء</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteRole} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
