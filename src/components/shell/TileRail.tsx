// The left rail: a wide AI Mode hero, seven tools in a two-column grid,
// then the user chip and light/dark toggle. Active tools use ink; AI Mode
// uses the accent. Idle icons sit directly on quiet paper surfaces.
import React, { useEffect, useState } from 'react';
import { openState } from '@/lib/storeInfo';
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
      className={`col-span-2 flex items-center gap-3 rounded-2xl border px-3 py-3 active:scale-[0.98] transition-[background-color,border-color,color,transform] duration-150 ${themeClasses.interactive.focus} ${
        active
          ? tile.active
          : 'bg-pub-paper border-pub-edge hover:bg-pub-sunk'
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon strokeWidth={1.6} className={`h-[22px] w-[22px] ${active ? 'text-current' : tile.idleIcon}`} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`text-[12px] font-medium ${active ? 'text-current' : 'text-pub-ink'}`}>{tile.label}</span>
        <span className={`text-[11px] ${active ? 'text-current opacity-75' : 'text-pub-muted'}`}>Ask for anything</span>
      </span>
    </NavLink>
  );
};

const ToolTile: React.FC<{ tile: Tile; active: boolean; wide?: boolean }> = ({ tile, active, wide }) => {
  const { themeClasses } = useTheme();
  const Icon = tile.icon;

  if (!tile.enabled) {
    return (
      <div
        className={`${wide ? 'col-span-2 ' : ''}flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 opacity-70 bg-pub-sunk border-pub-edge`}
        title={tile.soon ? `${tile.label}, coming soon` : tile.label}
        aria-disabled="true"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl">
          <Icon strokeWidth={1.6} className="h-[22px] w-[22px] text-pub-muted" />
        </span>
        <span className="text-[12px] font-medium text-pub-muted">{tile.label}</span>
        {tile.soon && <span className="rounded-full px-1.5 text-[9px] font-medium bg-pub-paper border-pub-edge text-pub-muted">Soon</span>}
      </div>
    );
  }

  return (
    <NavLink
      to={tile.route}
      aria-label={tile.label}
      aria-current={active ? 'page' : undefined}
      className={`${
        wide ? 'col-span-2 flex-row justify-start gap-3 px-3' : 'flex-col justify-center gap-1.5'
      } flex items-center rounded-2xl border ${wide ? 'py-3' : 'py-3.5'} active:scale-[0.98] transition-[background-color,border-color,color,transform] duration-150 ${themeClasses.interactive.focus} ${
        active
          ? tile.active
          : 'bg-pub-paper border-pub-edge hover:bg-pub-sunk'
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl">
        <Icon strokeWidth={1.6} className={`h-[22px] w-[22px] ${active ? 'text-current' : tile.idleIcon}`} />
      </span>
      <span className={`text-[12px] font-medium ${active ? 'text-current' : 'text-pub-ink'}`}>{tile.label}</span>
    </NavLink>
  );
};

const TileRail: React.FC<{ onCollapse?: () => void }> = ({ onCollapse }) => {
  const { themeClasses } = useTheme();
  const { pathname } = useLocation();
  const [status, setStatus] = useState(() => openState());

  useEffect(() => {
    const timer = window.setInterval(() => setStatus(openState()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const isActive = (route: string) => pathname === route || pathname.startsWith(route + '/');
  const aiActive = isActive('/staff/ai') || pathname === '/staff/dashboard' || pathname === '/staff';

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-start justify-between gap-1 px-1.5 pt-1.5">
        <span className="flex min-w-0 flex-col">
          {/* Two lines, the way the name is set on the customer page. */}
          <span className="font-display text-[22px] font-semibold leading-[1.02] text-pub-ink">
            <span className="block">Ink, Toner</span>
            <span className="block">&amp; Moore</span>
          </span>
          <span className="mt-2 flex items-center gap-1.5 text-[12px] text-pub-muted">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.open ? 'bg-pub-open' : 'bg-pub-muted'}`}
              aria-hidden="true"
            />
            <span className="truncate">{status.label}</span>
          </span>
        </span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse menu"
            title="Collapse menu"
            className={`hidden h-7 w-7 items-center justify-center rounded-lg lg:flex text-pub-muted ${themeClasses.interactive.hover}`}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav aria-label="Staff tools" className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto">
        <HeroTile tile={AI_TILE} active={aiActive} />
        {TOOL_TILES.map((tile, i) => (
          <ToolTile
            key={tile.key}
            tile={tile}
            active={tile.enabled && isActive(tile.route)}
            wide={TOOL_TILES.length % 2 === 1 && i === TOOL_TILES.length - 1}
          />
        ))}
      </nav>

      <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-0">
        <div className="mb-3 h-px bg-pub-edge" />
        <UserMenu />
      </div>
    </div>
  );
};

export default TileRail;
