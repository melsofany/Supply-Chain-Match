/**
 * WhatsApp Inbound Webhook
 * GET  /webhooks/whatsapp — التحقق من الـ webhook مع Meta
 * POST /webhooks/whatsapp — استقبال الرسائل الواردة وتخزينها
 */

import { Router, type IRouter } from "express";
import { db, customersTable, suppliersTable, inquiriesTable, whatsappMessagesTable } from "@workspace/db";
import { sendTextMessage } from "../lib/whatsapp";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, "");
}

function phonesMatch(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

// ── GET /webhooks/whatsapp — Meta webhook verification ────────────────────────
router.get("/webhooks/whatsapp", (req, res): void => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "tradecore-verify";

  if (mode === "subscribe" && token === verifyToken) {
    logger.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, "WhatsApp webhook verification failed");
    res.sendStatus(403);
  }
});

// ── POST /webhooks/whatsapp — incoming messages ───────────────────────────────
router.post("/webhooks/whatsapp", async (req, res): Promise<void> => {
  res.sendStatus(200); // Meta needs quick 200

  try {
    const body = req.body as any;
    if (body?.object !== "whatsapp_business_account") return;

    for (const entry of (body.entry ?? [])) {
      for (const change of (entry.changes ?? [])) {
        const value = change.value;
        if (!value?.messages) continue;

        for (const msg of value.messages) {
          if (msg.type !== "text") continue;
          const senderPhone = String(msg.from);
          const msgText: string = msg.text?.body ?? "";
          if (!msgText.trim()) continue;
          logger.info({ senderPhone, msgText }, "WhatsApp inbound message");
          await handleInboundMessage(senderPhone, msgText, String(msg.id ?? ""));
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error processing WhatsApp webhook");
  }
});

async function handleInboundMessage(senderPhone: string, msgText: string, waMessageId: string): Promise<void> {
  const customers = await db.select({ id: customersTable.id, name: customersTable.name, phone: customersTable.phone }).from(customersTable);
  const customer  = customers.find((c) => phonesMatch(c.phone, senderPhone));

  if (customer) {
    await storeMessage({ phone: senderPhone, contactName: customer.name, contactType: "customer", contactId: customer.id, body: msgText, waMessageId });
    await createInquiry(customer, senderPhone, msgText);
    await replyTo(senderPhone, `✅ شكرًا ${customer.name}،\n\nتم استلام استفساركم وتسجيله.\nسيتواصل معكم فريقنا قريبًا.\n\n_TradeCore_`);
    return;
  }

  const suppliers = await db.select({ id: suppliersTable.id, name: suppliersTable.name, phone: suppliersTable.phone }).from(suppliersTable);
  const supplier  = suppliers.find((s) => phonesMatch(s.phone, senderPhone));

  if (supplier) {
    await storeMessage({ phone: senderPhone, contactName: supplier.name, contactType: "supplier", contactId: supplier.id, body: msgText, waMessageId });
    await replyTo(senderPhone, `✅ شكرًا ${supplier.name}،\n\nتم استلام رسالتكم. سيراجعها فريق المشتريات قريبًا.\n\n_TradeCore_`);
    return;
  }

  await storeMessage({ phone: senderPhone, contactName: null, contactType: "unknown", contactId: null, body: msgText, waMessageId });
  await replyTo(senderPhone, `مرحبًا،\n\nرقمكم غير مسجّل في نظامنا. يُرجى التواصل مع فريق المبيعات.\n\n_TradeCore_`);
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
    logger.error({ err }, "Failed to create inquiry from WhatsApp");
  }
}

async function replyTo(phone: string, body: string): Promise<void> {
  try {
    await sendTextMessage(phone, body);
    await db.insert(whatsappMessagesTable).values({
      phone, contactName: null, contactType: null, contactId: null,
      direction: "outbound", body, read: true,
    });
  } catch (err) {
    logger.warn({ err }, "Could not send WhatsApp auto-reply");
  }
}

export default router;
