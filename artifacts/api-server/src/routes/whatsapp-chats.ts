/**
 * WhatsApp Chats API
 * GET  /whatsapp-chats                  — قائمة المحادثات (مجمّعة حسب الرقم)
 * GET  /whatsapp-chats/:phone/messages  — رسائل محادثة واحدة
 * POST /whatsapp-chats/:phone/send      — إرسال رسالة
 * POST /whatsapp-chats/:phone/read      — تعليم المحادثة كمقروءة
 */

import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, whatsappMessagesTable, customersTable, suppliersTable } from "@workspace/db";
import { requireAuth } from "../lib/auth";
import { sendTextMessage } from "../lib/whatsapp";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function decodePhone(raw: string | string[]): string {
  return decodeURIComponent(Array.isArray(raw) ? raw[0] : raw);
}

// ── GET /whatsapp-chats — قائمة المحادثات ────────────────────────────────────
router.get("/whatsapp-chats", requireAuth, async (_req, res): Promise<void> => {
  // آخر رسالة لكل رقم + عدد غير المقروءة
  const rows = await db.execute(sql`
    SELECT
      phone,
      contact_name,
      contact_type,
      contact_id,
      MAX(created_at)                                   AS last_message_at,
      (array_agg(body ORDER BY created_at DESC))[1]     AS last_message,
      (array_agg(direction ORDER BY created_at DESC))[1] AS last_direction,
      COUNT(*) FILTER (WHERE read = false AND direction = 'inbound') AS unread_count
    FROM whatsapp_messages
    GROUP BY phone, contact_name, contact_type, contact_id
    ORDER BY last_message_at DESC
  `);

  res.json(rows.rows);
});

// ── GET /whatsapp-chats/:phone/messages — رسائل محادثة واحدة ────────────────
router.get("/whatsapp-chats/:phone/messages", requireAuth, async (req, res): Promise<void> => {
  const phone = decodePhone(req.params.phone);

  const messages = await db
    .select()
    .from(whatsappMessagesTable)
    .where(eq(whatsappMessagesTable.phone, phone))
    .orderBy(whatsappMessagesTable.createdAt);

  res.json(messages);
});

// ── POST /whatsapp-chats/:phone/send — إرسال رسالة ──────────────────────────
router.post("/whatsapp-chats/:phone/send", requireAuth, async (req, res): Promise<void> => {
  const phone = decodePhone(req.params.phone);
  const { body } = req.body as { body: string };

  if (!body?.trim()) {
    res.status(400).json({ error: "body مطلوب" });
    return;
  }

  // احضر اسم جهة الاتصال من آخر رسالة
  const [last] = await db
    .select({
      contactName: whatsappMessagesTable.contactName,
      contactType: whatsappMessagesTable.contactType,
      contactId:   whatsappMessagesTable.contactId,
    })
    .from(whatsappMessagesTable)
    .where(eq(whatsappMessagesTable.phone, phone))
    .orderBy(desc(whatsappMessagesTable.createdAt))
    .limit(1);

  try {
    await sendTextMessage(phone, body);
  } catch (err: any) {
    logger.error({ err, phone }, "Failed to send WhatsApp message");
    res.status(502).json({ error: "فشل في إرسال رسالة الواتساب: " + (err.message ?? "خطأ غير معروف") });
    return;
  }

  const [msg] = await db
    .insert(whatsappMessagesTable)
    .values({
      phone,
      contactName: last?.contactName ?? null,
      contactType: last?.contactType ?? null,
      contactId:   last?.contactId ?? null,
      direction:   "outbound",
      body:        body.trim(),
      read:        true,
    })
    .returning();

  logger.info({ phone, msgId: msg.id }, "Outbound WhatsApp message sent");
  res.status(201).json(msg);
});

// ── POST /whatsapp-chats/:phone/read — تعليم كمقروء ─────────────────────────
router.post("/whatsapp-chats/:phone/read", requireAuth, async (req, res): Promise<void> => {
  const phone = decodePhone(req.params.phone);

  await db
    .update(whatsappMessagesTable)
    .set({ read: true })
    .where(eq(whatsappMessagesTable.phone, phone));

  res.sendStatus(204);
});

export default router;
