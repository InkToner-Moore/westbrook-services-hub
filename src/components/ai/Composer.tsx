// The chat composer: quick-action pills, a row of colored chips the pills add, and
// the text input. Chips prime the intent; on send their keywords are prepended to
// the text so the deterministic router picks them up. Enter sends; Shift+Enter
// makes a newline.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import QuickActions from './QuickActions';
import type { ChipSpec } from './quickActionSpecs';
import type { Courier } from '@/ai/tracking';
import type { PackingPreset } from '@/lib/packing';

interface ComposerProps {
  onSend: (text: string) => void;
  onTrack: (courier: Courier, trackingNumber: string) => void;
  onAddPacking: (preset: PackingPreset) => void;
  disabled?: boolean;
  // A conversation is under way: the shortcuts fold away to give the chat room.
  compact?: boolean;
}

// Whether the shortcut rows were last left open or closed, kept per browser.
const SHORTCUTS_KEY = 'ai-shortcuts-open';
const readShortcuts = (): boolean | null => {
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY);
    return raw === null ? null : raw === '1';
  } catch {
    return null;
  }
};
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches;

interface ActiveChip extends ChipSpec {
  id: string;
}

let chipCounter = 0;

const Composer: React.FC<ComposerProps> = ({ onSend, onTrack, onAddPacking, disabled, compact }) => {
  const { themeClasses } = useTheme();
  const [text, setText] = useState('');
  const [chips, setChips] = useState<ActiveChip[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Shortcuts: open on an empty thread on a wide screen, folded on a phone or
  // once a chat is going, unless the clerk has chosen one way or the other.
  const [phone] = useState(isPhone);
  const [shortcutsChoice, setShortcutsChoice] = useState<boolean | null>(readShortcuts);
  const shortcutsOpen = shortcutsChoice ?? (!compact && !phone);
  const toggleShortcuts = () => {
    const next = !shortcutsOpen;
    setShortcutsChoice(next);
    try {
      localStorage.setItem(SHORTCUTS_KEY, next ? '1' : '0');
    } catch {
      // Storage unavailable; the choice still holds for this visit.
    }
  };

  // Focus on mount, so arriving at AI Mode (the center pane) drops the cursor
  // straight in the box, ready to type.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addChip = (spec: ChipSpec) => {
    // Avoid stacking the same chip twice.
    setChips((prev) => (prev.some((c) => c.kind === spec.kind) ? prev : [...prev, { ...spec, id: `chip-${(chipCounter += 1)}` }]));
  };
  const removeChip = (id: string) => setChips((prev) => prev.filter((c) => c.id !== id));

  const send = () => {
    const typed = text.trim();
    const keywords = chips.map((c) => c.keyword).join(' ');
    const full = `${keywords} ${typed}`.trim();
    if (!full || disabled) return;
    onSend(full);
    setText('');
    setChips([]);
  };

  const divider = 'border-pub-edge';

  return (
    <div className="rounded-2xl border p-2 bg-pub-paper border-pub-edge">
      {/* Primed chips sit right on the input they modify. */}
      {chips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 px-1 pt-1">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium ${chip.tone}`}
            >
              {chip.label}
              <button type="button" onClick={() => removeChip(chip.id)} aria-label={`Remove ${chip.label}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* The input is the primary way in, so it leads. */}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={phone ? 'Tell me what you need' : 'Tell me what you need. For example: refill for Sarah, HP 65, $34'}
          className="min-h-[2.75rem] max-h-40 flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-[15px]
            leading-relaxed outline-none placeholder:overflow-hidden placeholder:text-ellipsis
            placeholder:whitespace-nowrap border-pub-edge bg-pub-sunk text-pub-ink placeholder:text-pub-muted
            focus:border-pub-accent focus:ring-pub-accent"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || (!text.trim() && chips.length === 0)}
          aria-label="Send"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${themeClasses.ink.fill} hover:bg-pub-accent hover:border-pub-accent`}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>

      {/* Shortcuts are secondary help, kept quiet below a hairline. */}
      <div className={`mt-2 border-t pt-1 ${divider}`}>
        <button
          type="button"
          onClick={toggleShortcuts}
          aria-expanded={shortcutsOpen}
          className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[13px] sm:min-h-[32px] text-pub-muted ${themeClasses.interactive.hover}`}
        >
          {shortcutsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          {shortcutsOpen ? 'Hide shortcuts' : 'Shortcuts'}
        </button>
        {shortcutsOpen && (
          <div className="pb-1 pt-1">
            <QuickActions onAddChip={addChip} onTrack={onTrack} onAddPacking={onAddPacking} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Composer;
