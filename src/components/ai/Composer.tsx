// The chat composer: quick-action pills, a row of colored chips the pills add, and
// the text input. Chips prime the intent; on send their keywords are prepended to
// the text so the deterministic router picks them up. Enter sends; Shift+Enter
// makes a newline.
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, X } from 'lucide-react';
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
}

interface ActiveChip extends ChipSpec {
  id: string;
}

let chipCounter = 0;

const Composer: React.FC<ComposerProps> = ({ onSend, onTrack, onAddPacking, disabled }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const [text, setText] = useState('');
  const [chips, setChips] = useState<ActiveChip[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // AiOverlay unmounts the composer when it closes, so this mount-time focus fires
  // each time the overlay opens: the cursor is in the box, ready to type.
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

  return (
    <div className={`rounded-2xl border p-2 ${themeClasses.card.primary}`}>
      <QuickActions onAddChip={addChip} onTrack={onTrack} onAddPacking={onAddPacking} />

      {chips.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-medium ${
                isDarkMode ? 'border-slate-600 bg-slate-700 text-slate-100' : chip.tone
              }`}
            >
              {chip.label}
              <button type="button" onClick={() => removeChip(chip.id)} aria-label={`Remove ${chip.label}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

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
          placeholder="Tell me what you need. For example: refill for Sarah, HP 65, $34"
          className={`min-h-[2.75rem] max-h-40 flex-1 resize-none rounded-xl border bg-transparent px-3.5 py-2.5 text-[15px] leading-relaxed outline-none ${themeClasses.input}`}
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || (!text.trim() && chips.length === 0)}
          aria-label="Send"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${themeClasses.button.primary}`}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default Composer;
