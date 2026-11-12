/** Sends a PDF buffer. `inline` lets browsers preview/print; the filename is used on download. */
export function sendPdf(res, buffer, fileName) {
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Length': buffer.length,
    'Content-Disposition': `inline; filename="${fileName}"`,
    'Cache-Control': 'private, no-store', // business documents must not be cached by proxies
  });
  res.send(buffer);
}
