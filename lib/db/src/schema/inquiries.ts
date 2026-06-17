import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inquiriesTable = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const inquiryItemsTable = pgTable("inquiry_items", {
  id: serial("id").primaryKey(),
  inquiryId: integer("inquiry_id").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit"),
  notes: text("notes"),
});

export const insertInquirySchema = createInsertSchema(inquiriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiriesTable.$inferSelect;

export const insertInquiryItemSchema = createInsertSchema(inquiryItemsTable).omit({ id: true });
export type InsertInquiryItem = z.infer<typeof insertInquiryItemSchema>;
export type InquiryItem = typeof inquiryItemsTable.$inferSelect;
