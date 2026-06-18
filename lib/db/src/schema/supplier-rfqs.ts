import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
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
  // Email / portal tracking
  token: text("token").unique(),
  emailStatus: text("email_status").default("not_sent"),
  emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
  closeDate: text("close_date"),
  linkOpened: boolean("link_opened").notNull().default(false),
  openCount: integer("open_count").notNull().default(0),
  firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
  lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
  offerSubmitted: boolean("offer_submitted").notNull().default(false),
  offerSubmittedAt: timestamp("offer_submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const supplierRfqItemsTable = pgTable("supplier_rfq_items", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").notNull(),
  inquiryItemId: integer("inquiry_item_id").notNull(),
  quotedPrice: numeric("quoted_price", { precision: 15, scale: 2 }),
  notes: text("notes"),
  taxIncluded: boolean("tax_included").notNull().default(false),
  deliveryDays: integer("delivery_days"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSupplierRfqSchema = createInsertSchema(supplierRfqsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplierRfq = z.infer<typeof insertSupplierRfqSchema>;
export type SupplierRfq = typeof supplierRfqsTable.$inferSelect;

export const insertSupplierRfqItemSchema = createInsertSchema(supplierRfqItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplierRfqItem = z.infer<typeof insertSupplierRfqItemSchema>;
export type SupplierRfqItem = typeof supplierRfqItemsTable.$inferSelect;
