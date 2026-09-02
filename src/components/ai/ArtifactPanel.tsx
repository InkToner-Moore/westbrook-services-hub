// The single Artifact panel. When AI Mode has something larger or contained to
// show, it slides in over the chat and fills a defined region (a right-side sheet
// on desktop, full width on mobile). Only one Artifact exists at a time.
import React, { useMemo } from 'react';
import { ExternalLink, Package, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { receiptPreviewUri } from '@/ai/receiptOutput';
import type { TrackingCard } from '@/ai/tracking';
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

const TrackingArtifact: React.FC<{ card: TrackingCard }> = ({ card }) => {
  const { themeClasses } = useTheme();
  return (
    <div className={`rounded-2xl border p-5 ${themeClasses.card.secondary}`}>
      <div className="flex items-center gap-2">
        <Package className={`h-5 w-5 ${themeClasses.text.accent}`} />
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>
          {card.courier ?? 'Unknown carrier'}
        </span>
      </div>
      <p className={`mt-3 font-mono text-lg ${themeClasses.text.primary}`}>{card.trackingNumber}</p>
      {card.url ? (
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ${themeClasses.button.primary}`}
        >
          <ExternalLink className="h-4 w-4" />
          Open on {card.courier}
        </a>
      ) : (
        <p className={`mt-3 text-sm ${themeClasses.text.muted}`}>
          Tell me the carrier and I will open its tracking page.
        </p>
      )}
      <p className={`mt-4 text-xs ${themeClasses.text.muted}`}>
        Live in-app status is coming soon. For now this opens the carrier's official page.
      </p>
    </div>
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
        {artifact.kind === 'tracking' && <TrackingArtifact card={artifact.data as TrackingCard} />}
        {artifact.kind !== 'receipt' && artifact.kind !== 'tracking' && (
          <p className={`text-sm ${themeClasses.text.muted}`}>Nothing to show yet.</p>
        )}
      </div>
    </div>
  );
};

export default ArtifactPanel;
