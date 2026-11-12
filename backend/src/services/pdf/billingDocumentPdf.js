import PDFDocument from 'pdfkit';
import { BUSINESS } from '../../config/business.js';
import { amountInWords } from '../../utils/amountInWords.js';

/**
 * Renders a quotation or invoice to a PDF Buffer (A4).
 *
 * Uses the built-in Helvetica font, so amounts are written as "Rs." — the
 * standard PDF fonts have no ₹ glyph. Embedding a TTF font (e.g. Noto Sans)
 * would allow the ₹ symbol if preferred.
 */

const COLORS = {
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

const PAGE = { width: 595.28, height: 841.89, margin: 40 };
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const FOOTER_SPACE = 50;
const BOTTOM_LIMIT = PAGE.height - PAGE.margin - FOOTER_SPACE;

const number2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amount = (value) => number2.format(value);
const rupees = (value) => `Rs. ${number2.format(value)}`;
const formatDate = (iso) =>
  new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/** Column layouts (widths sum to CONTENT_WIDTH = 515). */
const GST_COLUMNS = [
  { key: 'index', label: '#', width: 22, align: 'center' },
  { key: 'description', label: 'Item / Service', width: 175, align: 'left' },
  { key: 'quantity', label: 'Qty', width: 40, align: 'right' },
  { key: 'rate', label: 'Rate', width: 60, align: 'right' },
  { key: 'discountPercent', label: 'Disc %', width: 40, align: 'right' },
  { key: 'taxableValue', label: 'Taxable', width: 70, align: 'right' },
  { key: 'gstRate', label: 'GST %', width: 38, align: 'right' },
  { key: 'total', label: 'Amount', width: 70, align: 'right' },
];
const PLAIN_COLUMNS = [
  { key: 'index', label: '#', width: 22, align: 'center' },
  { key: 'description', label: 'Item / Service', width: 263, align: 'left' },
  { key: 'quantity', label: 'Qty', width: 50, align: 'right' },
  { key: 'rate', label: 'Rate', width: 70, align: 'right' },
  { key: 'discountPercent', label: 'Disc %', width: 40, align: 'right' },
  { key: 'total', label: 'Amount', width: 70, align: 'right' },
];

const cellText = (column, item, index) => {
  switch (column.key) {
    case 'index':
      return String(index + 1);
    case 'description':
      return item.description;
    case 'quantity':
      return String(item.quantity);
    case 'discountPercent':
      return item.discountPercent ? `${item.discountPercent}` : '-';
    case 'gstRate':
      return `${item.gstRate}`;
    default:
      return amount(item[column.key]);
  }
};

function documentTitle(kind, document) {
  if (kind === 'quotation') return 'QUOTATION';
  return document.invoiceType === 'gst' ? 'TAX INVOICE' : 'INVOICE';
}

// ---------------------------------------------------------------------------

function drawHeader(pdf, kind, document) {
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
  pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(17).text(documentTitle(kind, document), rightX, 28, {
    width: 190,
    align: 'right',
  });
  pdf.fillColor(COLORS.gold).fontSize(10.5).text(document.number, rightX, 52, { width: 190, align: 'right' });
  pdf.fillColor(COLORS.softText).font('Helvetica').fontSize(8.5).text(`Date: ${formatDate(document.date)}`, rightX, 68, {
    width: 190,
    align: 'right',
  });
}

function drawParties(pdf, kind, document) {
  const top = 134;
  const customer = document.customer ?? {};
  const leftWidth = 290;

  pdf.fillColor(COLORS.flame).font('Helvetica-Bold').fontSize(8).text(kind === 'quotation' ? 'QUOTATION FOR' : 'BILL TO', PAGE.margin, top, {
    characterSpacing: 1,
  });
  pdf.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11).text(customer.name ?? '', PAGE.margin, top + 13, { width: leftWidth });
  pdf.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  if (customer.companyName) pdf.text(customer.companyName, { width: leftWidth });
  pdf.fillColor(COLORS.muted);
  if (customer.address) pdf.text(customer.address, { width: leftWidth });
  if (customer.mobile) pdf.text(`Mobile: +91 ${customer.mobile}`, { width: leftWidth });
  if (customer.email) pdf.text(`Email: ${customer.email}`, { width: leftWidth });
  if (customer.gstNumber) {
    pdf.fillColor(COLORS.text).font('Helvetica-Bold').text(`GSTIN: ${customer.gstNumber}`, { width: leftWidth });
  }
  const leftBottom = pdf.y;

  // Right-hand details box
  const rows = [[kind === 'quotation' ? 'Quotation No.' : 'Invoice No.', document.number], ['Date', formatDate(document.date)]];
  if (kind === 'quotation') rows.push(['Valid Until', formatDate(document.validUntil)]);
  if (document.taxMode === 'gst') {
    rows.push(['Supply Type', document.supplyType === 'inter' ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)']);
    if (document.supplyType !== 'inter') {
      rows.push(['Place of Supply', `${BUSINESS.stateName} (${BUSINESS.stateCode})`]);
    } else if (customer.gstNumber) {
      rows.push(['Place of Supply', `State code ${customer.gstNumber.slice(0, 2)}`]);
    }
  }
  if (kind === 'invoice' && document.status === 'cancelled') rows.push(['Status', 'CANCELLED']);

  const boxX = PAGE.width - PAGE.margin - 200;
  const rowHeight = 16;
  const boxHeight = rows.length * rowHeight + 10;
  pdf.roundedRect(boxX, top, 200, boxHeight, 4).fillAndStroke(COLORS.headerBg, COLORS.border);
  rows.forEach(([label, value], i) => {
    const y = top + 7 + i * rowHeight;
    pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5).text(label, boxX + 10, y, { width: 80 });
    pdf.fillColor(label === 'Status' ? COLORS.fire : COLORS.text).font('Helvetica-Bold').text(value, boxX + 88, y, {
      width: 104,
      align: 'right',
    });
  });

  return Math.max(leftBottom, top + boxHeight) + 18;
}

function drawTableHeader(pdf, columns, y) {
  pdf.rect(PAGE.margin, y, CONTENT_WIDTH, 20).fill(COLORS.navy);
  let x = PAGE.margin;
  pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
  for (const column of columns) {
    pdf.text(column.label, x + 4, y + 6.5, { width: column.width - 8, align: column.align });
    x += column.width;
  }
  return y + 20;
}

function drawItems(pdf, columns, items, startY) {
  let y = drawTableHeader(pdf, columns, startY);
  const descColumn = columns.find((c) => c.key === 'description');

  items.forEach((item, index) => {
    pdf.font('Helvetica').fontSize(8.5);
    const descHeight = pdf.heightOfString(item.description, { width: descColumn.width - 8 });
    const hsnLine = item.hsnCode ? 10 : 0;
    const rowHeight = Math.max(descHeight + hsnLine, 10) + 10;

    if (y + rowHeight > BOTTOM_LIMIT) {
      pdf.addPage();
      y = drawTableHeader(pdf, columns, PAGE.margin);
    }

    if (index % 2 === 1) pdf.rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight).fill('#f8fafc');

    let x = PAGE.margin;
    for (const column of columns) {
      const isDesc = column.key === 'description';
      pdf.fillColor(COLORS.text).font(column.key === 'total' ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
      pdf.text(cellText(column, item, index), x + 4, y + 5, { width: column.width - 8, align: column.align });
      if (isDesc && item.hsnCode) {
        pdf.fillColor(COLORS.muted).fontSize(7.5).text(`HSN/SAC: ${item.hsnCode}`, x + 4, y + 5 + descHeight + 1, {
          width: column.width - 8,
        });
      }
      x += column.width;
    }
    y += rowHeight;
    pdf.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
  });

  return y + 14;
}

function drawTotals(pdf, kind, document, startY) {
  const rows = [['Subtotal', amount(document.subtotal)]];
  if (document.discountTotal > 0) rows.push(['Discount', `- ${amount(document.discountTotal)}`]);
  if (document.taxMode === 'gst') {
    rows.push(['Taxable Value', amount(document.taxableTotal)]);
    if (document.supplyType === 'inter') rows.push(['IGST', amount(document.igstTotal)]);
    else rows.push(['CGST', amount(document.cgstTotal)], ['SGST', amount(document.sgstTotal)]);
  }
  if (document.roundOff !== 0) rows.push(['Round Off', `${document.roundOff > 0 ? '+' : '-'} ${amount(Math.abs(document.roundOff))}`]);

  const extraRows = kind === 'invoice' ? 2 : 0;
  const blockHeight = rows.length * 16 + 26 + extraRows * 16 + 10;
  let y = startY;
  if (y + Math.max(blockHeight, 90) > BOTTOM_LIMIT) {
    pdf.addPage();
    y = PAGE.margin;
  }

  const boxX = PAGE.width - PAGE.margin - 220;
  rows.forEach(([label, value], i) => {
    const rowY = y + i * 16;
    pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(label, boxX, rowY, { width: 110 });
    pdf.fillColor(COLORS.text).text(value, boxX + 110, rowY, { width: 110, align: 'right' });
  });

  let rowY = y + rows.length * 16 + 2;
  pdf.rect(boxX - 6, rowY, 226, 24).fill(COLORS.navy);
  pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('Grand Total', boxX, rowY + 7, { width: 110 });
  pdf.text(rupees(document.grandTotal), boxX + 104, rowY + 7, { width: 110, align: 'right' });
  rowY += 32;

  if (kind === 'invoice') {
    pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('Amount Paid', boxX, rowY, { width: 110 });
    pdf.fillColor(COLORS.text).text(amount(document.amountPaid), boxX + 110, rowY, { width: 110, align: 'right' });
    rowY += 16;
    pdf.fillColor(document.balanceDue > 0 ? COLORS.fire : COLORS.text).font('Helvetica-Bold').text('Balance Due', boxX, rowY, { width: 110 });
    pdf.text(rupees(document.balanceDue), boxX + 110, rowY, { width: 110, align: 'right' });
    rowY += 16;
  }

  // Amount in words, left of the totals block
  pdf.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text('AMOUNT IN WORDS', PAGE.margin, y, { characterSpacing: 0.8 });
  pdf.fillColor(COLORS.text).font('Helvetica').fontSize(9).text(amountInWords(document.grandTotal), PAGE.margin, y + 12, { width: 260 });

  return Math.max(rowY, pdf.y) + 16;
}

function drawTextSection(pdf, title, text, startY) {
  if (!text) return startY;
  let y = startY;
  pdf.font('Helvetica').fontSize(8.5);
  const height = pdf.heightOfString(text, { width: CONTENT_WIDTH }) + 16;
  if (y + Math.min(height, 120) > BOTTOM_LIMIT) {
    pdf.addPage();
    y = PAGE.margin;
  }
  pdf.fillColor(COLORS.flame).font('Helvetica-Bold').fontSize(8).text(title.toUpperCase(), PAGE.margin, y, { characterSpacing: 0.8 });
  pdf.fillColor(COLORS.text).font('Helvetica').fontSize(8.5).text(text, PAGE.margin, y + 12, { width: CONTENT_WIDTH, lineGap: 2 });
  return pdf.y + 14;
}

function drawSignature(pdf, startY) {
  let y = startY + 10;
  if (y + 60 > BOTTOM_LIMIT) {
    pdf.addPage();
    y = PAGE.margin;
  }
  const x = PAGE.width - PAGE.margin - 200;
  pdf.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9).text(`For ${BUSINESS.name}`, x, y, { width: 200, align: 'right' });
  pdf.moveTo(x + 60, y + 45).lineTo(x + 200, y + 45).lineWidth(0.5).strokeColor(COLORS.muted).stroke();
  pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text('Authorised Signatory', x, y + 50, { width: 200, align: 'right' });
}

function drawCancelledWatermark(pdf) {
  pdf.save();
  pdf.rotate(-35, { origin: [PAGE.width / 2, PAGE.height / 2] });
  pdf.fillColor(COLORS.fire).fillOpacity(0.12).font('Helvetica-Bold').fontSize(96);
  pdf.text('CANCELLED', 0, PAGE.height / 2 - 50, { width: PAGE.width, align: 'center' });
  pdf.restore();
  pdf.fillOpacity(1);
}

/** Footer on every page (page numbers need all pages buffered first). */
function drawFooters(pdf) {
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

// ---------------------------------------------------------------------------

/**
 * @param {object} document quotation or invoice (as returned by its service)
 * @param {'quotation'|'invoice'} kind
 * @returns {Promise<Buffer>}
 */
export function renderBillingDocumentPdf(document, kind) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      bufferPages: true,
      info: {
        Title: `${documentTitle(kind, document)} ${document.number}`,
        Author: BUSINESS.name,
        Creator: 'AgniDesk',
      },
    });

    const chunks = [];
    pdf.on('data', (chunk) => chunks.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    try {
      drawHeader(pdf, kind, document);
      if (kind === 'invoice' && document.status === 'cancelled') drawCancelledWatermark(pdf);

      let y = drawParties(pdf, kind, document);
      y = drawItems(pdf, document.taxMode === 'gst' ? GST_COLUMNS : PLAIN_COLUMNS, document.items, y);
      y = drawTotals(pdf, kind, document, y);
      if (kind === 'quotation') y = drawTextSection(pdf, 'Terms & Conditions', document.terms, y);
      y = drawTextSection(pdf, 'Notes', document.notes, y);
      drawSignature(pdf, y);
      drawFooters(pdf);
      pdf.end();
    } catch (error) {
      reject(error);
    }
  });
}

/** "INV/2026-27/0001" -> "INV-2026-27-0001.pdf" */
export const pdfFileName = (document) => `${document.number.replace(/[^\w-]+/g, '-')}.pdf`;
