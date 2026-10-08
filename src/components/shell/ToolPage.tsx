// Shared chrome for a tool rendered inside the staff shell, so every tool page
// reads the same way: one content width, and a title bar whose name, icon and
// hue come from the tool's own tile (tiles.ts) instead of being retyped per page.
// SegmentedTabs is the one tab control the tool pages share.
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { TOOL_TILES } from './tiles';

export type ToolKey = 'tracking' | 'receipts' | 'cartridges' | 'notes' | 'inventory' | 'directory' | 'timesheet';

// The title bar: the tile's icon in its tinted badge, the tile's label, and a
// short line saying what the page is for.
export const ToolPageHeader: React.FC<{ tool: ToolKey; subtitle?: string; actions?: React.ReactNode }> = ({
  tool,
  subtitle,
  actions,
}) => {
  const { themeClasses } = useTheme();
  const tile = TOOL_TILES.find((t) => t.key === tool);
  if (!tile) return null;
  const Icon = tile.icon;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile.tint}`}>
          <Icon className={`h-5 w-5 ${tile.idleIcon}`} />
        </span>
        <div className="min-w-0">
          <h1 className={`text-xl font-semibold tracking-tight ${themeClasses.text.primary}`}>{tile.label}</h1>
          {subtitle && <p className={`text-sm ${themeClasses.text.secondary}`}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};

// The in-shell page frame: the shared width and padding, then the title bar.
export const ToolPage: React.FC<{
  tool: ToolKey;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tool, subtitle, actions, children }) => (
  <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
    <ToolPageHeader tool={tool} subtitle={subtitle} actions={actions} />
    {children}
  </div>
);

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  // A small count shown after the label (e.g. things to review).
  badge?: number;
}

// A segmented switch: the chosen option lifts onto a card, the rest stay quiet.
// `size="sm"` is the compact form used for a view toggle inside a card header.
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  label,
  className = '',
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  size?: 'sm' | 'md';
  label?: string;
  className?: string;
}) {
  const { themeClasses } = useTheme();
  const pad = size === 'sm' ? 'min-h-[36px] px-3 text-[13px]' : 'min-h-[44px] px-4 text-sm';
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border p-1 ${themeClasses.card.secondary} ${className}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`flex shrink-0 items-center gap-2 rounded-lg border font-medium transition-colors ${pad} ${themeClasses.interactive.focus} ${
              on
                ? `${themeClasses.card.primary} ${themeClasses.text.primary} shadow-sm`
                : `border-transparent ${themeClasses.text.secondary}`
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {o.label}
            {o.badge ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                {o.badge > 99 ? '99+' : o.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
