// The single Artifact panel. When AI Mode has something larger or contained to
// show, it slides in over the chat and fills a defined region (a right-side sheet
// on desktop, full width on mobile). Only one Artifact exists at a time.
import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { receiptPreviewUri } from '@/ai/receiptOutput';
import type { SimpleReceiptOptions } from '@/lib/simpleReceipt';

const ReceiptArtifact: React.FC<{ opts: SimpleReceiptOptions }> = ({ opts }) => {
  // Preview the full-page version; the chat controls download either size.
  const uri = useMemo(() => receiptPreviewUri(opts, 'letter'), [opts]);
  return (
    <iframe
      title="Receipt preview"
      src={uri}
      className="h-full w-full rounded-xl border-0 bg-white"
    />
  );
};

const ArtifactPanel: React.FC = () => {
  const { themeClasses } = useTheme();
  const { artifact, hideArtifact } = useAiMode();

  if (!artifact || artifact.kind === 'none') return null;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-[65] flex w-full flex-col border-l shadow-2xl md:w-1/2 lg:w-[46%] ${themeClasses.card.primary} print:hidden`}
    >
      <header className={`flex items-center justify-between border-b px-4 py-3 ${themeClasses.header}`}>
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>
          {artifact.title ?? 'Details'}
        </span>
        <button
          type="button"
          onClick={hideArtifact}
          aria-label="Close panel"
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-auto p-3">
        {artifact.kind === 'receipt' && (
          <ReceiptArtifact opts={(artifact.data as { opts: SimpleReceiptOptions }).opts} />
        )}
        {artifact.kind !== 'receipt' && (
          <p className={`text-sm ${themeClasses.text.muted}`}>Nothing to show yet.</p>
        )}
      </div>
    </div>
  );
};

export default ArtifactPanel;
