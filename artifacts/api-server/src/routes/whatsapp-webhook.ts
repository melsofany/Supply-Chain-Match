/**
 * WhatsApp Inbound Webhook
 * GET  /webhooks/whatsapp — التحقق من الـ webhook مع Meta
 * POST /webhooks/whatsapp — استقبال الرسائل الواردة
 *
 * متغيرات البيئة المطلوبة:
 *   WHATSAPP_WEBHOOK_VERIFY_TOKEN — رمز التحقق (تختاره أنت وتضعه في Meta)
 *   WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN — للإرسال التلقائي
 */

import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, customersTable, suppliersTable, inquiriesTable } from "@workspace/db";
import { sendTextMessage } from "../lib/whatsapp";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** تطبيع رقم الهاتف للمقارنة — يحذف +، مسافات، شرطات */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, "");
}

/** مقارنة رقمَين بعد التطبيع */
function phonesMatch(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  // مطابقة تامة أو أحدهما ينتهي بالآخر (لتغطية الفرق في كود الدولة)
  return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

/** إنشاء رقم استفسار فريد */
function buildInquiryTitle(senderName: string, msgText: string): string {
  const preview = msgText.slice(0, 80).replace(/\n/g, " ");
  return `[واتساب] ${senderName}: ${preview}`;
}

// ── GET /webhooks/whatsapp — Meta webhook verification ────────────────────────
router.get("/webhooks/whatsapp", (req, res): void => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
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
  // Meta expects a quick 200 response
  res.sendStatus(200);

  try {
    const body = req.body as any;
    if (body?.object !== "whatsapp_business_account") return;

    const entries: any[] = body.entry ?? [];

    for (const entry of entries) {
      const changes: any[] = entry.changes ?? [];
      for (const change of changes) {
        const value = change.value;
        if (!value?.messages) continue;

        for (const msg of value.messages) {
          if (msg.type !== "text") continue; // نتعامل فقط مع الرسائل النصية

          const senderPhone = String(msg.from); // رقم المرسل (بدون +)
          const msgText: string = msg.text?.body ?? "";
          if (!msgText.trim()) continue;

          logger.info({ senderPhone, msgText }, "WhatsApp inbound message");

          await handleInboundMessage(senderPhone, msgText);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error processing WhatsApp webhook");
  }
});

async function handleInboundMessage(senderPhone: string, msgText: string): Promise<void> {
  // 1. ابحث في العملاء
  const customers = await db
    .select({ id: customersTable.id, name: customersTable.name, phone: customersTable.phone })
    .from(customersTable);

  const customer = customers.find((c) => phonesMatch(c.phone, senderPhone));

  if (customer) {
    await handleCustomerMessage(senderPhone, customer, msgText);
    return;
  }

  // 2. ابحث في الموردين
  const suppliers = await db
    .select({ id: suppliersTable.id, name: suppliersTable.name, phone: suppliersTable.phone })
    .from(suppliersTable);

  const supplier = suppliers.find((s) => phonesMatch(s.phone, senderPhone));

  if (supplier) {
    await handleSupplierMessage(senderPhone, supplier, msgText);
    return;
  }

  // 3. رقم غير معروف
  await handleUnknownSender(senderPhone, msgText);
}

async function handleCustomerMessage(
  senderPhone: string,
  customer: { id: number; name: string },
  msgText: string
): Promise<void> {
  try {
    // أنشئ استفسارًا جديدًا
    const title = buildInquiryTitle(customer.name, msgText);
    const [inquiry] = await db
      .insert(inquiriesTable)
      .values({
        customerId: customer.id,
        title,
        description: `رسالة واتساب من ${customer.name} (${senderPhone}):\n\n${msgText}`,
        status: "new",
      })
      .returning({ id: inquiriesTable.id });

    logger.info(
      { customerId: customer.id, inquiryId: inquiry.id },
      "Created inquiry from WhatsApp message"
    );

    // أرسل رد تأكيد
    try {
      await sendTextMessage(
        senderPhone,
        `✅ شكرًا ${customer.name}،\n\nتم استلام استفساركم وتسجيله برقم *#${inquiry.id}*.\nسيتواصل معكم فريقنا قريبًا.\n\n_نظام المشتريات — TradeCore_`
      );
    } catch (err) {
      logger.warn({ err }, "Could not send WhatsApp reply to customer");
    }
  } catch (err) {
    logger.error({ err, customerId: customer.id }, "Failed to create inquiry from WhatsApp");
  }
}

async function handleSupplierMessage(
  senderPhone: string,
  supplier: { id: number; name: string },
  msgText: string
): Promise<void> {
  logger.info(
    { supplierId: supplier.id, supplierName: supplier.name, msgText },
    "WhatsApp message from supplier"
  );

  // أرسل رد تأكيد للمورد
  try {
    await sendTextMessage(
      senderPhone,
      `✅ شكرًا ${supplier.name}،\n\nتم استلام رسالتكم وسيتم مراجعتها من قِبل فريق المشتريات.\n\nإذا كانت ردًا على طلب تسعير، يُرجى استخدام رابط البوابة المُرسَل إليكم لإدخال أسعاركم.\n\n_نظام المشتريات — TradeCore_`
    );
  } catch (err) {
    logger.warn({ err }, "Could not send WhatsApp reply to supplier");
  }
}

async function handleUnknownSender(senderPhone: string, msgText: string): Promise<void> {
  logger.info({ senderPhone, msgText }, "WhatsApp message from unknown number");

  try {
    await sendTextMessage(
      senderPhone,
      `مرحبًا،\n\nشكرًا لتواصلكم معنا.\nرقمكم غير مسجّل في نظامنا. يُرجى التواصل مع فريق المبيعات مباشرةً لتسجيل بياناتكم.\n\n_نظام المشتريات — TradeCore_`
    );
  } catch (err) {
    logger.warn({ err }, "Could not send WhatsApp reply to unknown sender");
  }
}

export default router;
