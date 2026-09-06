// Two related affordances for when routing is wrong or unsure, both built on one
// list of choosable routes:
//  - variant "card": the engine could not route (unknown) or wants to clarify.
//    Shows the routes as a friendly "did you mean" grid so the user picks one
//    tap instead of retyping.
//  - variant "inline": a proposed action that might be the wrong one. A quiet
//    "Not right?" toggle expands the same grid so a misroute is one tap to fix.
// Picking a route re-parses the same utterance under that forced action, so the
// weak model never has to be right the first time.
import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { AiAction, ReceiptSubtype } from '@/ai/types';
import { ROUTE_OPTIONS, sameRoute, type RouteOption } from '@/ai/intentOptions';

interface Props {
  onPick: (action: AiAction, subtype?: ReceiptSubtype) => void;
  variant: 'card' | 'inline';
  // The current route, hidden from the options so it is not offered again.
  currentAction?: AiAction;
  currentSubtype?: ReceiptSubtype;
  // When the engine is stuck between a specific few routes, pass just those so the
  // picker offers the real choices instead of the whole menu. Defaults to all.
  choices?: RouteOption[];
}

const IntentSuggestions: React.FC<Props> = ({ onPick, variant, currentAction, currentSubtype, choices }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const [expanded, setExpanded] = useState(variant === 'card');

  const options = (choices ?? ROUTE_OPTIONS).filter((o) => !sameRoute(o, currentAction, currentSubtype));

  const chip = `rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
    isDarkMode
      ? 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;

  const grid = (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.label} type="button" className={chip} onClick={() => onPick(o.action, o.subtype)}>
          {o.label}
        </button>
      ))}
    </div>
  );

  if (variant === 'card') {
    return (
      <div className={`rounded-2xl border p-4 shadow-sm ${themeClasses.card.primary}`}>
        <p className={`mb-2.5 text-[15px] ${themeClasses.text.secondary}`}>Pick what you meant and I'll set it up:</p>
        {grid}
      </div>
    );
  }

  // Inline: a quiet toggle that reveals the grid.
  return (
    <div className="mt-2">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`text-[13px] underline-offset-2 hover:underline ${themeClasses.text.muted}`}
        >
          Not right? Change what this is
        </button>
      ) : (
        <div className="space-y-1.5">
          <p className={`text-[13px] ${themeClasses.text.muted}`}>Change to:</p>
          {grid}
        </div>
      )}
    </div>
  );
};

export default IntentSuggestions;
