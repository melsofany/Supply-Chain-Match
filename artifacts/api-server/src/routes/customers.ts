import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  CreateCustomerBody,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  DeleteCustomerParams,
  ListCustomersResponse,
} from "@workspace/api-zod";
import { validate } from "../lib/route-helpers";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.createdAt);
  res.json(ListCustomersResponse.parse(customers));
});

router.post("/customers", async (req, res): Promise<void> => {
  const data = validate(CreateCustomerBody, req.body);
  const [customer] = await db.insert(customersTable).values(data).returning();
  res.status(201).json(GetCustomerResponse.parse(customer));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const { id } = validate(GetCustomerParams, req.params);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(GetCustomerResponse.parse(customer));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const { id } = validate(UpdateCustomerParams, req.params);
  const data = validate(UpdateCustomerBody, req.body);
  const [customer] = await db.update(customersTable).set(data).where(eq(customersTable.id, id)).returning();
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(UpdateCustomerResponse.parse(customer));
});

router.delete("/customers/:id", async (req, res): Promise<void> => {
  const { id } = validate(DeleteCustomerParams, req.params);
  const [customer] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.sendStatus(204);
});

export default router;
