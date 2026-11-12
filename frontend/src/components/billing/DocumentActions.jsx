import { useState } from 'react';
import { Download, Loader2, MessageCircle, Printer } from 'lucide-react';
import { downloadBlob, openPdfForPrint, pdfFileName, shareOnWhatsApp } from '../../utils/documentFiles.js';
import { useToast } from '../../hooks/useToast.js';

/**
 * Download / Print / WhatsApp buttons for a quotation or invoice PDF.
 * fetchPdf: () => Promise<Blob>; whatsappMessage: pre-filled chat text.
 */
export default function DocumentActions({ number, fetchPdf, mobile, whatsappMessage }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null); // 'download' | 'print' | 'whatsapp' | null
  const fileName = pdfFileName(number);

  const run = async (action, task) => {
    setBusy(action);
    try {
      await task();
    } catch (error) {
      toast.error(error.message || 'Could not generate the PDF.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = () => run('download', async () => downloadBlob(await fetchPdf(), fileName));
  const handlePrint = () => run('print', () => openPdfForPrint(fetchPdf));
  const handleWhatsApp = () =>
    run('whatsapp', async () => {
      const result = await shareOnWhatsApp(fetchPdf, { fileName, mobile, message: whatsappMessage });
      if (result === 'whatsapp-web') toast.success('PDF downloaded. Attach it in the WhatsApp chat that opened.');
    });

  const icon = (action, Icon) =>
    busy === action ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />;

  return (
    // Phones: one row of three equal buttons; wider screens: inline buttons.
    <div className="col-span-2 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
      <button type="button" className="btn-secondary px-2! sm:px-4!" onClick={handleDownload} disabled={Boolean(busy)}>
        {icon('download', Download)}
        <span className="sm:hidden">PDF</span>
        <span className="hidden sm:inline">Download PDF</span>
      </button>
      <button type="button" className="btn-secondary px-2! sm:px-4!" onClick={handlePrint} disabled={Boolean(busy)}>
        {icon('print', Printer)}
        Print
      </button>
      <button type="button" className="btn-secondary px-2! text-emerald-700! sm:px-4!" onClick={handleWhatsApp} disabled={Boolean(busy)}>
        {icon('whatsapp', MessageCircle)}
        WhatsApp
      </button>
    </div>
  );
}
