import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import {
  CreateSupplierBody,
  GetSupplierParams,
  GetSupplierResponse,
  UpdateSupplierParams,
  UpdateSupplierBody,
  UpdateSupplierResponse,
  DeleteSupplierParams,
  ListSuppliersResponse,
} from "@workspace/api-zod";
import { validate } from "../lib/route-helpers";

const router: IRouter = Router();

router.get("/suppliers", async (req, res): Promise<void> => {
  const suppliers = await db.select().from(suppliersTable).orderBy(suppliersTable.createdAt);
  res.json(ListSuppliersResponse.parse(suppliers));
});

router.post("/suppliers", async (req, res): Promise<void> => {
  const data = validate(CreateSupplierBody, req.body);
  const [supplier] = await db.insert(suppliersTable).values(data).returning();
  res.status(201).json(GetSupplierResponse.parse(supplier));
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const { id } = validate(GetSupplierParams, req.params);
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(GetSupplierResponse.parse(supplier));
});

router.patch("/suppliers/:id", async (req, res): Promise<void> => {
  const { id } = validate(UpdateSupplierParams, req.params);
  const data = validate(UpdateSupplierBody, req.body);
  const [supplier] = await db.update(suppliersTable).set(data).where(eq(suppliersTable.id, id)).returning();
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.json(UpdateSupplierResponse.parse(supplier));
});

router.delete("/suppliers/:id", async (req, res): Promise<void> => {
  const { id } = validate(DeleteSupplierParams, req.params);
  const [supplier] = await db.delete(suppliersTable).where(eq(suppliersTable.id, id)).returning();
  if (!supplier) { res.status(404).json({ error: "Supplier not found" }); return; }
  res.sendStatus(204);
});

export default router;
