// The staff shell: the three-pane frame that replaces the old dashboard + overlay.
// Left = tile rail, center = the active tool (AI chat by default) via <Outlet/>,
// right = the artifact rail. On desktop the tile rail collapses to a slim reopen
// strip, and the artifact rail only takes room while there is something in it (it
// opens by itself when a result or a slip arrives). On a phone it is a single
// column (AI-first) with the rail in a slide-in drawer and the artifact in a
// slide-up sheet that also opens by itself.
// See docs/ui-rehaul/DESIGN-SPEC.md and PLAN.md.
import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, PanelRight, PanelLeftOpen, PanelRightOpen, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import type { ArtifactState } from '@/ai/types';
import { ShellContext } from './ShellContext';
import TileRail from './TileRail';
import ArtifactRail from './ArtifactRail';
import { useStaffAppMeta } from '@/hooks/useStaffAppMeta';
import CartPanel from '@/components/ai/CartPanel';

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const StaffShell: React.FC = () => {
  useStaffAppMeta();
  const { themeClasses } = useTheme();
  const { artifact, showArtifact, cart } = useAiMode();
  const { pathname } = useLocation();
  const isChatRoute = pathname.replace(/\/+$/, '') === '/staff/ai';
  const [railOpen, setRailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(() => readFlag('shell-left-collapsed'));
  const [rightCollapsed, setRightCollapsed] = useState(false);

  const hasArtifact = !!artifact && artifact.kind !== 'none';

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame: number | null = null;
    root.classList.add('staff-shell-active');

    const updateViewport = () => {
      frame = null;
      if (!viewport) return;
      // Pinch zoom shrinks the visual viewport too; only the keyboard should resize the shell.
      const zoomed = Math.abs(viewport.scale - 1) > 0.01;
      root.style.setProperty('--staff-vh', `${Math.round(viewport.height * viewport.scale)}px`);
      if (!zoomed && viewport.offsetTop !== 0) window.scrollTo(0, 0);
    };
    const scheduleUpdate = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateViewport);
    };

    updateViewport();
    viewport?.addEventListener('resize', scheduleUpdate);
    viewport?.addEventListener('scroll', scheduleUpdate);
    return () => {
      viewport?.removeEventListener('resize', scheduleUpdate);
      viewport?.removeEventListener('scroll', scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
      root.style.removeProperty('--staff-vh');
      root.classList.remove('staff-shell-active');
    };
  }, []);

  // Remember the last real result so the rail can offer a "Show last" reopen
  // after a tool switch clears the live artifact. Confirmation slips are
  // transient (their turn is confirmed or dismissed), so they are not kept.
  // Local fallback until A1 promotes lastArtifact/reopenLastArtifact into the AI
  // context; see the report.
  const [lastArtifact, setLastArtifact] = useState<ArtifactState | null>(null);
  useEffect(() => {
    if (artifact && artifact.kind !== 'none' && artifact.kind !== 'confirmation') {
      setLastArtifact(artifact);
    }
  }, [artifact]);
  const reopenLast = () => {
    if (lastArtifact) showArtifact(lastArtifact);
  };
  // A dot marks the rail when there is something live OR something to reopen.
  const showDot = hasArtifact || !!lastArtifact;

  useEffect(() => {
    try {
      localStorage.setItem('shell-left-collapsed', leftCollapsed ? '1' : '0');
    } catch { /* storage unavailable */ }
  }, [leftCollapsed]);

  // Something new to look at: bring it into view. On desktop that reopens the
  // rail if it was tucked away; below xl it lifts the sheet, so nobody has to
  // hunt for the panel button to find a slip waiting on Confirm.
  // A typed change to the slip already open is not something new: the sheet
  // stays down so the clerk can read the reply and keep typing.
  const shownKey = useRef<string | null>(null);
  useEffect(() => {
    if (!artifact || artifact.kind === 'none') {
      shownKey.current = null;
      return;
    }
    const turnId = (artifact.data as { turnId?: string } | undefined)?.turnId;
    const key = artifact.kind === 'confirmation' && turnId ? `slip:${turnId}` : null;
    const sameSlip = key !== null && key === shownKey.current;
    shownKey.current = key;
    if (sameSlip) return;
    setRightCollapsed(false);
    if (window.matchMedia('(max-width: 1279px)').matches) setSheetOpen(true);
  }, [artifact]);

  // Close the mobile drawer whenever the route changes (a tile was tapped).
  useEffect(() => {
    setRailOpen(false);
  }, [pathname]);

  const openWorkspace = () => {
    setRightCollapsed(false);
    setSheetOpen(true);
  };

  return (
    <ShellContext.Provider value={{ inShell: true, openWorkspace }}>
      <div className={`flex h-[var(--staff-vh,100dvh)] w-full overflow-hidden ${themeClasses.background}`}>
        {/* Left rail - desktop (full, or a slim reopen strip when collapsed) */}
        {leftCollapsed ? (
          <aside className={`hidden w-10 shrink-0 flex-col items-center border-r pt-2 lg:flex ${themeClasses.header}`}>
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              aria-label="Expand menu"
              title="Expand menu"
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-pub-muted ${themeClasses.interactive.hover}`}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </aside>
        ) : (
          <aside className={`hidden w-52 shrink-0 border-r lg:block ${themeClasses.header}`}>
            <TileRail onCollapse={() => setLeftCollapsed(true)} />
          </aside>
        )}

        {/* Center + mobile chrome */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <div className={`flex items-center justify-between border-b px-3 py-2 lg:hidden ${themeClasses.header}`}>
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              aria-label="Open menu"
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${themeClasses.interactive.hover}`}
            >
              <Menu className="h-5 w-5 text-pub-muted" />
            </button>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-pub-ink">
              <Sparkles className="h-4 w-4 text-pub-accent" />
              Ink, Toner &amp; Moore
            </span>
            {/* With something waiting, the button names it; an icon alone hides a
                slip that still needs a Confirm. */}
            {hasArtifact ? (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className={`inline-flex h-11 max-w-[9.5rem] items-center gap-1.5 rounded-xl px-3 text-sm font-medium ${themeClasses.button.secondary}`}
              >
                <PanelRight className="h-4 w-4 shrink-0" />
                <span className="truncate">{artifact?.kind === 'confirmation' ? 'Open slip' : 'Open result'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                aria-label="Open workspace"
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${themeClasses.interactive.hover}`}
              >
                <PanelRight className="h-5 w-5 text-pub-muted" />
                {showDot && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pub-accent" />}
              </button>
            )}
          </div>

          <main className={`min-h-0 flex-1 overscroll-contain ${
            isChatRoute ? 'overflow-hidden' : 'overflow-auto'
          }`}>
            <Outlet />
          </main>
          {!isChatRoute && cart.length > 0 && (
            <div className={`shrink-0 border-t pb-[env(safe-area-inset-bottom)] ${themeClasses.background}`}>
              <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:px-6">
                <CartPanel className="" />
              </div>
            </div>
          )}
        </div>

        {/* Right rail - desktop. Full while it holds something; a slim strip when
            tucked away or when there is only a last item to bring back; gone
            when there is nothing at all, so the tool gets the room. */}
        {hasArtifact && !rightCollapsed ? (
          <aside className="hidden w-[400px] shrink-0 border-l xl:block bg-pub-paper border-pub-edge">
            <ArtifactRail onCollapse={() => setRightCollapsed(true)} lastArtifact={lastArtifact} onReopenLast={reopenLast} />
          </aside>
        ) : showDot ? (
          <aside className={`hidden w-10 shrink-0 flex-col items-center border-l pt-2 xl:flex ${themeClasses.header}`}>
            <button
              type="button"
              onClick={() => (hasArtifact ? setRightCollapsed(false) : reopenLast())}
              aria-label={hasArtifact ? 'Show panel' : 'Show last item'}
              title={hasArtifact ? 'Show panel' : 'Show last item'}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-pub-muted ${themeClasses.interactive.hover}`}
            >
              <PanelRightOpen className="h-4 w-4" />
              {hasArtifact && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-pub-accent" />}
            </button>
          </aside>
        ) : null}

        {/* Mobile tile drawer */}
        {railOpen && (
          <div className="fixed inset-x-0 top-0 z-[80] h-[var(--staff-vh,100dvh)] lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setRailOpen(false)} />
            <div className={`absolute inset-y-0 left-0 flex w-64 flex-col overflow-hidden
              border-r shadow-lg ${themeClasses.header}`}>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <TileRail onClose={() => setRailOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile artifact sheet. It stays mounted while there is an artifact and
            is only hidden when closed, so edits made on a slip survive a trip
            back to the chat to type a change. */}
        {(sheetOpen || hasArtifact) && (
          <div className={`fixed inset-x-0 top-0 z-[80] h-[var(--staff-vh,100dvh)] xl:hidden ${sheetOpen ? '' : 'hidden'}`}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-2xl border-t shadow-lg bg-pub-paper border-pub-edge">
              <div className="min-h-0 flex-1">
                <ArtifactRail
                  onBack={() => setSheetOpen(false)}
                  backLabel={isChatRoute ? 'Back to chat' : 'Back'}
                  lastArtifact={lastArtifact}
                  onReopenLast={reopenLast}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
};

export default StaffShell;
