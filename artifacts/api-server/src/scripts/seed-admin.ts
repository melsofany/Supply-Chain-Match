import bcrypt from "bcryptjs";
import { db, rolesTable, rolePermissionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const MODULES = [
  "inquiries","quotations","customer_pos","supplier_pos",
  "delivery_notes","invoices","customers","suppliers",
  "accounting","reports","users",
];

const ALL_PERMS = { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true };
const VIEW_ONLY  = { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
const NO_PERMS   = { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };

const ROLES = [
  {
    name: "admin", label: "مدير النظام", isSystem: true,
    perms: MODULES.map((m) => ({ module: m, ...ALL_PERMS })),
  },
  {
    name: "manager", label: "مدير تنفيذي", isSystem: true,
    perms: MODULES.map((m) => ({ module: m, ...(m === "users" ? VIEW_ONLY : ALL_PERMS) })),
  },
  {
    name: "sales", label: "مبيعات", isSystem: true,
    perms: MODULES.map((m) => ({
      module: m,
      ...( ["inquiries","quotations","customers"].includes(m) ? { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false }
        : ["customer_pos","reports"].includes(m) ? VIEW_ONLY
        : NO_PERMS )
    })),
  },
  {
    name: "viewer", label: "مشاهد فقط", isSystem: true,
    perms: MODULES.map((m) => ({ module: m, ...( m === "users" ? NO_PERMS : VIEW_ONLY ) })),
  },
];

async function seed() {
  console.log("Seeding roles and permissions...");
  for (const roleDef of ROLES) {
    let [role] = await db.select().from(rolesTable).where(eq(rolesTable.name, roleDef.name));
    if (!role) {
      const [created] = await db.insert(rolesTable).values({ name: roleDef.name, label: roleDef.label, isSystem: roleDef.isSystem }).returning();
      role = created;
      console.log(`  Created role: ${role.name}`);
    }
    await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, role.id));
    await db.insert(rolePermissionsTable).values(roleDef.perms.map((p) => ({ roleId: role.id, ...p })));
    console.log(`  Updated permissions for: ${role.name}`);
  }

  const [adminRole] = await db.select().from(rolesTable).where(eq(rolesTable.name, "admin"));
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@system.local"));
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.insert(usersTable).values({ email: "admin@system.local", passwordHash, name: "مدير النظام", roleId: adminRole.id, isActive: true });
    console.log("  Created admin user: admin@system.local / admin123");
  } else {
    console.log("  Admin user already exists");
  }
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
