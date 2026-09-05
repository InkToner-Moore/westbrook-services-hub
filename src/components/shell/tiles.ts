// The staff tool tiles, in the fixed order they appear in the left rail. AI Mode
// is the 1x2 hero (spans two rows in column one); the eight others are 1x1 and
// auto-flow around it into a two-column grid. Each tool has one signature colour,
// used ONLY here (the active tile) and inside that tool - never scattered through
// shared chrome. See docs/ui-rehaul/DESIGN-SPEC.md.
import {
  Sparkles,
  Package,
  Receipt,
  Printer,
  StickyNote,
  Boxes,
  BookMarked,
  ClipboardList,
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
  // Icon tint when the tile is idle, in light and dark.
  idleIcon: string;
  // Hero = the AI Mode tile, drawn 1x2.
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
  idleIcon: 'text-indigo-500',
  hero: true,
  enabled: true,
};

// The eight 1x1 tiles, in grid order (they auto-flow around the AI hero).
export const TOOL_TILES: Tile[] = [
  { key: 'tracking', label: 'Tracking', icon: Package, route: '/staff/tracking', active: 'bg-blue-600 text-white border-blue-600', idleIcon: 'text-blue-500', enabled: true },
  { key: 'receipts', label: 'Receipts', icon: Receipt, route: '/staff/receipts', active: 'bg-emerald-600 text-white border-emerald-600', idleIcon: 'text-emerald-500', enabled: true },
  { key: 'cartridges', label: 'Cartridges', icon: Printer, route: '/staff/cartridges', active: 'bg-violet-600 text-white border-violet-600', idleIcon: 'text-violet-500', enabled: true },
  { key: 'notes', label: 'Notes', icon: StickyNote, route: '/staff/notes', active: 'bg-amber-500 text-white border-amber-500', idleIcon: 'text-amber-500', enabled: true },
  { key: 'inventory', label: 'Inventory', icon: Boxes, route: '/staff/inventory', active: 'bg-orange-600 text-white border-orange-600', idleIcon: 'text-orange-500', enabled: true },
  { key: 'directory', label: 'Directory', icon: BookMarked, route: '/staff/directory', active: 'bg-cyan-600 text-white border-cyan-600', idleIcon: 'text-cyan-500', enabled: true },
  { key: 'followups', label: 'Follow-Ups', icon: ClipboardList, route: '/staff/requests', active: 'bg-rose-600 text-white border-rose-600', idleIcon: 'text-rose-500', enabled: true },
  { key: 'timesheet', label: 'Timesheet', icon: Clock, route: '/staff/timesheet', active: 'bg-slate-200 text-slate-400 border-slate-200', idleIcon: 'text-slate-400', enabled: false, soon: true },
];

export const ALL_TILES: Tile[] = [AI_TILE, ...TOOL_TILES];
