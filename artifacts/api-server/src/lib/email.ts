import nodemailer from "nodemailer";
import { logger } from "./logger";

async function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

export async function verifyEmailConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const t = await createTransporter();
    await t.verify();
    t.close();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface RfqEmailOptions {
  to: string;
  toName: string;
  rfqNo: string;
  inquiryTitle: string;
  items: Array<{ description: string; quantity: string | null; unit: string | null; notes: string | null }>;
  portalUrl: string;
  closeDate: string;
  senderName: string;
  companyName?: string;
}

export async function sendRfqEmail(opts: RfqEmailOptions): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_USER و SMTP_PASS غير مضبوطين في متغيرات البيئة");
  }

  const transporter = await createTransporter();
  const senderEmail = process.env.SMTP_USER;
  const company = opts.companyName || "نظام المشتريات";

  const itemRows = opts.items
    .map(
      (item, i) => `
    <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"}">
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">${i + 1}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb">${item.description}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">${item.quantity ?? "—"}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center">${item.unit ?? "—"}</td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>طلب عرض سعر ${opts.rfqNo}</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6;direction:rtl">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1e3a5f;padding:20px 32px">
      <h1 style="margin:0;color:#fff;font-size:22px">${company}</h1>
      <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">طلب عرض سعر</p>
    </div>
    <div style="padding:32px">
      <p style="font-size:15px;color:#374151">السادة / <strong>${opts.toName}</strong>،</p>
      <p style="font-size:15px;color:#374151">
        نرجو التفضل بتزويدنا بأسعاركم للأصناف التالية الخاصة بـ: <strong>${opts.inquiryTitle}</strong><br>
        <strong>رقم الطلب:</strong> ${opts.rfqNo} &nbsp;|&nbsp; <strong>آخر موعد:</strong> ${opts.closeDate}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
        <thead>
          <tr style="background:#1e3a5f;color:#fff">
            <th style="padding:10px 12px;border:1px solid #1e3a5f;text-align:center">#</th>
            <th style="padding:10px 12px;border:1px solid #1e3a5f;text-align:right">الصنف</th>
            <th style="padding:10px 12px;border:1px solid #1e3a5f;text-align:center">الكمية</th>
            <th style="padding:10px 12px;border:1px solid #1e3a5f;text-align:center">الوحدة</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="text-align:center;margin:32px 0">
        <a href="${opts.portalUrl}"
           style="background:#1e3a5f;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:700;display:inline-block">
          ادخل أسعارك الآن ←
        </a>
      </div>
      <p style="font-size:12px;color:#6b7280;text-align:center">
        أو انسخ هذا الرابط في متصفحك:<br>
        <a href="${opts.portalUrl}" style="color:#1e3a5f;word-break:break-all">${opts.portalUrl}</a>
      </p>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px">
        هذا الرابط خاص بشركتكم — لا يُشارك مع أطراف أخرى.<br>
        ينتهي صلاحيته في: <strong>${opts.closeDate}</strong>
      </p>
    </div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;font-size:13px;color:#6b7280">
      للتواصل: <strong>${opts.senderName}</strong> | <a href="mailto:${senderEmail}" style="color:#1e3a5f">${senderEmail}</a>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${company}" <${senderEmail}>`,
      to: `"${opts.toName}" <${opts.to}>`,
      subject: `طلب عرض سعر — ${opts.rfqNo} (${opts.inquiryTitle}) — آخر موعد: ${opts.closeDate}`,
      html,
    });
    logger.info({ to: opts.to, rfqNo: opts.rfqNo }, "RFQ email sent");
  } finally {
    transporter.close();
  }
}
