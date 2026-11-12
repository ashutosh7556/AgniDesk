/**
 * Download / print / WhatsApp helpers for PDF blobs.
 *
 * WhatsApp: links (wa.me) cannot attach files. On phones/tablets that support
 * the Web Share API with files (Android Chrome, iOS Safari) the PDF itself is
 * shared — the user picks WhatsApp in the share sheet. On desktop we always
 * open a WhatsApp chat with a pre-filled message and download the PDF so it
 * can be attached manually.
 */

/** "INV/2026-27/0001" -> "INV-2026-27-0001.pdf" (matches the backend). */
export const pdfFileName = (number) => `${number.replace(/[^\w-]+/g, '-')}.pdf`;

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Opens the PDF in a new tab for printing. The tab is opened synchronously
 * (before the PDF is fetched) so popup blockers allow it.
 */
export async function openPdfForPrint(fetchPdf) {
  const tab = window.open('', '_blank');
  try {
    const blob = await fetchPdf();
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

/** Phones/tablets only: desktop Windows/macOS also support file sharing, but their share dialogs often don't offer WhatsApp. */
const isMobileDevice = () =>
  navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const canShareFiles = () => {
  if (!isMobileDevice()) return false;
  try {
    return Boolean(
      navigator.canShare?.({ files: [new File([''], 'test.pdf', { type: 'application/pdf' })] }),
    );
  } catch {
    return false;
  }
};

/**
 * @param {() => Promise<Blob>} fetchPdf
 * @param {{ fileName: string, mobile?: string, message: string }} options
 * @returns {Promise<'shared' | 'whatsapp-web'>}
 */
export async function shareOnWhatsApp(fetchPdf, { fileName, mobile, message }) {
  if (canShareFiles()) {
    const blob = await fetchPdf();
    const file = new File([blob], fileName, { type: 'application/pdf' });
    try {
      await navigator.share({ files: [file], text: message });
    } catch (error) {
      if (error.name !== 'AbortError') throw error; // user closed the share sheet
    }
    return 'shared';
  }

  // Desktop fallback: open the chat first (synchronously, avoids popup blocking), then download.
  const phone = mobile ? `91${mobile}` : '';
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  const blob = await fetchPdf();
  downloadBlob(blob, fileName);
  return 'whatsapp-web';
}
