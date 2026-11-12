import ExcelJS from 'exceljs';

/**
 * Turns any report (see report.service.js) into a readable, formatted
 * workbook: title, period, summary block, then a filterable data table.
 * Money and dates are real Excel numbers/dates, so the owner can sort,
 * filter and add formulas.
 */

const NAVY = 'FF0F172A';
const FLAME = 'FFF26A1B';
const MONEY_FORMAT = '₹#,##0.00;[Red]-₹#,##0.00';
const DATE_FORMAT = 'dd-mmm-yyyy';

const toCellValue = (value, type) => {
  if (value === undefined || value === null || value === '') return '';
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`);
  if (type === 'money' || type === 'number') return Number(value);
  return value;
};

const formatFor = (type) => (type === 'money' ? MONEY_FORMAT : type === 'date' ? DATE_FORMAT : type === 'number' ? '#,##0.###' : undefined);

/**
 * @param {object} report report object from buildReport()
 * @param {{ businessName: string }} meta
 * @returns {Promise<Buffer>}
 */
export async function reportToExcel(report, { businessName }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AgniDesk';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(report.title.slice(0, 31));
  const columnCount = Math.max(report.columns.length, 2);

  // Title block
  sheet.mergeCells(1, 1, 1, columnCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `${businessName} — ${report.title}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  sheet.getRow(1).height = 24;

  sheet.mergeCells(2, 1, 2, columnCount);
  const periodText = report.period
    ? `${report.periodMode === 'asOf' ? 'As of' : 'Period'}: ${report.periodMode === 'asOf' ? report.period.to : `${report.period.from} to ${report.period.to}`}`
    : 'Current position';
  sheet.getCell(2, 1).value = `${periodText}   ·   Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
  sheet.getCell(2, 1).font = { italic: true, color: { argb: 'FF64748B' } };

  let rowIndex = 4;
  if (report.note) {
    sheet.mergeCells(rowIndex, 1, rowIndex, columnCount);
    sheet.getCell(rowIndex, 1).value = report.note;
    sheet.getCell(rowIndex, 1).alignment = { wrapText: true };
    sheet.getRow(rowIndex).height = 30;
    rowIndex += 2;
  }

  // Summary block
  sheet.getCell(rowIndex, 1).value = 'SUMMARY';
  sheet.getCell(rowIndex, 1).font = { bold: true, color: { argb: FLAME } };
  rowIndex += 1;
  for (const item of report.summary) {
    sheet.getCell(rowIndex, 1).value = item.label;
    const valueCell = sheet.getCell(rowIndex, 2);
    valueCell.value = toCellValue(item.value, item.type);
    if (formatFor(item.type)) valueCell.numFmt = formatFor(item.type);
    valueCell.font = { bold: true };
    rowIndex += 1;
  }
  rowIndex += 1;

  // Data table
  const headerRowIndex = rowIndex;
  report.columns.forEach((column, i) => {
    const cell = sheet.getCell(headerRowIndex, i + 1);
    cell.value = column.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: column.type === 'money' || column.type === 'number' ? 'right' : 'left' };
  });
  sheet.getRow(headerRowIndex).height = 20;

  report.rows.forEach((row, r) => {
    report.columns.forEach((column, c) => {
      const cell = sheet.getCell(headerRowIndex + 1 + r, c + 1);
      cell.value = toCellValue(row[column.key], column.type);
      if (formatFor(column.type)) cell.numFmt = formatFor(column.type);
    });
  });

  if (report.rows.length) {
    sheet.autoFilter = { from: { row: headerRowIndex, column: 1 }, to: { row: headerRowIndex + report.rows.length, column: report.columns.length } };
  } else {
    sheet.getCell(headerRowIndex + 1, 1).value = 'No records for this period.';
  }
  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

  // Column widths from content (capped)
  report.columns.forEach((column, i) => {
    const longest = Math.max(
      column.label.length,
      ...report.rows.slice(0, 500).map((row) => String(row[column.key] ?? '').length),
      i < 2 ? Math.max(...report.summary.map((s) => String(i === 0 ? s.label : s.value).length), 0) : 0,
    );
    sheet.getColumn(i + 1).width = Math.min(Math.max(longest + 3, column.type === 'money' ? 14 : 10), 50);
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
