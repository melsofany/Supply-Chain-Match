import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryNotesTable = pgTable("delivery_notes", {
  id: serial("id").primaryKey(),
  dnNumber: text("dn_number").unique().notNull(),
  customerPoId: integer("customer_po_id").notNull(),
  status: text("status").notNull().default("draft"),
  issueDate: text("issue_date"),
  signedFileUrl: text("signed_file_url"),
  notes: text("notes"),
  financeApprovedAt: timestamp("finance_approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeliveryNoteSchema = createInsertSchema(deliveryNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDeliveryNote = z.infer<typeof insertDeliveryNoteSchema>;
export type DeliveryNote = typeof deliveryNotesTable.$inferSelect;
