import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, rolesTable, rolePermissionsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// GET /api/users
router.get("/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, roleId: usersTable.roleId, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable);
  const roles = await db.select().from(rolesTable);
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  res.json(users.map((u) => ({ ...u, roleName: roleMap.get(u.roleId)?.name ?? "", roleLabel: roleMap.get(u.roleId)?.label ?? "" })));
});

// POST /api/users
router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const { email, password, name, roleId, isActive = true } = req.body ?? {};
  if (!email || !password || !name || !roleId) { res.status(400).json({ error: "جميع الحقول مطلوبة" }); return; }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [user] = await db.insert(usersTable).values({ email: email.toLowerCase().trim(), passwordHash, name, roleId: Number(roleId), isActive }).returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, roleId: usersTable.roleId, isActive: usersTable.isActive });
    res.status(201).json(user);
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" }); return; }
    throw e;
  }
});

// PUT /api/users/:id
router.put("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { email, password, name, roleId, isActive } = req.body ?? {};
  const updates: any = {};
  if (email) updates.email = email.toLowerCase().trim();
  if (name) updates.name = name;
  if (roleId) updates.roleId = Number(roleId);
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 12);
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "لا توجد بيانات للتحديث" }); return; }
  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning({ id: usersTable.id, email: usersTable.email, name: usersTable.name, roleId: usersTable.roleId, isActive: usersTable.isActive });
  if (!updated) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
  res.json(updated);
});

// DELETE /api/users/:id
router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

// GET /api/roles
router.get("/roles", requireAuth, async (_req, res): Promise<void> => {
  const roles = await db.select().from(rolesTable);
  const perms = await db.select().from(rolePermissionsTable);
  const permsByRole = new Map<number, typeof perms>();
  for (const p of perms) {
    const arr = permsByRole.get(p.roleId) ?? [];
    arr.push(p);
    permsByRole.set(p.roleId, arr);
  }
  res.json(roles.map((r) => ({ ...r, permissions: permsByRole.get(r.id) ?? [] })));
});

// POST /api/roles
router.post("/roles", requireAdmin, async (req, res): Promise<void> => {
  const { name, label } = req.body ?? {};
  if (!name || !label) { res.status(400).json({ error: "الاسم والوصف مطلوبان" }); return; }
  const [role] = await db.insert(rolesTable).values({ name, label }).returning();
  res.status(201).json(role);
});

// PUT /api/roles/:id/permissions
router.put("/roles/:id/permissions", requireAdmin, async (req, res): Promise<void> => {
  const roleId = Number(req.params.id);
  const { permissions } = req.body ?? {};
  if (!Array.isArray(permissions)) { res.status(400).json({ error: "permissions must be array" }); return; }

  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, roleId));
  if (permissions.length > 0) {
    await db.insert(rolePermissionsTable).values(
      permissions.map((p: any) => ({
        roleId,
        module: p.module,
        canView: !!p.canView,
        canCreate: !!p.canCreate,
        canEdit: !!p.canEdit,
        canDelete: !!p.canDelete,
        canApprove: !!p.canApprove,
      }))
    );
  }
  res.json({ ok: true });
});

// DELETE /api/roles/:id
router.delete("/roles/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, id));
  if (role?.isSystem) { res.status(400).json({ error: "لا يمكن حذف الأدوار الافتراضية" }); return; }
  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, id));
  await db.delete(rolesTable).where(eq(rolesTable.id, id));
  res.json({ ok: true });
});

export default router;
