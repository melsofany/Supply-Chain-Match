import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supplierRfqsTable = pgTable("supplier_rfqs", {
  id: serial("id").primaryKey(),
  inquiryId: integer("inquiry_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  rfqNumber: text("rfq_number"),
  status: text("status").notNull().default("pending"),
  quotedPrice: numeric("quoted_price", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const supplierRfqItemsTable = pgTable("supplier_rfq_items", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").notNull(),
  inquiryItemId: integer("inquiry_item_id").notNull(),
  quotedPrice: numeric("quoted_price", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSupplierRfqSchema = createInsertSchema(supplierRfqsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplierRfq = z.infer<typeof insertSupplierRfqSchema>;
export type SupplierRfq = typeof supplierRfqsTable.$inferSelect;

export const insertSupplierRfqItemSchema = createInsertSchema(supplierRfqItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplierRfqItem = z.infer<typeof insertSupplierRfqItemSchema>;
export type SupplierRfqItem = typeof supplierRfqItemsTable.$inferSelect;
