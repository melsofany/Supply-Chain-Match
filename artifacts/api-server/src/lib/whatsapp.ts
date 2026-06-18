/**
 * WhatsApp Business Cloud API — Powered by whatsapp-cloud-api-express (open source)
 * https://github.com/j05u3/whatsapp-cloud-api-express
 *
 * متغيرات البيئة المطلوبة:
 *   WHATSAPP_PHONE_NUMBER_ID  — Phone Number ID من Meta Developer Console
 *   WHATSAPP_ACCESS_TOKEN     — Access Token الدائم من Meta
 */

import { createMessageSender, type MessageSender } from "whatsapp-cloud-api-express";
import { logger } from "./logger";

let _sender: MessageSender | null = null;

export function getWhatsAppSender(): MessageSender {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID و WHATSAPP_ACCESS_TOKEN غير مضبوطَين في متغيرات البيئة"
    );
  }

  if (!_sender) {
    _sender = createMessageSender(
      phoneNumberId,
      accessToken,
      async ({ fromPhoneNumberId, requestBody, responseSummary }) => {
        logger.debug({ fromPhoneNumberId, to: requestBody?.to }, "WhatsApp message sent");
      }
    );
  }

  return _sender;
}

export async function sendTextMessage(to: string, text: string): Promise<void> {
  const phone = to.replace(/[\s\-\+\(\)]/g, "");
  await getWhatsAppSender().sendText(phone, text);
  logger.info({ to: phone }, "WhatsApp text sent");
}

// ── RFQ ──────────────────────────────────────────────────────────────────────
export interface WhatsAppRfqOptions {
  phone: string;
  supplierName: string;
  rfqNumber: string;
  inquiryTitle: string;
  closeDate?: string | null;
  items: Array<{ description: string; quantity?: string | number | null; unit?: string | null }>;
  portalUrl: string;
  companyName?: string;
}

export async function sendRfqWhatsApp(opts: WhatsAppRfqOptions): Promise<void> {
  const phone   = opts.phone.replace(/[\s\-\+\(\)]/g, "");
  const company = opts.companyName ?? "نظام المشتريات";
  const closeDate = opts.closeDate ?? "قريباً";

  const itemLines = opts.items
    .slice(0, 10)
    .map((it, i) => {
      const qty  = it.quantity != null ? String(it.quantity) : "—";
      const unit = it.unit ?? "";
      return `${i + 1}. ${it.description} — ${qty} ${unit}`.trim();
    })
    .join("\n");

  const body =
    `🏢 *${company}*\n` +
    `طلب عرض سعر — *${opts.rfqNumber}*\n\n` +
    `السادة / *${opts.supplierName}*،\n` +
    `نرجو تزويدنا بأسعاركم للأصناف التالية الخاصة بـ:\n` +
    `📋 *${opts.inquiryTitle}*\n\n` +
    `*الأصناف المطلوبة:*\n${itemLines}\n\n` +
    `⏰ *آخر موعد للرد:* ${closeDate}\n\n` +
    `للتسعير مباشرةً افتح الرابط:\n${opts.portalUrl}`;

  await getWhatsAppSender().sendText(phone, body);
  logger.info({ phone, rfqNumber: opts.rfqNumber }, "WhatsApp RFQ sent");
}

// ── PO ───────────────────────────────────────────────────────────────────────
export interface WhatsAppPoOptions {
  phone: string;
  supplierName: string;
  poNumber: string;
  totalAmount: number;
  notes?: string | null;
  companyName?: string;
}

export async function sendPoWhatsApp(opts: WhatsAppPoOptions): Promise<void> {
  const phone   = opts.phone.replace(/[\s\-\+\(\)]/g, "");
  const company = opts.companyName ?? "نظام المشتريات";
  const total   = opts.totalAmount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const body =
    `🏢 *${company}*\n` +
    `أمر توريد — *${opts.poNumber}*\n\n` +
    `السادة / *${opts.supplierName}*،\n\n` +
    `يسرنا إبلاغكم بأنه تم إصدار أمر التوريد الخاص بكم.\n\n` +
    `💰 *القيمة الإجمالية:* ${total}\n` +
    (opts.notes ? `📝 *ملاحظات:* ${opts.notes}\n` : "") +
    `\nنرجو التأكيد والبدء في التنفيذ في أقرب وقت.`;

  await getWhatsAppSender().sendText(phone, body);
  logger.info({ phone, poNumber: opts.poNumber }, "WhatsApp PO sent");
}

// ── Config verification ───────────────────────────────────────────────────────
export async function verifyWhatsAppConfig(): Promise<{ ok: boolean; error?: string }> {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken   = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion    = process.env.WHATSAPP_API_VERSION ?? "v20.0";

    if (!phoneNumberId || !accessToken) {
      return { ok: false, error: "WHATSAPP_PHONE_NUMBER_ID و WHATSAPP_ACCESS_TOKEN غير مضبوطَين" };
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `API ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
