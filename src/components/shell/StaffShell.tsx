// The staff shell: the three-pane frame that replaces the old dashboard + overlay.
// Left = tile rail, center = the active tool (AI chat by default) via <Outlet/>,
// right = the artifact rail. On desktop all three show at once; on a phone it is a
// single column (AI-first) with the rail in a slide-in drawer and the artifact in a
// slide-up sheet. See docs/ui-rehaul/DESIGN-SPEC.md and PLAN.md.
import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, PanelRight, X, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';
import { ShellContext } from './ShellContext';
import TileRail from './TileRail';
import ArtifactRail from './ArtifactRail';

const StaffShell: React.FC = () => {
  const { themeClasses } = useTheme();
  const { artifact } = useAiMode();
  const { pathname } = useLocation();
  const [railOpen, setRailOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const hasArtifact = !!artifact && artifact.kind !== 'none';

  // Close the mobile drawer whenever the route changes (a tile was tapped).
  React.useEffect(() => {
    setRailOpen(false);
  }, [pathname]);

  return (
    <ShellContext.Provider value={{ inShell: true }}>
      <div className={`flex h-[100dvh] w-full overflow-hidden ${themeClasses.background}`}>
        {/* Left rail - desktop */}
        <aside className={`hidden w-52 shrink-0 border-r lg:block ${themeClasses.header}`}>
          <TileRail />
        </aside>

        {/* Center + mobile chrome */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <div className={`flex items-center justify-between border-b px-3 py-2 lg:hidden ${themeClasses.header}`}>
            <button
              type="button"
              onClick={() => setRailOpen(true)}
              aria-label="Open menu"
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${themeClasses.interactive.hover}`}
            >
              <Menu className={`h-5 w-5 ${themeClasses.text.secondary}`} />
            </button>
            <span className={`flex items-center gap-1.5 text-sm font-semibold ${themeClasses.text.primary}`}>
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Ink, Toner &amp; Moore
            </span>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label="Open workspace"
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${themeClasses.interactive.hover}`}
            >
              <PanelRight className={`h-5 w-5 ${themeClasses.text.secondary}`} />
              {hasArtifact && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />}
            </button>
          </div>

          <main className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>

        {/* Right rail - desktop */}
        <aside className={`hidden w-[400px] shrink-0 border-l xl:block ${themeClasses.card.primary}`}>
          <ArtifactRail />
        </aside>

        {/* Mobile tile drawer */}
        {railOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setRailOpen(false)} />
            <div className={`absolute inset-y-0 left-0 w-64 border-r shadow-lg ${themeClasses.header}`}>
              <div className="flex justify-end p-2">
                <button type="button" onClick={() => setRailOpen(false)} aria-label="Close menu" className={`rounded-lg p-1.5 ${themeClasses.interactive.hover}`}>
                  <X className={`h-5 w-5 ${themeClasses.text.secondary}`} />
                </button>
              </div>
              <TileRail />
            </div>
          </div>
        )}

        {/* Mobile artifact sheet */}
        {sheetOpen && (
          <div className="fixed inset-0 z-[80] xl:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
            <div className={`absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-2xl border-t shadow-lg ${themeClasses.card.primary}`}>
              <div className="flex justify-end p-2">
                <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close workspace" className={`rounded-lg p-1.5 ${themeClasses.interactive.hover}`}>
                  <X className={`h-5 w-5 ${themeClasses.text.secondary}`} />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <ArtifactRail />
              </div>
            </div>
          </div>
        )}
      </div>
    </ShellContext.Provider>
  );
};

export default StaffShell;
