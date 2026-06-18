/**
 * WhatsApp Inbound Webhook
 * يستخدم مكتبة whatsapp-cloud-api-express المفتوحة المصدر:
 * https://github.com/j05u3/whatsapp-cloud-api-express
 *
 * GET  /webhooks/whatsapp — التحقق من الـ webhook مع Meta (تتولّاه المكتبة)
 * POST /webhooks/whatsapp — استقبال الرسائل الواردة وتخزينها (تتولّاه المكتبة)
 *
 * متغير البيئة:
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — رمز التحقق (تختاره وتضعه في Meta)
 */

import { Router, type IRouter } from "express";
import { getWebhookRouter, type Message } from "whatsapp-cloud-api-express";
import { db, customersTable, suppliersTable, inquiriesTable, whatsappMessagesTable } from "@workspace/db";
import { sendTextMessage } from "../lib/whatsapp";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── الـ webhook router من المكتبة المفتوحة المصدر ────────────────────────────
const waRouter = getWebhookRouter({
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "tradecore-verify",
  appSecret: null, // اختياري: ضع App Secret من Meta للتحقق من التوقيع
  onNewMessage: handleInboundMessage,
  onStatusChange: async (status) => {
    logger.debug({ status: status.status, recipient: status.recipient_id }, "WhatsApp message status");
  },
});

// نثبّت router المكتبة على مسار /webhooks/whatsapp
router.use("/webhooks/whatsapp", waRouter);

// ── معالجة الرسائل الواردة ────────────────────────────────────────────────────
async function handleInboundMessage(message: Message): Promise<void> {
  // نتعامل فقط مع الرسائل النصية
  if (message.type !== "text") return;

  const senderPhone = message.from;
  const msgText: string = (message.data as any)?.text ?? "";
  const senderName: string | undefined = message.name;
  const waMessageId = message.id;

  if (!msgText.trim()) return;

  logger.info({ senderPhone, senderName, msgText }, "WhatsApp inbound text message");

  // ابحث في العملاء
  const customers = await db
    .select({ id: customersTable.id, name: customersTable.name, phone: customersTable.phone })
    .from(customersTable);
  const customer = customers.find((c) => phonesMatch(c.phone, senderPhone));

  if (customer) {
    await storeMessage({ phone: senderPhone, contactName: customer.name, contactType: "customer", contactId: customer.id, body: msgText, waMessageId });
    await createInquiry(customer, senderPhone, msgText);
    await autoReply(senderPhone, `✅ شكرًا ${customer.name}،\n\nتم استلام استفساركم وتسجيله.\nسيتواصل معكم فريقنا قريبًا.\n\n_TradeCore_`);
    return;
  }

  // ابحث في الموردين
  const suppliers = await db
    .select({ id: suppliersTable.id, name: suppliersTable.name, phone: suppliersTable.phone })
    .from(suppliersTable);
  const supplier = suppliers.find((s) => phonesMatch(s.phone, senderPhone));

  if (supplier) {
    await storeMessage({ phone: senderPhone, contactName: supplier.name, contactType: "supplier", contactId: supplier.id, body: msgText, waMessageId });
    await autoReply(senderPhone, `✅ شكرًا ${supplier.name}،\n\nتم استلام رسالتكم. سيراجعها فريق المشتريات قريبًا.\n\n_TradeCore_`);
    return;
  }

  // رقم غير معروف
  const displayName = senderName ?? senderPhone;
  await storeMessage({ phone: senderPhone, contactName: senderName ?? null, contactType: "unknown", contactId: null, body: msgText, waMessageId });
  await autoReply(senderPhone, `مرحبًا ${displayName}،\n\nرقمكم غير مسجّل في نظامنا. يُرجى التواصل مع فريق المبيعات.\n\n_TradeCore_`);
}

// ── دوال مساعدة ───────────────────────────────────────────────────────────────
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, "");
}

function phonesMatch(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

async function storeMessage(opts: {
  phone: string; contactName: string | null; contactType: string;
  contactId: number | null; body: string; waMessageId: string;
}): Promise<void> {
  await db.insert(whatsappMessagesTable).values({
    phone:       opts.phone,
    contactName: opts.contactName,
    contactType: opts.contactType,
    contactId:   opts.contactId,
    direction:   "inbound",
    body:        opts.body,
    waMessageId: opts.waMessageId || null,
    read:        false,
  });
}

async function createInquiry(customer: { id: number; name: string }, phone: string, msgText: string): Promise<void> {
  try {
    const title = `[واتساب] ${customer.name}: ${msgText.slice(0, 80).replace(/\n/g, " ")}`;
    await db.insert(inquiriesTable).values({
      customerId:  customer.id,
      title,
      description: `رسالة واتساب من ${customer.name} (${phone}):\n\n${msgText}`,
      status:      "new",
    });
  } catch (err) {
    logger.error({ err }, "Failed to create inquiry from WhatsApp message");
  }
}

async function autoReply(phone: string, body: string): Promise<void> {
  try {
    await sendTextMessage(phone, body);
    // خزّن الرد التلقائي كرسالة صادرة
    await db.insert(whatsappMessagesTable).values({
      phone, contactName: null, contactType: null, contactId: null,
      direction: "outbound", body, read: true,
    });
  } catch (err) {
    logger.warn({ err }, "Could not send WhatsApp auto-reply");
  }
}

export default router;
