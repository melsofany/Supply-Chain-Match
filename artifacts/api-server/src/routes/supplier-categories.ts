import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, supplierCategoriesTable, suppliersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/supplier-categories", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(supplierCategoriesTable)
    .orderBy(asc(supplierCategoriesTable.name));
  res.json(rows);
});

router.post("/supplier-categories", async (req, res): Promise<void> => {
  const { name, color, description } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "اسم التصنيف مطلوب" });
    return;
  }
  const [cat] = await db
    .insert(supplierCategoriesTable)
    .values({ name: name.trim(), color: color ?? "#6366f1", description: description ?? null })
    .returning();
  res.status(201).json(cat);
});

router.patch("/supplier-categories/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, color, description } = req.body;
  const upd: Record<string, any> = {};
  if (name != null) upd.name = name.trim();
  if (color != null) upd.color = color;
  if (description != null) upd.description = description;
  const [cat] = await db
    .update(supplierCategoriesTable)
    .set(upd)
    .where(eq(supplierCategoriesTable.id, id))
    .returning();
  if (!cat) { res.status(404).json({ error: "التصنيف غير موجود" }); return; }
  res.json(cat);
});

router.delete("/supplier-categories/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db
    .update(suppliersTable)
    .set({ category: null })
    .where(eq(suppliersTable.category,
      // clear category name matching this deleted category
      (await db.select({ name: supplierCategoriesTable.name })
        .from(supplierCategoriesTable)
        .where(eq(supplierCategoriesTable.id, id))
        .then(r => r[0]?.name ?? "__NONE__"))
    ));
  const [cat] = await db
    .delete(supplierCategoriesTable)
    .where(eq(supplierCategoriesTable.id, id))
    .returning();
  if (!cat) { res.status(404).json({ error: "التصنيف غير موجود" }); return; }
  res.sendStatus(204);
});

export default router;
