// The right rail: the current artifact. Everything the assistant wants you to look
// at or confirm shows here - a receipt preview, a tracking stub, an order list, or
// a details-to-confirm slip - with its action buttons (Confirm, Not now, Download,
// Print, Open on carrier) pinned to the foot. The chat on the left just points you
// here. Only one artifact exists at a time. See docs/ui-rehaul/DESIGN-SPEC.md.
import React from 'react';
import { PanelRight, PanelRightClose } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode, type ConfirmationArtifactData } from '@/ai/context';
import { getFieldSpecs } from '@/ai/fieldSpecs';
import ArtifactPanel from '@/components/ai/ArtifactPanel';
import ArtifactActions from '@/components/ai/ArtifactActions';
import ConfirmationCheck, { useConfirmationDraft } from '@/components/ai/ConfirmationCheck';

// The pending confirmation is its own case: the slip and its foot share one
// editable draft, owned here (their common parent) via useConfirmationDraft.
const ConfirmationArtifact: React.FC<{ data: ConfirmationArtifactData }> = ({ data }) => {
  const { busy, rerouteIntent, confirmArtifactIntent, dismissArtifactIntent } = useAiMode();
  const specs = getFieldSpecs(data.intent) ?? [];
  const draft = useConfirmationDraft(data.intent, specs);

  return (
    <>
      <div className="flex-1 overflow-auto p-3">
        <ConfirmationCheck
          intent={data.intent}
          specs={specs}
          draft={draft}
          onReroute={(action, subtype) => rerouteIntent(data.turnId, data.sourceText, action, subtype)}
        />
      </div>
      <ArtifactActions
        kind="confirmation"
        confirmation={{
          canConfirm: draft.canConfirm,
          missing: draft.missing,
          busy,
          onConfirm: () => confirmArtifactIntent(data.turnId, draft.workingIntent),
          onDismiss: () => dismissArtifactIntent(data.turnId),
        }}
      />
    </>
  );
};

const ArtifactRail: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const { themeClasses } = useTheme();
  const { artifact } = useAiMode();
  const hasArtifact = !!artifact && artifact.kind !== 'none';

  return (
    <div className="flex h-full flex-col">
      <header className={`flex items-center gap-2 border-b px-4 py-3 ${themeClasses.header}`}>
        <PanelRight className={`h-4 w-4 ${themeClasses.text.secondary}`} />
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>
          {hasArtifact ? artifact?.title ?? 'Details' : 'Workspace'}
        </span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse workspace"
            title="Collapse workspace"
            className={`ml-auto hidden h-7 w-7 items-center justify-center rounded-lg xl:flex ${themeClasses.text.muted} ${themeClasses.interactive.hover}`}
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        )}
      </header>

      {hasArtifact && artifact?.kind === 'confirmation' ? (
        <ConfirmationArtifact data={artifact.data as ConfirmationArtifactData} />
      ) : hasArtifact ? (
        <>
          <ArtifactPanel />
          <ArtifactActions kind={artifact!.kind} data={artifact!.data} />
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${themeClasses.card.secondary}`}>
            <PanelRight className={`h-6 w-6 ${themeClasses.text.muted}`} />
          </div>
          <p className={`text-sm font-medium ${themeClasses.text.secondary}`}>Nothing to review yet</p>
          <p className={`mt-1 max-w-[16rem] text-[13px] ${themeClasses.text.muted}`}>
            Receipts, tracking, and anything to confirm will show up here.
          </p>
        </div>
      )}
    </div>
  );
};

export default ArtifactRail;
