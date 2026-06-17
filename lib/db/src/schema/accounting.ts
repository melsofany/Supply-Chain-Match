import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemPriceHistoryTable = pgTable("item_price_history", {
  id: serial("id").primaryKey(),
  itemDescription: text("item_description").notNull(),
  supplierId: integer("supplier_id"),
  customerId: integer("customer_id"),
  quotationId: integer("quotation_id"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 3 }),
  unit: text("unit"),
  resultedInPo: boolean("resulted_in_po").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertItemPriceHistorySchema = createInsertSchema(itemPriceHistoryTable).omit({ id: true, createdAt: true });
export type InsertItemPriceHistory = z.infer<typeof insertItemPriceHistorySchema>;
export type ItemPriceHistory = typeof itemPriceHistoryTable.$inferSelect;
