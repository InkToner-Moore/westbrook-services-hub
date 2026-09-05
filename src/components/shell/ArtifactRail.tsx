// The right rail: the current artifact. Everything the assistant wants you to look
// at or confirm shows here - a receipt preview, a tracking stub, an order list, or
// a details-to-confirm slip - with its action buttons (Confirm, Not now, Download,
// Print, Open on carrier) pinned to the foot. The chat on the left just points you
// here. Only one artifact exists at a time. See docs/ui-rehaul/DESIGN-SPEC.md.
//
// The rail renders the current artifact from ANY center route (it is mounted by
// StaffShell regardless of the active tool), so a finished receipt stays visible
// after leaving AI Mode. Each kind's card comes from ARTIFACT_RENDERERS
// (artifactRegistry); a kind with no registered renderer falls back to the
// generic ArtifactPanel + ArtifactActions so nothing breaks before a bespoke
// card exists.
import React from 'react';
import { History, PanelRight, PanelRightClose } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import type { ArtifactState } from '@/ai/types';
import ArtifactPanel from '@/components/ai/ArtifactPanel';
import ArtifactActions from '@/components/ai/ArtifactActions';
import { ARTIFACT_RENDERERS, type ArtifactRenderer } from './artifactRegistry';

// Renders a registered renderer: its Body inside the scrolling frame, then its
// Foot (or the generic ArtifactActions foot when it has none), wrapped in the
// renderer's Provider when it needs to share state between Body and Foot.
const RegisteredArtifact: React.FC<{ renderer: ArtifactRenderer; kind: string; data: unknown }> = ({
  renderer,
  kind,
  data,
}) => {
  const { Body, Foot, Provider } = renderer;
  const inner = (
    <>
      <div className="flex-1 overflow-auto p-3">
        <Body data={data} />
      </div>
      {Foot ? <Foot data={data} /> : <ArtifactActions kind={kind} data={data} />}
    </>
  );
  return Provider ? <Provider data={data}>{inner}</Provider> : inner;
};

interface ArtifactRailProps {
  onCollapse?: () => void;
  // The last non-confirmation artifact that was shown, so the rail can offer a
  // "Show last" reopen when there is nothing live. StaffShell owns this state
  // (a local fallback until A1 promotes lastArtifact/reopenLastArtifact into the
  // AI context; see the report). Absent when there is nothing to reopen.
  lastArtifact?: ArtifactState | null;
  onReopenLast?: () => void;
}

const ArtifactRail: React.FC<ArtifactRailProps> = ({ onCollapse, lastArtifact, onReopenLast }) => {
  const { themeClasses } = useTheme();
  const { artifact } = useAiMode();
  const hasArtifact = !!artifact && artifact.kind !== 'none';
  const renderer = hasArtifact ? ARTIFACT_RENDERERS[artifact!.kind] : undefined;
  const canReopen = !hasArtifact && !!lastArtifact && !!onReopenLast;

  return (
    <div className="flex h-full flex-col">
      <header className={`flex items-center gap-2 border-b px-4 py-3 ${themeClasses.header}`}>
        <PanelRight className={`h-4 w-4 ${themeClasses.text.secondary}`} />
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>
          {hasArtifact ? artifact?.title ?? 'Details' : 'Workspace'}
        </span>
        {canReopen && (
          <button
            type="button"
            onClick={onReopenLast}
            title="Show the last item"
            className={`ml-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`}
          >
            <History className="h-3.5 w-3.5" />
            Show last
          </button>
        )}
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse workspace"
            title="Collapse workspace"
            className={`${canReopen ? '' : 'ml-auto'} hidden h-7 w-7 items-center justify-center rounded-lg xl:flex ${themeClasses.text.muted} ${themeClasses.interactive.hover}`}
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        )}
      </header>

      {hasArtifact && renderer ? (
        <RegisteredArtifact renderer={renderer} kind={artifact!.kind} data={artifact!.data} />
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
          {canReopen && (
            <button
              type="button"
              onClick={onReopenLast}
              className={`mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm ${themeClasses.button.secondary}`}
            >
              <History className="h-4 w-4" />
              Show last item
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ArtifactRail;
