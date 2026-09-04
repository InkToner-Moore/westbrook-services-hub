// A single fixed dock that lets staff jump between mini-apps from any staff
// screen and open AI Mode. Mounted once in App.tsx, outside <Routes>, so it works
// over every page whether or not that page uses StaffLayout, and touches none of
// them. Visible only to a signed-in user on a /staff/... page.
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Package,
  Receipt,
  Box,
  Printer,
  StickyNote,
  Boxes,
  BookMarked,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useAiMode } from '@/ai/context';

interface TabItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
}

// Classic mini-apps, in a calm, fixed order. AI Mode is handled separately as the
// emphasized action, so it is not in this list.
const TABS: TabItem[] = [
  { label: 'Tracking', icon: Package, route: '/staff/tracking' },
  { label: 'Receipts', icon: Receipt, route: '/staff/receipts' },
  { label: 'Packing', icon: Box, route: '/staff/packing' },
  { label: 'Cartridges', icon: Printer, route: '/staff/cartridges' },
  { label: 'Notes', icon: StickyNote, route: '/staff/notes' },
  { label: 'Inventory', icon: Boxes, route: '/staff/inventory' },
  { label: 'Directory', icon: BookMarked, route: '/staff/directory' },
  { label: 'Follow-Ups', icon: ClipboardList, route: '/staff/requests' },
];

const TabDock: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { themeClasses, isDarkMode } = useTheme();
  const { isOpen, toggle, close } = useAiMode();

  // Only show for a signed-in staff member on an actual staff sub-page. The bare
  // /staff login route and every public route render nothing.
  const onStaffPage = pathname.startsWith('/staff/');
  if (!user || !onStaffPage) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-3 pb-3 pointer-events-none print:hidden">
      <div
        className={`pointer-events-auto flex items-center gap-1 rounded-2xl border px-2 py-1.5 backdrop-blur-xl ${themeClasses.header} shadow-lg`}
      >
        {/* AI Mode: the emphasized action. */}
        <button
          type="button"
          onClick={toggle}
          aria-label="AI Mode"
          aria-pressed={isOpen}
          className={`group flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            isOpen ? themeClasses.button.primary : themeClasses.button.ghost
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <span className={`mx-1 h-6 w-px ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />

        {TABS.map((tab) => {
          const active = pathname === tab.route;
          const Icon = tab.icon;
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => {
                // Reveal the classic page: navigate and close the AI overlay.
                navigate(tab.route);
                close();
              }}
              title={tab.label}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                active
                  ? `${themeClasses.card.accent} ${themeClasses.text.accent}`
                  : `${themeClasses.text.secondary} ${themeClasses.interactive.hover}`
              }`}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabDock;
