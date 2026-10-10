// Shared form pieces for staff tools: consistent fields, repeated items, and
// actions that use the shop palette in both themes.
import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function useFormClasses() {
  const { themeClasses } = useTheme();
  const action = 'h-11 w-full rounded-full px-6 text-[15px] transition-colors sm:w-auto ';
  return {
    input: 'h-11 rounded-lg px-3 text-[15px] md:text-[15px] ' + themeClasses.input,
    textarea: 'min-h-[96px] rounded-lg px-3 py-2.5 text-[15px] md:text-[15px] ' + themeClasses.input,
    mono: 'font-mono tabular-nums',
    primary: action + 'font-semibold ' + themeClasses.button.primary,
    secondary: action + 'font-medium ' + themeClasses.button.secondary,
    ghost: action + 'font-medium ' + themeClasses.button.ghost,
  };
}

type ContainerProps = { children: ReactNode; className?: string };

export function FormSection({ title, description, action, children, className = '' }: ContainerProps & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={`border-t border-pub-edge pt-6 first:border-t-0 first:pt-0 ${className}`}>
      {title && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <h3 className="font-display text-[17px] font-semibold leading-tight text-pub-ink">{title}</h3>
            {description && <p className="mt-0.5 text-[13px] text-pub-muted">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function FieldGrid({ children, className = '' }: ContainerProps) {
  return <div className={`grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-12 ${className}`}>{children}</div>;
}

const spans = {
  2: 'sm:col-span-2', 3: 'sm:col-span-3', 4: 'sm:col-span-4',
  5: 'sm:col-span-5', 6: 'sm:col-span-6', 7: 'sm:col-span-7',
  8: 'sm:col-span-8', 9: 'sm:col-span-9', 12: 'sm:col-span-12',
};

export function Field({ label, htmlFor, required, optional, hint, error, span = 6, half,
  className = '', children }: ContainerProps & {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  span?: keyof typeof spans;
  half?: boolean;
}) {
  const { themeClasses } = useTheme();
  const phone = half ? 'col-span-1' : 'col-span-2';
  return (
    <div className={`${phone} ${spans[span]} ${className}`}>
      {label !== undefined && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium leading-5 text-pub-ink">
          {label}
          {required && <> <span aria-hidden="true" className={themeClasses.brass.text}>*</span></>}
          {optional && <> <span className="font-normal text-pub-muted">optional</span></>}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className={`mt-1.5 text-[13px] font-medium ${themeClasses.text.danger}`}>{error}</p>
      ) : hint && <p className="mt-1.5 text-[13px] text-pub-muted">{hint}</p>}
    </div>
  );
}

export function ItemCard({ title, onRemove, removeLabel = 'Remove item', children, className = '' }: ContainerProps & {
  title: ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const { themeClasses } = useTheme();
  return (
    <div className={`rounded-xl border border-pub-edge bg-pub-paper p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-pub-ink">{title}</h4>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={removeLabel}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${themeClasses.button.ghost} ${themeClasses.interactive.focus}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function AddRowButton({ onClick, children, disabled }: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const { themeClasses } = useTheme();
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${themeClasses.button.secondary} ${themeClasses.interactive.focus}`}>
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}

export function FormActions({ children, summary, className = '' }: ContainerProps & { summary?: ReactNode }) {
  return (
    <div className={`mt-6 flex flex-col-reverse gap-2 border-t border-pub-edge pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-3 ${className}`}>
      {summary && <div className="sm:mr-auto sm:min-w-[240px]">{summary}</div>}
      {children}
    </div>
  );
}
