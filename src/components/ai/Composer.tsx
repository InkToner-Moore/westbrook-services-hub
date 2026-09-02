// The chat composer: text input plus (from Phase 3) quick-action chips. Kept
// deliberately spare. Enter sends; Shift+Enter makes a newline.
import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const Composer: React.FC<ComposerProps> = ({ onSend, disabled }) => {
  const { themeClasses } = useTheme();
  const [text, setText] = useState('');

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className={`rounded-2xl border p-2 ${themeClasses.card.primary}`}>
      {/* Quick-action pills mount here in Phase 3. */}
      <div className="flex items-end gap-2">
        <textarea
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
          className={`min-h-[2.5rem] max-h-40 flex-1 resize-none rounded-xl border bg-transparent px-3 py-2 text-sm outline-none ${themeClasses.input}`}
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled || !text.trim()}
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
