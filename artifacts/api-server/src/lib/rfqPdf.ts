import PDFDocument from "pdfkit";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

export interface RfqPdfOptions {
  rfqNumber: string;
  inquiryTitle: string;
  closeDate?: string | null;
  supplierName: string;
  items: Array<{
    description: string;
    quantity?: number | string | null;
    unit?: string | null;
    notes?: string | null;
  }>;
  portalUrl?: string;
  companyName?: string;
}

function getFontPath(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return resolve(currentDir, "assets/fonts/Amiri-Regular.ttf");
}

function formatDate(d?: string | null): string {
  if (!d) return new Date().toLocaleDateString("en-GB");
  try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d; }
}

export function generateRfqPdf(opts: RfqPdfOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const fontPath = getFontPath();
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
        compress: false,
      });

      const chunks: Buffer[] = [];
      let settled = false;
      const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => settle(() => resolve(Buffer.concat(chunks))));
      doc.on("error", (err: Error) => settle(() => reject(err)));

      doc.registerFont("Amiri", fontPath);

      const PAGE_W = doc.page.width;
      const MARGIN = 30;
      const CONTENT_W = PAGE_W - MARGIN * 2;
      const BLUE = "#1a3a5c";
      const GOLD = "#c8a84b";
      const GREY_BG = "#eef2f7";

      // ── HEADER ───────────────────────────────────────────────────────────
      doc.rect(0, 0, PAGE_W, 80).fill(BLUE);
      doc.font("Amiri").fontSize(22).fillColor("#ffffff")
        .text("طلب عرض سعر", MARGIN, 16, { lineBreak: false });
      doc.font("Amiri").fontSize(9).fillColor(GOLD)
        .text("REQUEST FOR QUOTATION", MARGIN, 48, { lineBreak: false });

      // Company name right side
      const company = opts.companyName || "";
      if (company) {
        doc.font("Amiri").fontSize(13).fillColor("#ffffff")
          .text(company, MARGIN, 28, { width: CONTENT_W, align: "right", lineBreak: false });
      }

      // ── INFO BAND ─────────────────────────────────────────────────────────
      const INFO_Y = 80;
      const INFO_H = 52;
      doc.rect(0, INFO_Y, PAGE_W, INFO_H).fill(GREY_BG);
      doc.rect(0, INFO_Y + INFO_H - 2.5, PAGE_W, 2.5).fill(GOLD);

      const infoCells = [
        { label: "رقم الطلب", value: opts.rfqNumber },
        { label: "المشروع / الطلب", value: opts.inquiryTitle },
        { label: "تاريخ الإصدار", value: formatDate() },
        { label: "آخر موعد للتقديم", value: opts.closeDate ? formatDate(opts.closeDate) : "—" },
      ];

      const cellW = CONTENT_W / infoCells.length;
      infoCells.forEach((cell, i) => {
        const cx = MARGIN + i * cellW;
        doc.font("Amiri").fontSize(8).fillColor("#8899aa")
          .text(cell.label, cx, INFO_Y + 8, { width: cellW, align: "center", lineBreak: false });
        doc.font("Amiri").fontSize(11).fillColor(BLUE)
          .text(cell.value, cx, INFO_Y + 26, { width: cellW, align: "center", lineBreak: false });
      });

      // ── BODY ──────────────────────────────────────────────────────────────
      let y = INFO_Y + INFO_H + 14;

      doc.font("Amiri").fontSize(9).fillColor("#8899aa")
        .text("إلى المورّد:", MARGIN, y, { width: CONTENT_W, align: "right", lineBreak: false });
      y += 16;
      doc.font("Amiri").fontSize(15).fillColor(BLUE)
        .text(opts.supplierName, MARGIN, y, { width: CONTENT_W, align: "right", lineBreak: false });
      y += 26;

      doc.font("Amiri").fontSize(10).fillColor("#555555")
        .text(
          "يسرنا الاستفسار عن أسعار الأصناف التالية. نرجو التفضل بتزويدنا بأفضل عروض الأسعار قبل التاريخ المحدد.",
          MARGIN, y, { width: CONTENT_W, align: "right" }
        );
      y += 30;

      // ── ITEMS TABLE ───────────────────────────────────────────────────────
      const COL_W = [36, CONTENT_W - 36 - 64 - 58, 64, 58];
      const COL_LABELS = ["#", "الوصف", "الكمية", "الوحدة"];
      const ROW_H = 22;

      // Header row
      doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(BLUE);
      let cx = MARGIN;
      COL_LABELS.forEach((label, i) => {
        doc.font("Amiri").fontSize(10).fillColor("#ffffff")
          .text(label, cx, y + 5, { width: COL_W[i], align: "center", lineBreak: false });
        cx += COL_W[i];
      });
      y += ROW_H;

      // Data rows
      opts.items.forEach((item, idx) => {
        const rowBg = idx % 2 === 0 ? "#ffffff" : "#f4f7fa";
        doc.rect(MARGIN, y, CONTENT_W, ROW_H).fill(rowBg).stroke("#d8e0e8");
        const cells = [
          String(idx + 1),
          item.description,
          item.quantity != null ? String(item.quantity) : "—",
          item.unit ?? "—",
        ];
        let cx2 = MARGIN;
        cells.forEach((val, i) => {
          doc.font("Amiri").fontSize(10).fillColor("#333333")
            .text(val, cx2 + 3, y + 5, {
              width: COL_W[i] - 6,
              align: i === 1 ? "right" : "center",
              lineBreak: false,
            });
          cx2 += COL_W[i];
        });
        y += ROW_H;
      });

      y += 18;

      // ── PORTAL LINK ───────────────────────────────────────────────────────
      if (opts.portalUrl) {
        doc.rect(MARGIN, y, CONTENT_W, 48).fill(GREY_BG);
        doc.font("Amiri").fontSize(10).fillColor(BLUE)
          .text("لتقديم عرض السعر يرجى فتح الرابط التالي:", MARGIN + 8, y + 7, {
            width: CONTENT_W - 16, align: "right", lineBreak: false,
          });
        doc.font("Helvetica").fontSize(9).fillColor("#1e3a5f")
          .text(opts.portalUrl, MARGIN + 8, y + 26, {
            width: CONTENT_W - 16, align: "left", lineBreak: false,
          });
        y += 58;
      }

      // ── SIGNATURE LINE ───────────────────────────────────────────────────
      y += 10;
      doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y).stroke("#d8e0e8");
      y += 10;
      doc.font("Amiri").fontSize(9).fillColor("#9ca3af")
        .text("توقيع المورد: ___________________     التاريخ: ___________________", MARGIN, y, {
          width: CONTENT_W, align: "center", lineBreak: false,
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
