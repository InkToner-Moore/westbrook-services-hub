// The staff tool tiles, in the fixed order they appear in the left rail. AI Mode
// is the wide 2x1 hero across the top; the tools sit below it in a two-column
// grid. Tools share one ink colour; AI Mode uses the accent.
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
  // Classes for the tile when it is the active tool (flat fill, counter mark).
  active: string;
  // Ink for idle tools, accent for idle AI Mode.
  idleIcon: string;
  // Quiet surface token shared by all tiles.
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
  active: 'bg-pub-accent text-pub-counter border-pub-accent',
  idleIcon: 'text-pub-accent',
  tint: 'bg-pub-sunk',
  hero: true,
  enabled: true,
};

// The tool tiles, in grid order (they fill the two columns below the hero).
export const TOOL_TILES: Tile[] = [
  {
    key: 'tracking',
    label: 'Tracking',
    icon: Package,
    route: '/staff/tracking',
    active: 'bg-pub-ink text-pub-counter border-pub-ink',
    idleIcon: 'text-pub-ink',
    tint: 'bg-pub-sunk',
    enabled: true,
  },
  {
    key: 'receipts',
    label: 'Receipts',
    icon: Receipt,
    route: '/staff/receipts',
    active: 'bg-pub-ink text-pub-counter border-pub-ink',
    idleIcon: 'text-pub-ink',
    tint: 'bg-pub-sunk',
    enabled: true,
  },
  {
    key: 'cartridges',
    label: 'Cartridges',
    icon: Printer,
    route: '/staff/cartridges',
    active: 'bg-pub-ink text-pub-counter border-pub-ink',
    idleIcon: 'text-pub-ink',
    tint: 'bg-pub-sunk',
    enabled: true,
  },
  {
    key: 'notes',
    label: 'Notes',
    icon: StickyNote,
    route: '/staff/notes',
    active: 'bg-pub-ink text-pub-counter border-pub-ink',
    idleIcon: 'text-pub-ink',
    tint: 'bg-pub-sunk',
    enabled: true,
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    route: '/staff/inventory',
    active: 'bg-pub-ink text-pub-counter border-pub-ink',
    idleIcon: 'text-pub-ink',
    tint: 'bg-pub-sunk',
    enabled: true,
  },
  {
    key: 'directory',
    label: 'Directory',
    icon: BookMarked,
    route: '/staff/directory',
    active: 'bg-pub-ink text-pub-counter border-pub-ink',
    idleIcon: 'text-pub-ink',
    tint: 'bg-pub-sunk',
    enabled: true,
  },
  {
    key: 'timesheet',
    label: 'Timesheet',
    icon: Clock,
    route: '/staff/timesheet',
    active: 'bg-pub-ink text-pub-counter border-pub-ink',
    idleIcon: 'text-pub-ink',
    tint: 'bg-pub-sunk',
    enabled: true,
  },
];

export const ALL_TILES: Tile[] = [AI_TILE, ...TOOL_TILES];
