import PDFDocument from 'pdfkit';
import { BUSINESS } from '../../config/business.js';

/**
 * Shared branding and layout for every AgniDesk PDF
 * (quotations, invoices, service certificates).
 *
 * Uses built-in Helvetica (no font files to deploy). Standard PDF fonts have
 * no ₹ glyph, so amounts are written as "Rs.".
 */

export const COLORS = {
  navy: '#0f172a',
  fire: '#c8161f',
  flame: '#f26a1b',
  gold: '#f5a70b',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
  headerBg: '#f1f5f9',
  softText: '#cbd5e1',
};

export const PAGE = { width: 595.28, height: 841.89, margin: 40 };
export const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const FOOTER_SPACE = 50;
export const BOTTOM_LIMIT = PAGE.height - PAGE.margin - FOOTER_SPACE;

export const formatDate = (iso) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Navy header band with business details (left) and document title/number/date (right). */
export function drawBrandHeader(pdf, { title, number, date }) {
  pdf.rect(0, 0, PAGE.width, 112).fill(COLORS.navy);
  // Brand accent stripe: fire red -> orange -> gold
  const stripe = PAGE.width / 3;
  pdf.rect(0, 112, stripe, 4).fill(COLORS.fire);
  pdf.rect(stripe, 112, stripe, 4).fill(COLORS.flame);
  pdf.rect(stripe * 2, 112, stripe + 1, 4).fill(COLORS.gold);

  const left = PAGE.margin;
  pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(BUSINESS.name, left, 26, { width: 320 });
  pdf.fillColor(COLORS.gold).font('Helvetica-Bold').fontSize(8.5).text(BUSINESS.tagline.toUpperCase(), left, 49, {
    width: 320,
    characterSpacing: 1.2,
  });
  pdf.fillColor(COLORS.softText).font('Helvetica').fontSize(8);
  pdf.text(BUSINESS.address, left, 66, { width: 320 });
  pdf.text(`${BUSINESS.phones.join('  |  ')}  |  ${BUSINESS.email}`, left, pdf.y + 2, { width: 340 });
  if (BUSINESS.gstin) {
    pdf.fillColor('#ffffff').font('Helvetica-Bold').text(`GSTIN: ${BUSINESS.gstin}`, left, pdf.y + 2, { width: 320 });
  }

  const rightX = PAGE.width - PAGE.margin - 190;
  pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(17).text(title, rightX, 28, { width: 190, align: 'right' });
  if (number) pdf.fillColor(COLORS.gold).fontSize(10.5).text(number, rightX, 52, { width: 190, align: 'right' });
  if (date) {
    pdf.fillColor(COLORS.softText).font('Helvetica').fontSize(8.5).text(`Date: ${formatDate(date)}`, rightX, 68, {
      width: 190,
      align: 'right',
    });
  }
}

/** "For AGNI SETU FIRE SAFETY / Authorised Signatory" block, right-aligned. */
export function drawSignature(pdf, startY, label = 'Authorised Signatory') {
  let y = startY + 10;
  if (y + 60 > BOTTOM_LIMIT) {
    pdf.addPage();
    y = PAGE.margin;
  }
  const x = PAGE.width - PAGE.margin - 200;
  pdf.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9).text(`For ${BUSINESS.name}`, x, y, { width: 200, align: 'right' });
  pdf.moveTo(x + 60, y + 45).lineTo(x + 200, y + 45).lineWidth(0.5).strokeColor(COLORS.muted).stroke();
  pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(label, x, y + 50, { width: 200, align: 'right' });
  return y + 70;
}

/** Small uppercase section heading in brand orange. */
export function drawSectionTitle(pdf, title, x, y) {
  pdf.fillColor(COLORS.flame).font('Helvetica-Bold').fontSize(8).text(title.toUpperCase(), x, y, { characterSpacing: 1 });
}

/** Footer on every page (page numbers need all pages buffered first). */
export function drawFooters(pdf) {
  const range = pdf.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    pdf.switchToPage(i);
    // Temporarily remove the bottom margin so writing in the footer area doesn't trigger a new page.
    const { bottom } = pdf.page.margins;
    pdf.page.margins.bottom = 0;
    const y = PAGE.height - PAGE.margin + 6;
    pdf.moveTo(PAGE.margin, y - 8).lineTo(PAGE.width - PAGE.margin, y - 8).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(7.5);
    pdf.text('This is a computer-generated document.', PAGE.margin, y, { width: 300 });
    pdf.text(`Page ${i - range.start + 1} of ${range.count}`, PAGE.width - PAGE.margin - 100, y, { width: 100, align: 'right' });
    pdf.page.margins.bottom = bottom;
  }
}

/**
 * Creates an A4 document, runs `draw(pdf)`, adds footers and resolves the PDF Buffer.
 * @param {{ title: string }} info
 * @param {(pdf: PDFKit.PDFDocument) => void} draw
 */
export function renderPdf(info, draw) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      bufferPages: true,
      info: { Title: info.title, Author: BUSINESS.name, Creator: 'AgniDesk' },
    });
    const chunks = [];
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    try {
      draw(pdf);
      drawFooters(pdf);
      pdf.end();
    } catch (error) {
      reject(error);
    }
  });
}

/** "INV/2026-27/0001" -> "INV-2026-27-0001.pdf" */
export const pdfFileNameFor = (number) => `${number.replace(/[^\w-]+/g, '-')}.pdf`;
