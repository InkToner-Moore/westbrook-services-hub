// The Note artifact card (kind 'note'). After the counter saves a note through AI
// Mode, this renders it as a tidy note slip in the right rail: the note itself is
// the hero, with the chosen category, when it was saved, and its reference id set
// as slip data underneath. Notes hue is amber (see DESIGN-SPEC). The category
// dropdown lives on the confirmation slip (another agent); this card only shows
// the category that was chosen.
//
// Registration: this file exports `register(reg)`, which the integrator wires with
// one import + call in artifactRegistry.tsx (see the header there). The Body is
// self-contained, so no Foot and no Provider are needed.
import React from 'react';
import { Check, StickyNote } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ArtifactRegistry } from '@/components/shell/artifactRegistry';

// What executeNote (src/ai/actions/collections.ts) puts on the artifact.
export interface NoteArtifactData {
  // True once the note is written to Firestore. A card built without a save (an
  // empty draft) renders the empty state instead.
  saved: boolean;
  id: string;
  title: string;
  content: string;
  // One of the fixed note categories (General, Customer, Supplier, Repair,
  // Reminder, Other; see NOTE_CATEGORIES in fieldSpecs). Always a value; the
  // executor defaults an unknown category to General.
  category: string;
  createdAt: string; // ISO
}

// Present the category as a plain, sentence-case word for the slip.
const prettyCategory = (c: string): string =>
  c ? c.charAt(0).toUpperCase() + c.slice(1) : 'General';

// A readable local timestamp for the slip. Falls back to the raw string if the
// date cannot be parsed.
const prettyWhen = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso || '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NoteBody: React.FC<{ data: unknown }> = ({ data }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const d = data as NoteArtifactData | undefined;

  // Notes signature colour: amber (DESIGN-SPEC). Header carries text + icon, not
  // colour alone.
  const amberHeader = 'bg-pub-paper border-pub-edge';
  const categoryPill = isDarkMode
    ? 'bg-amber-800/50 text-amber-100 border-amber-700'
    : 'bg-amber-100 text-amber-800 border-amber-300';
  const divide = 'divide-pub-edge';

  const hasContent = !!d && d.saved && !!d.content?.trim();

  // Empty state: no note to show yet (a draft with nothing typed, or a card
  // opened before a save landed).
  if (!hasContent) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-pub-paper border-pub-edge">
        <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${amberHeader}`}>
          <StickyNote className="h-4 w-4 shrink-0 text-pub-accent" />
          <span className="font-display text-[15px] font-semibold tracking-tight text-pub-ink">Note</span>
        </div>
        <div className="px-4 py-8 text-center">
          <StickyNote className="mx-auto mb-3 h-9 w-9 text-pub-muted" />
          <p className="text-[15px] font-medium text-pub-ink">Nothing saved yet</p>
          <p className="mt-1 text-[13px] text-pub-muted">
            Type a note and it will be saved here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-pub-paper border-pub-edge">
      {/* Slip header: names the tool, category sits on the right as a pill. */}
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${amberHeader}`}>
        <StickyNote className="h-4 w-4 shrink-0 text-pub-accent" />
        <span className="font-display text-[15px] font-semibold tracking-tight text-pub-ink">Note</span>
        <span
          className={`ml-auto rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${categoryPill}`}
        >
          {prettyCategory(d.category)}
        </span>
      </div>

      <div className="px-4 py-3">
        {/* The note itself is the hero. Preserve line breaks as typed. */}
        <p
          className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-pub-ink"
        >
          {d.content}
        </p>

        {/* Slip data: category, when, and the reference id. IDs and the time are
            set in mono like a real slip. */}
        <ul className={`mt-4 divide-y border-t ${divide} ${'border-pub-edge'}`}>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className="text-[13px] text-pub-muted">Category</span>
            <span className="text-[15px] text-pub-ink">{prettyCategory(d.category)}</span>
          </li>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className="text-[13px] text-pub-muted">Saved</span>
            <span className="font-mono text-[13px] tabular-nums text-pub-ink">
              {prettyWhen(d.createdAt)}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3 py-2">
            <span className="text-[13px] text-pub-muted">Reference</span>
            <span className="font-mono text-[13px] tabular-nums text-pub-muted">{d.id}</span>
          </li>
        </ul>

        {/* Saved confirmation, carried by text + icon (not colour alone). */}
        <div
          className={`mt-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[13px] ${themeClasses.status.success}`}
        >
          <Check className="h-3.5 w-3.5 shrink-0" />
          Saved to Notes
        </div>
      </div>
    </div>
  );
};

// Registration hook. The integrator adds, in artifactRegistry.tsx:
//   import { register as registerNote } from '@/components/ai/artifacts/NoteCard';
//   registerNote(ARTIFACT_RENDERERS);
export function register(reg: ArtifactRegistry): void {
  reg.note = { Body: NoteBody };
}

export default NoteBody;
