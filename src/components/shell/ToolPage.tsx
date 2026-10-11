// Shared chrome for a tool rendered inside the staff shell, so every tool page
// reads the same way: one content width, and a title bar whose icon and
// label come from the tool's own tile (tiles.ts) instead of being retyped per page.
// SegmentedTabs is the one tab control the tool pages share.
import React from 'react';
import { Settings, type LucideIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { TOOL_TILES } from './tiles';

export type ToolKey = 'tracking' | 'receipts' | 'cartridges' | 'notes' | 'inventory' | 'directory' | 'timesheet' | 'settings';

// The title bar: the tile's icon in a quiet outlined square, its label, and a
// short line saying what the page is for.
export const ToolPageHeader: React.FC<{ tool: ToolKey; subtitle?: string; actions?: React.ReactNode; compact?: boolean }> = ({
  tool,
  subtitle,
  actions,
  compact = false,
}) => {
  const tile = tool === 'settings' ? { label: 'Settings', icon: Settings } : TOOL_TILES.find((t) => t.key === tool);
  if (!tile) return null;
  const Icon = tile.icon;
  return (
    <div className={`${compact ? 'mb-5' : 'mb-7'} flex flex-wrap items-center justify-between gap-3`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-pub-edge bg-pub-paper">
          <Icon className="h-5 w-5 text-pub-ink" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-semibold leading-tight text-pub-ink sm:text-[32px]">{tile.label}</h1>
          {subtitle && <p className="mt-0.5 text-[15px] text-pub-muted">{subtitle}</p>}
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
  tabs?: React.ReactNode;
  children: React.ReactNode;
}> = ({ tool, subtitle, actions, tabs, children }) => (
  <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
    <ToolPageHeader tool={tool} subtitle={subtitle} actions={actions} compact={Boolean(tabs)} />
    {tabs && <div className="mb-5">{tabs}</div>}
    {children}
  </div>
);

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  icon?: LucideIcon;
  // A small count shown after the label (e.g. things to review).
  badge?: number;
}

// Shared tabs support compact views and full-width page sections on phones.
export function SegmentedTabs<T extends string>({
  value, onChange, options, size = 'md', label, idBase, className = '',
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  size?: 'sm' | 'md';
  label?: string;
  // When the tabs switch panels, the panels use `${idBase}-panel-${value}` and point back at `${idBase}-tab-${value}`.
  idBase?: string;
  className?: string;
}) {
  const { themeClasses } = useTheme();
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);
  const track = size === 'md' ? 'flex w-full sm:inline-flex sm:w-auto' : 'inline-flex max-w-full';
  const pad = size === 'sm' ? 'min-h-[36px] px-3 text-[13px]' :
    'min-h-[44px] flex-1 min-w-0 flex-col justify-center gap-1 px-1 py-2 text-[12px] leading-tight sm:flex-none sm:flex-row sm:gap-2 sm:px-4 sm:py-0 sm:text-sm';
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case 'ArrowLeft': next = (index - 1 + options.length) % options.length; break;
      case 'ArrowRight': next = (index + 1) % options.length; break;
      case 'Home': next = 0; break;
      case 'End': next = options.length - 1; break;
      default: return;
    }
    event.preventDefault();
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label}
      className={`${track} gap-1 rounded-xl border p-1 bg-pub-sunk border-pub-edge ${className}`}>
      {options.map((o, index) => {
        const on = o.value === value;
        const Icon = o.icon;
        const color = on ? themeClasses.ink.fill : 'border-transparent text-pub-muted hover:text-pub-ink';
        const badgeColor = on ? 'bg-pub-paper text-pub-ink' : themeClasses.ink.fill;
        return (
          <button key={o.value} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1}
            id={idBase && `${idBase}-tab-${o.value}`} aria-controls={idBase && `${idBase}-panel-${o.value}`}
            ref={(node) => { buttons.current[index] = node; }}
            onClick={() => onChange(o.value)} onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex items-center gap-2 rounded-lg border font-medium transition-colors ${pad} ${themeClasses.interactive.focus} ${color}`}>
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            {size === 'md' && o.shortLabel && o.shortLabel !== o.label ? (
              <>
                <span className="max-w-full truncate sm:hidden">{o.shortLabel}</span>
                <span className="hidden sm:inline">{o.label}</span>
              </>
            ) : <span className="max-w-full truncate">{o.label}</span>}
            {o.badge ? (
              <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${badgeColor}`}>
                {o.badge > 99 ? '99+' : o.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChips<T extends string>({ value, onChange, options, label, className = '' }: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: LucideIcon; count?: number }[];
  label?: string;
  className?: string;
}) {
  const { themeClasses } = useTheme();
  return (
    <div role="group" aria-label={label} className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const Icon = option.icon;
        const color = value === option.value ? themeClasses.ink.fill :
          'bg-pub-paper border-pub-edge text-pub-muted hover:text-pub-ink';
        return (
          <button key={option.value} type="button" aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${themeClasses.interactive.focus} ${color}`}>
            {Icon && <Icon className="h-4 w-4" />}
            {option.label}
            {option.count !== undefined && <span className="tabular-nums">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
