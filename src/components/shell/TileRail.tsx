// The left rail: the AI Mode 1x2 hero tile, eight 1x1 tool tiles in a two-column
// grid, then a rule, then the user chip and the light/dark toggle. A tile floods
// with its tool's signature colour when that tool is active - the one bold move
// in the UI, so the flood is a clean, immediate flat fill with a white mark and a
// bolder label, plus a soft lift (the one shadow this app spends). Idle tiles stay
// quiet paper; only their icon carries the tool's hue. See docs/ui-rehaul/DESIGN-SPEC.md.
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { AI_TILE, TOOL_TILES, type Tile } from './tiles';
import UserMenu from './UserMenu';

const TileButton: React.FC<{ tile: Tile; active: boolean }> = ({ tile, active }) => {
  const { themeClasses } = useTheme();
  const Icon = tile.icon;

  const base =
    'group relative flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-2xl border select-none transition-colors duration-150';
  const hero = tile.hero ? 'col-start-1 row-start-1 row-span-2' : '';

  if (!tile.enabled) {
    return (
      <div
        className={`${base} ${hero} cursor-not-allowed ${themeClasses.card.secondary} opacity-70`}
        title={tile.soon ? `${tile.label}, coming soon` : tile.label}
        aria-disabled="true"
      >
        <Icon className={`h-5 w-5 ${themeClasses.text.muted}`} />
        <span className={`text-[11px] font-medium ${themeClasses.text.muted}`}>{tile.label}</span>
        {tile.soon && (
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${themeClasses.card.primary} ${themeClasses.text.muted}`}>
            Soon
          </span>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={tile.route}
      className={`${base} ${hero} ${themeClasses.interactive.focus} ${
        active
          ? `${tile.active} shadow-lg`
          : `border ${themeClasses.card.primary} ${themeClasses.text.secondary} ${themeClasses.interactive.hover}`
      }`}
      aria-label={tile.label}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className={`${tile.hero ? 'h-7 w-7' : 'h-5 w-5'} ${active ? '' : tile.idleIcon}`} />
      <span
        className={`text-center leading-tight ${tile.hero ? 'text-[13px]' : 'text-[11px]'} ${
          active ? 'font-bold' : 'font-medium'
        }`}
      >
        {tile.label}
      </span>
    </NavLink>
  );
};

const TileRail: React.FC = () => {
  const { themeClasses } = useTheme();
  const { pathname } = useLocation();

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');
  // Treat the shell index / dashboard as AI Mode active.
  const aiActive = isActive('/staff/ai') || pathname === '/staff/dashboard' || pathname === '/staff';

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <nav aria-label="Staff tools" className="grid grid-cols-2 gap-2">
        <TileButton tile={AI_TILE} active={aiActive} />
        {TOOL_TILES.map((tile) => (
          <TileButton key={tile.key} tile={tile} active={tile.enabled && isActive(tile.route)} />
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
