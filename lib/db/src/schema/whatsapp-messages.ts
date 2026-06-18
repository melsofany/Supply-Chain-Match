import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const whatsappMessagesTable = pgTable("whatsapp_messages", {
  id:            serial("id").primaryKey(),
  phone:         text("phone").notNull(),
  contactName:   text("contact_name"),
  contactType:   text("contact_type"),   // 'customer' | 'supplier' | 'unknown'
  contactId:     integer("contact_id"),
  direction:     text("direction").notNull(), // 'inbound' | 'outbound'
  body:          text("body").notNull(),
  waMessageId:   text("wa_message_id"),
  read:          boolean("read").notNull().default(false),
  createdAt:     timestamp("created_at").defaultNow().notNull(),
});
