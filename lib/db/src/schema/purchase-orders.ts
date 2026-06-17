import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerPosTable = pgTable("customer_pos", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  quotationId: integer("quotation_id"),
  poNumber: text("po_number"),
  status: text("status").notNull().default("received"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const supplierPosTable = pgTable("supplier_pos", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  customerPoId: integer("customer_po_id"),
  poNumber: text("po_number"),
  status: text("status").notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }),
  insuranceRate: numeric("insurance_rate", { precision: 6, scale: 4 }).notNull().default("0.03"),
  vatRate: numeric("vat_rate", { precision: 6, scale: 4 }).notNull().default("0.14"),
  withholdingTaxRate: numeric("withholding_tax_rate", { precision: 6, scale: 4 }).notNull().default("0.005"),
  stampDutyRate: numeric("stamp_duty_rate", { precision: 6, scale: 4 }).notNull().default("0.001"),
  operatingCost: numeric("operating_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCustomerPoSchema = createInsertSchema(customerPosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerPo = z.infer<typeof insertCustomerPoSchema>;
export type CustomerPo = typeof customerPosTable.$inferSelect;

export const insertSupplierPoSchema = createInsertSchema(supplierPosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplierPo = z.infer<typeof insertSupplierPoSchema>;
export type SupplierPo = typeof supplierPosTable.$inferSelect;
