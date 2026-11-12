import {
  BOTTOM_LIMIT,
  COLORS,
  CONTENT_WIDTH,
  PAGE,
  drawBrandHeader,
  drawSectionTitle,
  drawSignature,
  formatDate,
  pdfFileNameFor,
  renderPdf,
} from './pdfCommon.js';

/** Service certificate for a completed fire safety service (A4). */

const EQUIPMENT_COLUMNS = [
  { key: 'index', label: '#', width: 28, align: 'center' },
  { key: 'name', label: 'Equipment', width: 230, align: 'left' },
  { key: 'quantity', label: 'Qty', width: 50, align: 'right' },
  { key: 'details', label: 'Details (capacity / serial / location)', width: 207, align: 'left' },
];

function drawIntro(pdf, service) {
  const y = 138;
  pdf.fillColor(COLORS.navy).font('Helvetica-Bold').fontSize(16).text('CERTIFICATE OF SERVICE', PAGE.margin, y, {
    width: CONTENT_WIDTH,
    align: 'center',
    characterSpacing: 1.5,
  });
  pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(9.5).text(
    `This is to certify that the fire safety service described below has been carried out by our team on ${formatDate(service.serviceDate)}.`,
    PAGE.margin + 40,
    y + 24,
    { width: CONTENT_WIDTH - 80, align: 'center' },
  );
  return pdf.y + 18;
}

function drawDetailBoxes(pdf, service, startY) {
  const gap = 15;
  const boxWidth = (CONTENT_WIDTH - gap) / 2;
  const leftX = PAGE.margin;
  const rightX = PAGE.margin + boxWidth + gap;
  const customer = service.customer ?? {};

  // Measure left content first so both boxes get the same height
  const leftLines = [
    ['Customer', customer.name || service.customerName],
    ['Company', customer.companyName],
    ['Site address', service.siteAddress || customer.address],
    ['Mobile', customer.mobile && `+91 ${customer.mobile}`],
    ['GSTIN', customer.gstNumber],
  ].filter(([, value]) => value);
  const rightLines = [
    ['Service type', service.serviceType],
    ['Service date', formatDate(service.serviceDate)],
    ['Next due date', service.nextDueDate ? formatDate(service.nextDueDate) : 'Not applicable'],
    ['Technician', service.technician],
    ['Reference', service.id],
  ].filter(([, value]) => value);

  const lineHeight = (text, width) => {
    pdf.font('Helvetica').fontSize(9);
    return Math.max(pdf.heightOfString(String(text), { width }), 11) + 6;
  };
  const valueWidth = boxWidth - 100;
  const contentHeight = (lines) => lines.reduce((sum, [, value]) => sum + lineHeight(value, valueWidth), 0);
  const boxHeight = Math.max(contentHeight(leftLines), contentHeight(rightLines)) + 34;

  const drawBox = (x, title, lines) => {
    pdf.roundedRect(x, startY, boxWidth, boxHeight, 5).fillAndStroke(COLORS.headerBg, COLORS.border);
    drawSectionTitle(pdf, title, x + 12, startY + 10);
    let y = startY + 26;
    for (const [label, value] of lines) {
      pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(8.5).text(label, x + 12, y, { width: 80 });
      pdf.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9).text(String(value), x + 90, y, { width: valueWidth });
      y += lineHeight(value, valueWidth);
    }
  };
  drawBox(leftX, 'Customer & site', leftLines);
  drawBox(rightX, 'Service details', rightLines);
  return startY + boxHeight + 20;
}

function drawEquipment(pdf, equipment, startY) {
  let y = startY;
  drawSectionTitle(pdf, 'Equipment serviced', PAGE.margin, y);
  y += 14;
  if (!equipment.length) {
    pdf.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text('No equipment listed.', PAGE.margin, y);
    return y + 24;
  }

  const drawHeaderRow = (top) => {
    pdf.rect(PAGE.margin, top, CONTENT_WIDTH, 20).fill(COLORS.navy);
    let x = PAGE.margin;
    pdf.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    for (const column of EQUIPMENT_COLUMNS) {
      pdf.text(column.label, x + 5, top + 6.5, { width: column.width - 10, align: column.align });
      x += column.width;
    }
    return top + 20;
  };
  y = drawHeaderRow(y);

  equipment.forEach((item, index) => {
    const values = { index: String(index + 1), name: item.name, quantity: String(item.quantity), details: item.details || '-' };
    pdf.font('Helvetica').fontSize(8.5);
    const rowHeight =
      Math.max(
        pdf.heightOfString(values.name, { width: EQUIPMENT_COLUMNS[1].width - 10 }),
        pdf.heightOfString(values.details, { width: EQUIPMENT_COLUMNS[3].width - 10 }),
        10,
      ) + 10;
    if (y + rowHeight > BOTTOM_LIMIT) {
      pdf.addPage();
      y = drawHeaderRow(PAGE.margin);
    }
    if (index % 2 === 1) pdf.rect(PAGE.margin, y, CONTENT_WIDTH, rowHeight).fill('#f8fafc');
    let x = PAGE.margin;
    for (const column of EQUIPMENT_COLUMNS) {
      pdf.fillColor(COLORS.text).font(column.key === 'name' ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
      pdf.text(values[column.key], x + 5, y + 5, { width: column.width - 10, align: column.align });
      x += column.width;
    }
    y += rowHeight;
    pdf.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT_WIDTH, y).lineWidth(0.5).strokeColor(COLORS.border).stroke();
  });
  return y + 18;
}

function drawRemarks(pdf, remarks, startY) {
  if (!remarks) return startY;
  let y = startY;
  pdf.font('Helvetica').fontSize(9);
  if (y + Math.min(pdf.heightOfString(remarks, { width: CONTENT_WIDTH }) + 20, 120) > BOTTOM_LIMIT) {
    pdf.addPage();
    y = PAGE.margin;
  }
  drawSectionTitle(pdf, 'Observations & remarks', PAGE.margin, y);
  pdf.fillColor(COLORS.text).font('Helvetica').fontSize(9).text(remarks, PAGE.margin, y + 13, { width: CONTENT_WIDTH, lineGap: 2 });
  return pdf.y + 16;
}

function drawNextDueBanner(pdf, nextDueDate, startY) {
  if (!nextDueDate) return startY;
  let y = startY;
  if (y + 40 > BOTTOM_LIMIT) {
    pdf.addPage();
    y = PAGE.margin;
  }
  pdf.roundedRect(PAGE.margin, y, CONTENT_WIDTH, 32, 5).fill('#fff7ed');
  pdf.rect(PAGE.margin, y, 4, 32).fill(COLORS.flame);
  pdf.fillColor(COLORS.text).font('Helvetica').fontSize(10).text('Next service due on ', PAGE.margin + 16, y + 11, { continued: true });
  pdf.font('Helvetica-Bold').fillColor(COLORS.fire).text(formatDate(nextDueDate), { continued: true });
  pdf.font('Helvetica').fillColor(COLORS.muted).fontSize(9).text('  — please contact us to schedule.');
  return y + 46;
}

/**
 * @param {object} service completed service record (with certificateNumber)
 * @returns {Promise<Buffer>}
 */
export function renderServiceCertificatePdf(service) {
  return renderPdf({ title: `Service Certificate ${service.certificateNumber}` }, (pdf) => {
    drawBrandHeader(pdf, { title: 'SERVICE CERTIFICATE', number: service.certificateNumber, date: service.serviceDate });
    let y = drawIntro(pdf, service);
    y = drawDetailBoxes(pdf, service, y);
    y = drawEquipment(pdf, service.equipment ?? [], y);
    y = drawRemarks(pdf, service.remarks, y);
    y = drawNextDueBanner(pdf, service.nextDueDate, y);
    drawSignature(pdf, y, 'Authorised Signatory / Technician');
  });
}

export const certificateFileName = (service) => pdfFileNameFor(service.certificateNumber);
