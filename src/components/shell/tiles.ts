// The staff tool tiles, in the fixed order they appear in the left rail. AI Mode
// is the wide 2x1 hero across the top; the tools sit below it in a two-column
// grid. Each tool has one signature colour, used ONLY here (the active tile + its
// idle icon badge) and inside that tool. See docs/ui-rehaul/DESIGN-SPEC.md.
import {
  Sparkles,
  Package,
  Receipt,
  Printer,
  StickyNote,
  Boxes,
  BookMarked,
  Clock,
  type LucideIcon,
} from 'lucide-react';

export interface Tile {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
  // Classes for the tile when it is the active tool (flat fill, white mark).
  active: string;
  // Icon colour when the tile is idle, in light and dark.
  idleIcon: string;
  // Tinted badge behind the idle icon (the tool's hue, low opacity).
  tint: string;
  // Hero = the AI Mode tile, drawn wide (2x1).
  hero?: boolean;
  enabled: boolean;
  // Shown on a disabled tile (e.g. Timesheet, not built yet).
  soon?: boolean;
}

export const AI_TILE: Tile = {
  key: 'ai',
  label: 'AI Mode',
  icon: Sparkles,
  route: '/staff/ai',
  active: 'bg-indigo-600 text-white border-indigo-600',
  idleIcon: 'text-indigo-600 dark:text-indigo-400',
  tint: 'bg-indigo-500/10',
  hero: true,
  enabled: true,
};

// The tool tiles, in grid order (they fill the two columns below the hero).
export const TOOL_TILES: Tile[] = [
  { key: 'tracking', label: 'Tracking', icon: Package, route: '/staff/tracking', active: 'bg-blue-600 text-white border-blue-600', idleIcon: 'text-blue-600 dark:text-blue-400', tint: 'bg-blue-500/10', enabled: true },
  { key: 'receipts', label: 'Receipts', icon: Receipt, route: '/staff/receipts', active: 'bg-emerald-600 text-white border-emerald-600', idleIcon: 'text-emerald-600 dark:text-emerald-400', tint: 'bg-emerald-500/10', enabled: true },
  { key: 'cartridges', label: 'Cartridges', icon: Printer, route: '/staff/cartridges', active: 'bg-violet-600 text-white border-violet-600', idleIcon: 'text-violet-600 dark:text-violet-400', tint: 'bg-violet-500/10', enabled: true },
  { key: 'notes', label: 'Notes', icon: StickyNote, route: '/staff/notes', active: 'bg-amber-500 text-white border-amber-500', idleIcon: 'text-amber-600 dark:text-amber-400', tint: 'bg-amber-500/10', enabled: true },
  { key: 'inventory', label: 'Inventory', icon: Boxes, route: '/staff/inventory', active: 'bg-orange-600 text-white border-orange-600', idleIcon: 'text-orange-600 dark:text-orange-400', tint: 'bg-orange-500/10', enabled: true },
  { key: 'directory', label: 'Directory', icon: BookMarked, route: '/staff/directory', active: 'bg-cyan-600 text-white border-cyan-600', idleIcon: 'text-cyan-600 dark:text-cyan-400', tint: 'bg-cyan-500/10', enabled: true },
  { key: 'timesheet', label: 'Timesheet', icon: Clock, route: '/staff/timesheet', active: 'bg-slate-600 text-white border-slate-600', idleIcon: 'text-slate-600 dark:text-slate-400', tint: 'bg-slate-500/10', enabled: true },
];

export const ALL_TILES: Tile[] = [AI_TILE, ...TOOL_TILES];
