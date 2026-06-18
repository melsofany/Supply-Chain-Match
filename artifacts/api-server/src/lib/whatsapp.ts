/**
 * WhatsApp Business Cloud API — خدمة الإرسال
 * تستخدم Meta Cloud API مباشرةً عبر fetch
 * المتغيرات المطلوبة:
 *   WHATSAPP_PHONE_NUMBER_ID  — Phone Number ID من Meta Developer Console
 *   WHATSAPP_ACCESS_TOKEN     — Access Token الدائم من Meta
 *   WHATSAPP_API_VERSION      — إصدار API (اختياري، افتراضي: v20.0)
 */

import { logger } from "./logger";

const BASE = "https://graph.facebook.com";

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION ?? "v20.0";

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WHATSAPP_PHONE_NUMBER_ID و WHATSAPP_ACCESS_TOKEN غير مضبوطَين في متغيرات البيئة"
    );
  }

  return { phoneNumberId, accessToken, apiVersion };
}

function sanitizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, "");
}

async function sendMessage(payload: object): Promise<void> {
  const { phoneNumberId, accessToken, apiVersion } = getConfig();
  const url = `${BASE}/${apiVersion}/${phoneNumberId}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp API error ${res.status}: ${body}`);
  }
}

export interface WhatsAppRfqOptions {
  phone: string;
  supplierName: string;
  rfqNumber: string;
  inquiryTitle: string;
  closeDate?: string | null;
  items: Array<{
    description: string;
    quantity?: string | number | null;
    unit?: string | null;
  }>;
  portalUrl: string;
  companyName?: string;
}

export async function sendRfqWhatsApp(opts: WhatsAppRfqOptions): Promise<void> {
  const phone = sanitizePhone(opts.phone);
  const company = opts.companyName ?? "نظام المشتريات";
  const closeDate = opts.closeDate ?? "قريباً";

  const itemLines = opts.items
    .slice(0, 10)
    .map((it, i) => {
      const qty = it.quantity != null ? String(it.quantity) : "—";
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

  await sendMessage({
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { preview_url: false, body },
  });

  logger.info({ phone: opts.phone, rfqNumber: opts.rfqNumber }, "WhatsApp RFQ sent");
}

export interface WhatsAppPoOptions {
  phone: string;
  supplierName: string;
  poNumber: string;
  totalAmount: number;
  notes?: string | null;
  companyName?: string;
}

export async function sendPoWhatsApp(opts: WhatsAppPoOptions): Promise<void> {
  const phone = sanitizePhone(opts.phone);
  const company = opts.companyName ?? "نظام المشتريات";
  const total = opts.totalAmount.toLocaleString("ar-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const body =
    `🏢 *${company}*\n` +
    `أمر توريد — *${opts.poNumber}*\n\n` +
    `السادة / *${opts.supplierName}*،\n\n` +
    `يسرنا إبلاغكم بأنه تم إصدار أمر التوريد الخاص بكم.\n\n` +
    `💰 *القيمة الإجمالية للبضاعة:* ${total}\n` +
    (opts.notes ? `📝 *ملاحظات:* ${opts.notes}\n` : "") +
    `\nنرجو التأكيد والبدء في التنفيذ في أقرب وقت.`;

  await sendMessage({
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { preview_url: false, body },
  });

  logger.info({ phone: opts.phone, poNumber: opts.poNumber }, "WhatsApp PO sent");
}

export async function verifyWhatsAppConfig(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { phoneNumberId, accessToken, apiVersion } = getConfig();
    const url = `${BASE}/${apiVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: `API ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
