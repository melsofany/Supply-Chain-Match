import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quotationsTable = pgTable("quotations", {
  id: serial("id").primaryKey(),
  inquiryId: integer("inquiry_id").notNull(),
  customerId: integer("customer_id").notNull(),
  quotationNumber: text("quotation_number"),
  status: text("status").notNull().default("draft"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }),
  validUntil: text("valid_until"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const quotationItemsTable = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull(),
  supplierId: integer("supplier_id"),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotationsTable.$inferSelect;

export const insertQuotationItemSchema = createInsertSchema(quotationItemsTable).omit({ id: true });
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type QuotationItem = typeof quotationItemsTable.$inferSelect;
