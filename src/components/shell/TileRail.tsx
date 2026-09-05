// The left rail: a wide AI Mode hero across the top, then the eight tool tiles in
// a two-column grid, then the user chip and the light/dark toggle. A tile floods
// with its tool's signature colour when active; idle tiles carry that hue only in
// a soft icon badge. The header hosts a collapse control. See DESIGN-SPEC.md.
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { PanelLeftClose } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { AI_TILE, TOOL_TILES, type Tile } from './tiles';
import UserMenu from './UserMenu';

const HeroTile: React.FC<{ tile: Tile; active: boolean }> = ({ tile, active }) => {
  const { themeClasses } = useTheme();
  const Icon = tile.icon;
  return (
    <NavLink
      to={tile.route}
      aria-label={tile.label}
      aria-current={active ? 'page' : undefined}
      className={`col-span-2 flex items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${themeClasses.interactive.focus} ${
        active
          ? `${tile.active} shadow-sm`
          : `${themeClasses.card.primary} ${themeClasses.interactive.hover}`
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white/20' : tile.tint}`}>
        <Icon className={`h-5 w-5 ${active ? 'text-white' : tile.idleIcon}`} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`text-[14px] font-semibold ${active ? 'text-white' : themeClasses.text.primary}`}>{tile.label}</span>
        <span className={`text-[11px] ${active ? 'text-white/75' : themeClasses.text.muted}`}>Ask for anything</span>
      </span>
    </NavLink>
  );
};

const ToolTile: React.FC<{ tile: Tile; active: boolean }> = ({ tile, active }) => {
  const { themeClasses } = useTheme();
  const Icon = tile.icon;

  if (!tile.enabled) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 opacity-70 ${themeClasses.card.secondary}`}
        title={tile.soon ? `${tile.label}, coming soon` : tile.label}
        aria-disabled="true"
      >
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tile.tint}`}>
          <Icon className={`h-[18px] w-[18px] ${themeClasses.text.muted}`} />
        </span>
        <span className={`text-[11px] font-medium ${themeClasses.text.muted}`}>{tile.label}</span>
        {tile.soon && <span className={`rounded-full px-1.5 text-[9px] font-medium ${themeClasses.card.primary} ${themeClasses.text.muted}`}>Soon</span>}
      </div>
    );
  }

  return (
    <NavLink
      to={tile.route}
      aria-label={tile.label}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 transition-colors ${themeClasses.interactive.focus} ${
        active
          ? `${tile.active} shadow-sm`
          : `${themeClasses.card.primary} ${themeClasses.interactive.hover}`
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-white/20' : tile.tint}`}>
        <Icon className={`h-[18px] w-[18px] ${active ? 'text-white' : tile.idleIcon}`} />
      </span>
      <span className={`text-[11px] font-medium ${active ? 'text-white' : themeClasses.text.secondary}`}>{tile.label}</span>
    </NavLink>
  );
};

const TileRail: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const { themeClasses } = useTheme();
  const { pathname } = useLocation();

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');
  const aiActive = isActive('/staff/ai') || pathname === '/staff/dashboard' || pathname === '/staff';

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-1 px-1.5 pt-0.5">
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={`truncate text-[13px] font-semibold ${themeClasses.text.primary}`}>Ink, Toner &amp; Moore</span>
          <span className={`text-[11px] ${themeClasses.text.muted}`}>Staff Dashboard</span>
        </span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse menu"
            title="Collapse menu"
            className={`hidden h-7 w-7 items-center justify-center rounded-lg lg:flex ${themeClasses.text.muted} ${themeClasses.interactive.hover}`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav aria-label="Staff tools" className="grid grid-cols-2 gap-2">
        <HeroTile tile={AI_TILE} active={aiActive} />
        {TOOL_TILES.map((tile) => (
          <ToolTile key={tile.key} tile={tile} active={tile.enabled && isActive(tile.route)} />
        ))}
      </nav>

      <div className="mt-auto">
        <div className={`mb-3 h-px ${themeClasses.card.secondary}`} />
        <UserMenu />
      </div>
    </div>
  );
};

export default TileRail;
