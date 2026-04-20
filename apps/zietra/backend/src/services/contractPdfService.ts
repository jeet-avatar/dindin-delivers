import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SignatureInfo {
  name: string;
  email: string;
  title?: string;
  signedAt: Date;
  ip: string;
  userAgent: string;
  signatureImage?: string; // base64 PNG
  otpVerified?: boolean;
}

export interface RateCardRow {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
}

export interface ContractPdfParams {
  contractId: string;
  title: string;
  contractType: string;
  content: string;
  rateCard?: RateCardRow[];
  clientSignature?: SignatureInfo;
  counterSignature?: SignatureInfo;
  createdAt: Date;
}

export interface ContractPdfResult {
  buffer: Buffer;
  hash: string;
}

// ─── Colour palette & helpers ─────────────────────────────────────────────────

const BRAND_PRIMARY = '#6366f1'; // indigo
const BRAND_ACCENT  = '#8b5cf6'; // violet
const TEXT_DARK     = '#1e1e3f';
const TEXT_MID      = '#4b5563';
const TEXT_LIGHT    = '#9ca3af';
const BG_LIGHT      = '#f8f8ff';
const BORDER_COLOR  = '#e5e7eb';
const TABLE_HEADER  = '#ede9fe';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatCurrency(n: number): string {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ─── Page dimensions ──────────────────────────────────────────────────────────

const PAGE_MARGIN = 60;
const PAGE_WIDTH  = 612; // US Letter
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawHorizontalRule(doc: PDFKit.PDFDocument, y: number, color = BORDER_COLOR): void {
  const [r, g, b] = hexToRgb(color);
  doc
    .save()
    .strokeColor([r, g, b])
    .lineWidth(0.5)
    .moveTo(PAGE_MARGIN, y)
    .lineTo(PAGE_WIDTH - PAGE_MARGIN, y)
    .stroke()
    .restore();
}

function fillRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  hex: string,
): void {
  const [r, g, b] = hexToRgb(hex);
  doc.save().rect(x, y, w, h).fill([r, g, b]).restore();
}

// ─── Section header ───────────────────────────────────────────────────────────

function drawSectionHeader(doc: PDFKit.PDFDocument, label: string): void {
  const y = doc.y;
  fillRect(doc, PAGE_MARGIN, y, CONTENT_WIDTH, 20, TABLE_HEADER);
  const [r, g, b] = hexToRgb(BRAND_PRIMARY);
  doc
    .save()
    .fontSize(9)
    .fillColor([r, g, b])
    .font('Helvetica-Bold')
    .text(label.toUpperCase(), PAGE_MARGIN + 8, y + 5, { width: CONTENT_WIDTH - 16 })
    .restore();
  doc.moveDown(0.2);
}

// ─── Page header (called after each addPage) ──────────────────────────────────

function drawPageHeader(
  doc: PDFKit.PDFDocument,
  contractId: string,
  title: string,
  pageNum: number,
): void {
  const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY);
  const [ar, ag, ab] = hexToRgb(BRAND_ACCENT);

  // Purple gradient band (simulated with two rects)
  fillRect(doc, 0, 0, PAGE_WIDTH / 2, 56, BRAND_PRIMARY);
  fillRect(doc, PAGE_WIDTH / 2, 0, PAGE_WIDTH / 2, 56, BRAND_ACCENT);

  // Brand name
  doc
    .save()
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor([255, 255, 255])
    .text('ZIETRA', PAGE_MARGIN, 16, { width: 220 })
    .restore();

  // Contract meta (right side)
  const metaX = PAGE_WIDTH - PAGE_MARGIN - 180;
  doc
    .save()
    .fontSize(7.5)
    .font('Helvetica')
    .fillColor([255, 255, 255])
    .text(`Contract ID: ${contractId}`, metaX, 10, { width: 180, align: 'right' })
    .text(`Page ${pageNum}`, metaX, 22, { width: 180, align: 'right' })
    .restore();

  // Subtitle bar
  fillRect(doc, 0, 56, PAGE_WIDTH, 24, BG_LIGHT);
  const [tr, tg, tb] = hexToRgb(TEXT_MID);
  doc
    .save()
    .fontSize(8)
    .font('Helvetica')
    .fillColor([tr, tg, tb])
    .text(title, PAGE_MARGIN, 63, { width: CONTENT_WIDTH })
    .restore();

  doc.y = 92;
}

// ─── Page footer ─────────────────────────────────────────────────────────────

function drawPageFooter(doc: PDFKit.PDFDocument, contractId: string): void {
  const footerY = doc.page.height - 36;
  const [r, g, b] = hexToRgb(TEXT_LIGHT);
  drawHorizontalRule(doc, footerY - 4);
  doc
    .save()
    .fontSize(7)
    .font('Helvetica')
    .fillColor([r, g, b])
    .text(
      `Zietra Contract Management  ·  Contract ${contractId}  ·  Confidential`,
      PAGE_MARGIN,
      footerY,
      { width: CONTENT_WIDTH, align: 'center' },
    )
    .restore();
}

// ─── Rate card table ──────────────────────────────────────────────────────────

function drawRateCard(doc: PDFKit.PDFDocument, rows: RateCardRow[]): void {
  const colDesc = PAGE_MARGIN;
  const colQty  = PAGE_MARGIN + CONTENT_WIDTH * 0.52;
  const colUnit = PAGE_MARGIN + CONTENT_WIDTH * 0.68;
  const colTot  = PAGE_MARGIN + CONTENT_WIDTH * 0.84;
  const tableW  = CONTENT_WIDTH;

  // Header row
  fillRect(doc, PAGE_MARGIN, doc.y, tableW, 18, BRAND_PRIMARY);
  const [wr, wg, wb] = hexToRgb('#ffffff');
  const headerY = doc.y + 4;
  doc
    .save()
    .fontSize(8)
    .font('Helvetica-Bold')
    .fillColor([wr, wg, wb])
    .text('Description',  colDesc + 4,  headerY, { width: colQty - colDesc - 8 })
    .text('Qty',          colQty  + 4,  headerY, { width: colUnit - colQty - 8,  align: 'right' })
    .text('Unit Price',   colUnit + 4,  headerY, { width: colTot - colUnit - 8,  align: 'right' })
    .text('Total',        colTot  + 4,  headerY, { width: PAGE_MARGIN + tableW - colTot - 4, align: 'right' })
    .restore();

  doc.moveDown(1.15);

  let grandTotal = 0;
  rows.forEach((row, i) => {
    const rowY = doc.y;
    const rowH = 16;
    const bg = i % 2 === 0 ? '#ffffff' : '#f5f3ff';
    fillRect(doc, PAGE_MARGIN, rowY, tableW, rowH, bg);

    const [dr, dg, db] = hexToRgb(TEXT_DARK);
    const [mr, mg, mb] = hexToRgb(TEXT_MID);
    doc
      .save()
      .fontSize(8)
      .font('Helvetica')
      .fillColor([dr, dg, db])
      .text(row.description, colDesc + 4, rowY + 3, { width: colQty - colDesc - 8 });

    doc
      .fillColor([mr, mg, mb])
      .text(row.quantity != null ? String(row.quantity) : '—', colQty + 4, rowY + 3, { width: colUnit - colQty - 8, align: 'right' })
      .text(row.unitPrice != null ? formatCurrency(row.unitPrice) : '—', colUnit + 4, rowY + 3, { width: colTot - colUnit - 8, align: 'right' })
      .fillColor([dr, dg, db])
      .font('Helvetica-Bold')
      .text(formatCurrency(row.total), colTot + 4, rowY + 3, { width: PAGE_MARGIN + tableW - colTot - 4, align: 'right' })
      .restore();

    grandTotal += row.total;
    doc.moveDown(1.0);
  });

  // Total row
  const totalY = doc.y;
  fillRect(doc, PAGE_MARGIN, totalY, tableW, 20, TABLE_HEADER);
  const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY);
  doc
    .save()
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor([pr, pg, pb])
    .text('Grand Total', colDesc + 4, totalY + 5, { width: colTot - colDesc - 8 })
    .text(formatCurrency(grandTotal), colTot + 4, totalY + 5, { width: PAGE_MARGIN + tableW - colTot - 4, align: 'right' })
    .restore();

  doc.moveDown(1.5);
}

// ─── Signature block ──────────────────────────────────────────────────────────

async function drawSignatureBlock(
  doc: PDFKit.PDFDocument,
  label: string,
  sig: SignatureInfo | undefined,
  x: number,
  y: number,
  blockWidth: number,
): Promise<void> {
  const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY);
  const [tr, tg, tb] = hexToRgb(TEXT_MID);
  const [dr, dg, db] = hexToRgb(TEXT_DARK);

  // Label
  doc
    .save()
    .fontSize(8)
    .font('Helvetica-Bold')
    .fillColor([pr, pg, pb])
    .text(label, x, y, { width: blockWidth })
    .restore();

  let curY = y + 14;

  if (sig) {
    // Signature image or placeholder
    if (sig.signatureImage) {
      try {
        const imgBuf = Buffer.from(sig.signatureImage.replace(/^data:image\/(png|jpeg);base64,/, ''), 'base64');
        // Validate PNG magic bytes (89 50 4E 47) or JPEG (FF D8 FF) before passing to PDFKit
        const isPng = imgBuf.length > 8 && imgBuf[0] === 0x89 && imgBuf[1] === 0x50 && imgBuf[2] === 0x4E && imgBuf[3] === 0x47;
        const isJpeg = imgBuf.length > 3 && imgBuf[0] === 0xFF && imgBuf[1] === 0xD8 && imgBuf[2] === 0xFF;
        if ((isPng || isJpeg) && imgBuf.length > 100) {
          doc.image(imgBuf, x, curY, { width: blockWidth, height: 40, fit: [blockWidth, 40] });
        } else {
          // Invalid image data — draw placeholder line
          drawHorizontalRule(doc, curY + 20, '#9ca3af');
        }
      } catch {
        // Fallback: draw blank line
        drawHorizontalRule(doc, curY + 20, '#9ca3af');
      }
    } else {
      drawHorizontalRule(doc, curY + 20, '#9ca3af');
    }
    curY += 46;

    // Signer details
    doc
      .save()
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor([dr, dg, db])
      .text(sig.name, x, curY, { width: blockWidth })
      .restore();
    curY += 12;

    if (sig.title) {
      doc
        .save()
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor([tr, tg, tb])
        .text(sig.title, x, curY, { width: blockWidth })
        .restore();
      curY += 11;
    }

    doc
      .save()
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor([tr, tg, tb])
      .text(sig.email, x, curY, { width: blockWidth })
      .text(`Signed: ${formatDate(sig.signedAt)}`, x, curY + 11, { width: blockWidth })
      .restore();
  } else {
    // Blank signature area
    drawHorizontalRule(doc, curY + 30, '#9ca3af');
    curY += 36;
    drawHorizontalRule(doc, curY, '#9ca3af');
    doc
      .save()
      .fontSize(7)
      .font('Helvetica')
      .fillColor([tr, tg, tb])
      .text('Signature / Date', x, curY + 3, { width: blockWidth })
      .restore();
  }
}

// ─── Audit trail page ─────────────────────────────────────────────────────────

function drawAuditTrail(
  doc: PDFKit.PDFDocument,
  params: ContractPdfParams,
  pageNum: number,
): void {
  drawPageHeader(doc, params.contractId, params.title, pageNum);

  const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY);
  const [dr, dg, db] = hexToRgb(TEXT_DARK);
  const [tr, tg, tb] = hexToRgb(TEXT_MID);
  const [lr, lg, lb] = hexToRgb(TEXT_LIGHT);

  // Page title
  doc
    .save()
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor([pr, pg, pb])
    .text('Certificate of Completion', PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH })
    .restore();

  doc.moveDown(0.3);
  drawHorizontalRule(doc, doc.y);
  doc.moveDown(0.6);

  // Contract summary box
  fillRect(doc, PAGE_MARGIN, doc.y, CONTENT_WIDTH, 64, BG_LIGHT);
  const boxY = doc.y + 8;
  doc
    .save()
    .fontSize(8)
    .font('Helvetica')
    .fillColor([tr, tg, tb]);

  const fields: Array<[string, string]> = [
    ['Contract ID',   params.contractId],
    ['Title',         params.title],
    ['Type',          params.contractType],
    ['Created',       formatDate(params.createdAt)],
  ];

  fields.forEach(([k, v], i) => {
    const col = i < 2 ? PAGE_MARGIN + 8 : PAGE_MARGIN + CONTENT_WIDTH / 2 + 8;
    const row = i < 2 ? boxY + (i * 18) : boxY + ((i - 2) * 18);
    doc
      .font('Helvetica-Bold').fillColor([dr, dg, db]).text(k + ': ', col, row, { continued: true, width: 200 })
      .font('Helvetica').fillColor([tr, tg, tb]).text(v, { width: 200 });
  });

  doc.restore();
  doc.moveDown(3.5);

  // Signer entries
  const signers: Array<{ role: string; info?: SignatureInfo }> = [
    { role: 'Client Signature',           info: params.clientSignature },
    { role: 'Zietra Counter-Signature', info: params.counterSignature },
  ];

  signers.forEach(({ role, info }) => {
    if (!info) return;
    drawSectionHeader(doc, role);
    doc.moveDown(0.3);

    const rowY = doc.y;
    const labelW = 110;
    const valueW = CONTENT_WIDTH - labelW - 8;

    const auditFields: Array<[string, string]> = [
      ['Full Name',    info.name],
      ['Email',        info.email],
      ['Title',        info.title || '—'],
      ['Signed At',    formatDate(info.signedAt)],
      ['IP Address',   info.ip],
      ['OTP Verified', info.otpVerified ? 'Yes' : 'No'],
    ];

    auditFields.forEach(([k, v]) => {
      doc
        .save()
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor([dr, dg, db])
        .text(k, PAGE_MARGIN + 4, doc.y, { continued: true, width: labelW })
        .font('Helvetica')
        .fillColor([tr, tg, tb])
        .text(v, { width: valueW })
        .restore();
      doc.moveDown(0.15);
    });

    // User agent (may be long — wrap)
    doc
      .save()
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor([dr, dg, db])
      .text('User Agent', PAGE_MARGIN + 4, doc.y, { continued: true, width: labelW })
      .font('Helvetica')
      .fillColor([lr, lg, lb])
      .text(info.userAgent, { width: valueW })
      .restore();

    doc.moveDown(0.8);
  });

  // Verification statement
  const stmtY = doc.y;
  fillRect(doc, PAGE_MARGIN, stmtY, CONTENT_WIDTH, 44, '#f0fdf4');
  const [gr, gg, gb] = hexToRgb('#16a34a');
  doc
    .save()
    .fontSize(8)
    .font('Helvetica-Bold')
    .fillColor([gr, gg, gb])
    .text('Legal Verification Statement', PAGE_MARGIN + 10, stmtY + 8, { width: CONTENT_WIDTH - 20 })
    .font('Helvetica')
    .fillColor([dr, dg, db])
    .fontSize(7.5)
    .text(
      'This document constitutes a legally binding electronic contract. All signatures were obtained via email-verified OTP authentication. ' +
      'This certificate is system-generated and tamper-evident via SHA-256 hash.',
      PAGE_MARGIN + 10,
      stmtY + 20,
      { width: CONTENT_WIDTH - 20 },
    )
    .restore();

  doc.moveDown(4.5);
  drawPageFooter(doc, params.contractId);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateContractPdf(params: ContractPdfParams): Promise<ContractPdfResult> {
  logger.info('Generating contract PDF', { contractId: params.contractId });

  return new Promise<ContractPdfResult>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN },
        autoFirstPage: false,
        info: {
          Title: params.title,
          Author: 'Zietra',
          Subject: params.contractType,
          Creator: 'Zietra Contract Management System',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('error', reject);

      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');
        logger.info('Contract PDF generated', { contractId: params.contractId, bytes: buffer.length, hash });
        resolve({ buffer, hash });
      });

      let pageNum = 1;

      // ── Page 1: Header + contract body ────────────────────────────────────
      doc.addPage();
      drawPageHeader(doc, params.contractId, params.title, pageNum);

      const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY);
      const [dr, dg, db] = hexToRgb(TEXT_DARK);
      const [tr, tg, tb] = hexToRgb(TEXT_MID);

      // Contract title block
      doc
        .save()
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor([dr, dg, db])
        .text(params.title, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
        .restore();

      doc.moveDown(0.3);

      doc
        .save()
        .fontSize(10)
        .font('Helvetica')
        .fillColor([tr, tg, tb])
        .text(params.contractType, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
        .restore();

      doc.moveDown(0.5);
      drawHorizontalRule(doc, doc.y);
      doc.moveDown(0.5);

      // Created date
      doc
        .save()
        .fontSize(8)
        .font('Helvetica')
        .fillColor([tr, tg, tb])
        .text(`Dated: ${formatDate(params.createdAt)}`, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'right' })
        .restore();

      doc.moveDown(0.7);

      // ── Contract content ──────────────────────────────────────────────────
      drawSectionHeader(doc, 'Contract Terms & Conditions');
      doc.moveDown(0.4);

      // Split on existing double newlines to preserve intended paragraphs
      const paragraphs = params.content.split(/\n{2,}/);
      for (const para of paragraphs) {
        const trimmed = para.trim();
        if (!trimmed) continue;

        // Check if we need a new page before writing
        if (doc.y > doc.page.height - 120) {
          drawPageFooter(doc, params.contractId);
          doc.addPage();
          pageNum++;
          drawPageHeader(doc, params.contractId, params.title, pageNum);
        }

        doc
          .save()
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor([dr, dg, db])
          .text(trimmed, PAGE_MARGIN, doc.y, {
            width: CONTENT_WIDTH,
            align: 'justify',
            lineGap: 2,
          })
          .restore();

        doc.moveDown(0.6);
      }

      // ── Rate card ─────────────────────────────────────────────────────────
      if (params.rateCard && params.rateCard.length > 0) {
        if (doc.y > doc.page.height - 160) {
          drawPageFooter(doc, params.contractId);
          doc.addPage();
          pageNum++;
          drawPageHeader(doc, params.contractId, params.title, pageNum);
        }
        doc.moveDown(0.6);
        drawSectionHeader(doc, 'Rate Card / Fee Schedule');
        doc.moveDown(0.4);
        drawRateCard(doc, params.rateCard);
      }

      // ── Signature blocks ──────────────────────────────────────────────────
      // Ensure signatures start on a fresh area (at least 180 pts remaining)
      if (doc.y > doc.page.height - 200) {
        drawPageFooter(doc, params.contractId);
        doc.addPage();
        pageNum++;
        drawPageHeader(doc, params.contractId, params.title, pageNum);
      }

      doc.moveDown(0.6);
      drawSectionHeader(doc, 'Signatures');
      doc.moveDown(0.8);

      const sigY = doc.y;
      const halfW = (CONTENT_WIDTH - 20) / 2;

      // Both signature blocks are drawn at the same Y level side by side.
      // We use a shared async IIFE wrapped in Promise to draw both.
      const sigPromise = (async () => {
        await drawSignatureBlock(doc, 'Client', params.clientSignature, PAGE_MARGIN, sigY, halfW);
        await drawSignatureBlock(
          doc,
          'Zietra (Authorised Signatory)',
          params.counterSignature,
          PAGE_MARGIN + halfW + 20,
          sigY,
          halfW,
        );
      })();

      // Move cursor below the signature area (estimate 130 pts)
      doc.y = sigY + 130;

      drawHorizontalRule(doc, doc.y);
      doc.moveDown(0.6);

      // Execution line
      doc
        .save()
        .fontSize(7.5)
        .font('Helvetica')
        .fillColor([tr, tg, tb])
        .text(
          'This contract is executed electronically and is legally binding upon all parties named herein.',
          PAGE_MARGIN,
          doc.y,
          { width: CONTENT_WIDTH, align: 'center' },
        )
        .restore();

      drawPageFooter(doc, params.contractId);

      // ── Audit trail page ──────────────────────────────────────────────────
      sigPromise
        .then(() => {
          doc.addPage();
          pageNum++;
          drawAuditTrail(doc, params, pageNum);
          doc.end();
        })
        .catch(reject);

    } catch (err) {
      logger.error('Failed to generate contract PDF', { contractId: params.contractId, error: err });
      reject(err);
    }
  });
}
