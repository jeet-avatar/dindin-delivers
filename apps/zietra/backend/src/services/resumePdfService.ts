import crypto from 'crypto';
import PDFDocument from 'pdfkit';

// ─── Colour palette ───────────────────────────────────────────────────────────

const BRAND_PRIMARY = '#6366f1'; // indigo
const BRAND_ACCENT  = '#8b5cf6'; // violet
const TEXT_DARK     = '#1e1e3f';
const TEXT_MID      = '#4b5563';
const TEXT_LIGHT    = '#9ca3af';
const BG_LIGHT      = '#f8f8ff';
const BORDER_COLOR  = '#e5e7eb';
const TABLE_HEADER  = '#ede9fe';

// ─── Page dimensions ──────────────────────────────────────────────────────────

const PAGE_MARGIN   = 60;
const PAGE_WIDTH    = 612; // US Letter
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
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

// ─── Header ───────────────────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument): void {
  // Indigo band (left half) + violet band (right half)
  fillRect(doc, 0, 0, PAGE_WIDTH / 2, 60, BRAND_PRIMARY);
  fillRect(doc, PAGE_WIDTH / 2, 0, PAGE_WIDTH / 2, 60, BRAND_ACCENT);

  // Brand name
  doc
    .save()
    .fontSize(20)
    .font('Helvetica-Bold')
    .fillColor([255, 255, 255])
    .text('ZIETRA', PAGE_MARGIN, 15, { width: 220 })
    .restore();

  // Subtitle — right-aligned inside the band
  const [lr, lg, lb] = hexToRgb('#ddd6fe'); // light violet
  doc
    .save()
    .fontSize(9)
    .font('Helvetica')
    .fillColor([lr, lg, lb])
    .text('Confidential Candidate Profile', PAGE_MARGIN, 38, {
      width: CONTENT_WIDTH,
      align: 'right',
    })
    .restore();

  // Light background strip below header band
  fillRect(doc, 0, 60, PAGE_WIDTH, 20, BG_LIGHT);

  doc.y = 92;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function drawFooter(doc: PDFKit.PDFDocument): void {
  const footerY = doc.page.height - 36;
  const [r, g, b] = hexToRgb(TEXT_LIGHT);
  drawHorizontalRule(doc, footerY - 4);
  doc
    .save()
    .fontSize(7)
    .font('Helvetica')
    .fillColor([r, g, b])
    .text(
      'Confidential — Zietra Staffing | This profile is proprietary and confidential',
      PAGE_MARGIN,
      footerY,
      { width: CONTENT_WIDTH, align: 'center' },
    )
    .restore();
}

// ─── Parameters interface ─────────────────────────────────────────────────────

export interface ResumePdfParams {
  candidateCode: string;
  title: string;
  experienceYears: number;
  certifications: string[];
  skills: string[];
  summary: string;
}

export interface ResumePdfResult {
  buffer: Buffer;
  hash: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateResumePdf(params: ResumePdfParams): Promise<ResumePdfResult> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      autoFirstPage: false,
      info: {
        Title: params.title,
        Author: 'Zietra',
        Subject: 'Confidential Candidate Profile',
        Creator: 'Zietra Staffing System',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      resolve({ buffer, hash });
    });
    doc.on('error', reject);

    // ── Page 1 ────────────────────────────────────────────────────────────────
    doc.addPage();
    drawHeader(doc);

    const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY);
    const [dr, dg, db] = hexToRgb(TEXT_DARK);
    const [tr, tg, tb] = hexToRgb(TEXT_MID);

    // Candidate code — large, centered
    doc
      .save()
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor([dr, dg, db])
      .text(`Candidate ${params.candidateCode}`, PAGE_MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        align: 'center',
      })
      .restore();

    doc.moveDown(0.35);

    // Job title
    doc
      .save()
      .fontSize(13)
      .font('Helvetica')
      .fillColor([pr, pg, pb])
      .text(params.title, PAGE_MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
      .restore();

    doc.moveDown(0.35);

    // Experience badge
    doc
      .save()
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor([tr, tg, tb])
      .text(
        `${params.experienceYears}+ Years Professional Experience`,
        PAGE_MARGIN,
        doc.y,
        { width: CONTENT_WIDTH, align: 'center' },
      )
      .restore();

    doc.moveDown(0.7);
    drawHorizontalRule(doc, doc.y);
    doc.moveDown(0.8);

    // ── Certifications ────────────────────────────────────────────────────────
    if (params.certifications.length > 0) {
      drawSectionHeader(doc, 'Certifications');
      doc.moveDown(0.4);

      for (const cert of params.certifications) {
        const bulletY = doc.y + 3; // vertical centre of text line

        // Indigo filled circle as bullet
        const [br, bg, bb] = hexToRgb(BRAND_PRIMARY);
        doc
          .save()
          .circle(PAGE_MARGIN + 6, bulletY, 3)
          .fill([br, bg, bb])
          .restore();

        doc
          .save()
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor([dr, dg, db])
          .text(cert, PAGE_MARGIN + 16, doc.y, { width: CONTENT_WIDTH - 16 })
          .restore();

        doc.moveDown(0.25);
      }

      doc.moveDown(0.5);
    }

    // ── Technical Skills ──────────────────────────────────────────────────────
    if (params.skills.length > 0) {
      drawSectionHeader(doc, 'Technical Skills');
      doc.moveDown(0.4);

      doc
        .save()
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor([tr, tg, tb])
        .text(params.skills.join(', '), PAGE_MARGIN, doc.y, {
          width: CONTENT_WIDTH,
          lineGap: 3,
        })
        .restore();

      doc.moveDown(0.8);
    }

    // ── Professional Summary ──────────────────────────────────────────────────
    if (params.summary) {
      drawSectionHeader(doc, 'Professional Summary');
      doc.moveDown(0.4);

      doc
        .save()
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor([dr, dg, db])
        .text(params.summary, PAGE_MARGIN, doc.y, {
          width: CONTENT_WIDTH,
          align: 'justify',
          lineGap: 2,
        })
        .restore();

      doc.moveDown(0.6);
    }

    drawFooter(doc);
    doc.end();
  });
}
