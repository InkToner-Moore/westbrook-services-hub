// Download / print controls for a generated receipt, shown in the chat (not in
// the Artifact, per the brief). Both sizes plus one-click print.
import React from 'react';
import { Download, Printer } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ReceiptPayload } from '@/ai/types';
import { downloadReceipt, printReceipt } from '@/ai/receiptOutput';

const ReceiptControls: React.FC<{ receipt: ReceiptPayload }> = ({ receipt }) => {
  const { themeClasses } = useTheme();
  const { opts } = receipt;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => downloadReceipt(opts, '4x6')}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${themeClasses.button.secondary}`}
      >
        <Download className="h-4 w-4" />
        4x6 label
      </button>
      <button
        type="button"
        onClick={() => downloadReceipt(opts, 'letter')}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${themeClasses.button.secondary}`}
      >
        <Download className="h-4 w-4" />
        Full page
      </button>
      <button
        type="button"
        onClick={() => printReceipt(opts, 'letter')}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${themeClasses.button.primary}`}
      >
        <Printer className="h-4 w-4" />
        Print
      </button>
    </div>
  );
};

export default ReceiptControls;
