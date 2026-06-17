import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, usersTable, rolesTable, rolePermissionsTable } from "@workspace/db";
import { signToken, requireAuth, type JwtPayload } from "../lib/auth";

const router: IRouter = Router();

async function buildUserResponse(userId: number) {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, name: usersTable.name, roleId: usersTable.roleId, isActive: usersTable.isActive })
    .from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return null;

  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));
  const perms = await db.select().from(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, user.roleId));

  const permissions: Record<string, any> = {};
  for (const p of perms) {
    permissions[p.module] = { canView: p.canView, canCreate: p.canCreate, canEdit: p.canEdit, canDelete: p.canDelete, canApprove: p.canApprove };
  }

  return { id: user.id, email: user.email, name: user.name, roleId: user.roleId, roleName: role?.name ?? "", roleLabel: role?.label ?? "", permissions };
}

// POST /api/auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) { res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user || !user.isActive) { res.status(401).json({ error: "بيانات الدخول غير صحيحة" }); return; }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "بيانات الدخول غير صحيحة" }); return; }

  const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));
  const payload: JwtPayload = { userId: user.id, email: user.email, roleId: user.roleId, roleName: role?.name ?? "" };
  const token = signToken(payload);
  const userInfo = await buildUserResponse(user.id);
  res.json({ token, user: userInfo });
});

// GET /api/auth/me
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const jwtUser = (req as any).user as JwtPayload;
  const userInfo = await buildUserResponse(jwtUser.userId);
  if (!userInfo) { res.status(404).json({ error: "User not found" }); return; }
  res.json(userInfo);
});

// POST /api/auth/logout
router.post("/auth/logout", (_req, res): void => { res.json({ ok: true }); });

export default router;
