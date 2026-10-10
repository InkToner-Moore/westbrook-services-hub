// The physical key board, made calm: one row at a time (pick a row, or search
// and the matching slots come to you from every row), each slot showing the
// blank's short code and its position. Tapping a slot opens it: what lives
// there, a jump to that key's price, and the fields to change or free it. There
// is no separate edit mode. Data comes from Firestore (the `keyBoard`
// collection) via the parent; the AI Mode location action writes the same
// collection.
import React, { useMemo, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  BOARD_ROWS,
  clearPosition,
  normCode,
  parseModelsInput,
  setPositionModels,
  type KeyBoardPosition,
} from '@/lib/keyBoard';

interface Props {
  board: KeyBoardPosition[];
  loading?: boolean;
  // "Find in keys": the parent shows that key in the price list.
  onSelect?: (model: string) => void;
  // Called after an edit persists, with the changed position, so the parent can
  // refresh its board state without a full reload.
  onChange?: (updated: KeyBoardPosition) => void;
}

interface Cell {
  position: string;
  row: string;
  number: number;
  doc?: KeyBoardPosition; // absent = never dictated ("not provided")
}

type Show = 'all' | 'keys' | 'free';

const isFlagged = (cell: Cell) => !!cell.doc?.notes && /FLAGGED:/i.test(cell.doc.notes);
const isKey = (cell: Cell) => cell.doc?.status === 'recorded';

export const KeyBoardMap: React.FC<Props> = ({ board, loading, onSelect, onChange }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const [active, setActive] = useState<Cell | null>(null);
  const [row, setRow] = useState<string>('A');
  const [query, setQuery] = useState('');
  const [show, setShow] = useState<Show>('all');

  // Each row as a dense sequence 1..max(number seen in that row), so a gap (a
  // slot nobody has filled in yet) still shows and can be tapped to fill.
  const rows = useMemo(() => {
    const byPos = new Map(board.map((p) => [p.position, p]));
    const maxByRow = new Map<string, number>();
    for (const p of board) {
      maxByRow.set(p.row, Math.max(maxByRow.get(p.row) ?? 0, p.number ?? 0));
    }
    return BOARD_ROWS.map((r) => {
      const max = maxByRow.get(r) ?? 0;
      const cells: Cell[] = [];
      for (let n = 1; n <= max; n++) {
        const position = `${r}${n}`;
        cells.push({ position, row: r, number: n, doc: byPos.get(position) });
      }
      return { row: r as string, cells };
    }).filter((r) => r.cells.length > 0);
  }, [board]);

  const totalKeys = board.filter((p) => p.status === 'recorded').length;
  const totalFree = board.filter((p) => p.status === 'empty').length;

  // A search looks across every row: by code ("sc1"), by full name ("ilco"), by
  // position ("b12"), or in the slot's notes.
  const q = query.trim().toLowerCase();
  const matches = (cell: Cell): boolean => {
    if (!q) return true;
    if (cell.position.toLowerCase() === q) return true;
    if (!cell.doc) return false;
    return (
      cell.doc.models.some((m) => m.toLowerCase().includes(q) || normCode(m).toLowerCase().includes(q)) ||
      (cell.doc.notes ?? '').toLowerCase().includes(q)
    );
  };
  const passes = (cell: Cell): boolean =>
    (show === 'all' || (show === 'keys' ? isKey(cell) : !isKey(cell))) && matches(cell);

  const currentRow = rows.find((r) => r.row === row) ?? rows[0];
  const visible = (q ? rows : currentRow ? [currentRow] : [])
    .map((r) => ({ row: r.row, cells: r.cells.filter(passes), keys: r.cells.filter(isKey).length, free: r.cells.length - r.cells.filter(isKey).length }))
    .filter((r) => r.cells.length > 0);
  const hitCount = visible.reduce((n, r) => n + r.cells.length, 0);

  const cellStyle = (cell: Cell): string => {
    if (isKey(cell)) {
      return isDarkMode
        ? 'border-[#2a2f3a] bg-[#1f232c] text-slate-100 hover:border-orange-500/60'
        : 'border-[#e4e1d9] bg-white text-slate-800 hover:border-orange-400 hover:bg-orange-50';
    }
    // Free or never filled in: a quiet dashed outline, clearly not a key.
    return isDarkMode
      ? 'border-dashed border-[#2a2f3a] text-slate-500 hover:border-slate-500'
      : 'border-dashed border-[#d6d2c7] text-slate-400 hover:border-slate-400';
  };

  const chip = (on: boolean) =>
    `inline-flex min-h-[40px] items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${themeClasses.interactive.focus} ${
      on
        ? themeClasses.ink.fill
        : `bg-pub-paper border-pub-edge text-pub-muted ${themeClasses.interactive.hover}`
    }`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-pub-ink" />
          <span className="font-display text-lg font-semibold text-pub-ink">Key board</span>
        </span>
        <span className="text-[13px] text-pub-muted">
          {totalKeys} keys, {totalFree} free spots
        </span>
      </div>

      {/* Find a key or a slot, across every row. */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pub-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a key or a spot, e.g. SC1 or B12"
          aria-label="Find a key or a spot on the board"
          className={`min-h-[44px] pl-10 pr-10 ${themeClasses.input}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className={`absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-pub-muted ${themeClasses.interactive.hover}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Row picker and the keys / free filter. A search overrides the row. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className={`flex flex-wrap items-center gap-1.5 ${q ? 'opacity-50' : ''}`} role="tablist" aria-label="Board row">
          <span className="mr-1 text-[13px] text-pub-muted">Row</span>
          {rows.map((r) => (
            <button
              key={r.row}
              type="button"
              role="tab"
              aria-selected={!q && currentRow?.row === r.row}
              onClick={() => {
                setRow(r.row);
                setQuery('');
              }}
              className={`${chip(!q && currentRow?.row === r.row)} w-10 px-0 font-mono`}
            >
              {r.row}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Show">
          {([
            ['all', 'All'],
            ['keys', 'Keys'],
            ['free', 'Free'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={show === value} onClick={() => setShow(value)} className={chip(show === value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-pub-muted" />
          <span className="text-sm text-pub-muted">Loading the board...</span>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-pub-muted">The board is empty.</p>
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-pub-muted">
          {q ? `Nothing on the board matches "${query.trim()}".` : 'Nothing to show in this row with that filter.'}
        </p>
      ) : (
        <div className="space-y-5">
          {q && (
            <p className="text-[13px] text-pub-muted">
              {hitCount} {hitCount === 1 ? 'spot' : 'spots'} across {visible.length} {visible.length === 1 ? 'row' : 'rows'}
            </p>
          )}
          {visible.map((r) => (
            <section key={r.row} aria-label={`Row ${r.row}`}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="font-display font-semibold text-pub-ink text-sm">Row {r.row}</h3>
                <span className="text-[13px] text-pub-muted">
                  {r.keys} keys, {r.free} free
                </span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-1.5">
                {r.cells.map((cell) => {
                  const key = isKey(cell);
                  const code = key ? normCode(cell.doc!.models[0] ?? '') || cell.doc!.models[0] : '';
                  const more = key ? cell.doc!.models.length - 1 : 0;
                  return (
                    <button
                      key={cell.position}
                      type="button"
                      onClick={() => setActive(cell)}
                      title={key ? `${cell.position}: ${cell.doc!.models.join(' / ')}` : `${cell.position}: free`}
                      className={`relative flex h-14 flex-col justify-between rounded-lg border px-2 py-1.5 text-left transition-colors ${themeClasses.interactive.focus} ${cellStyle(cell)}`}
                    >
                      <span className="font-mono text-[11px] leading-none opacity-60">{cell.position}</span>
                      <span className={`truncate font-mono leading-tight ${key ? 'text-[13px] font-semibold' : 'text-[12px]'}`}>
                        {key ? code : 'Free'}
                        {more > 0 && <span className="ml-1 font-normal opacity-60">+{more}</span>}
                      </span>
                      {isFlagged(cell) && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" aria-label="Needs a look" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-pub-muted">
            <span>Tap a spot to see it, change it or free it.</span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> needs a look
            </span>
          </p>
        </div>
      )}

      <SlotEditor
        cell={active}
        onClose={() => setActive(null)}
        onFind={
          onSelect
            ? (model) => {
                setActive(null);
                onSelect(model);
              }
            : undefined
        }
        onSaved={(updated) => {
          onChange?.(updated);
          setActive(null);
        }}
      />
    </div>
  );
};

// One board position: what lives there, a jump to that key in the price list,
// and the fields to set the blank(s), move one onto it, or free it up. Writes to
// Firestore via the keyBoard helpers.
const SlotEditor: React.FC<{
  cell: Cell | null;
  onClose: () => void;
  onFind?: (model: string) => void;
  onSaved: (updated: KeyBoardPosition) => void;
}> = ({ cell, onClose, onFind, onSaved }) => {
  const { themeClasses } = useTheme();
  const [models, setModels] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset the fields whenever a new cell opens.
  React.useEffect(() => {
    if (cell) {
      setModels(cell.doc?.models?.join(' / ') ?? '');
      setNotes(cell.doc?.notes ?? '');
    }
  }, [cell]);

  const save = async (action: 'set' | 'clear') => {
    if (!cell) return;
    setSaving(true);
    try {
      if (action === 'clear') {
        const updated = await clearPosition(cell.position);
        toast({ title: 'Spot freed', description: `${cell.position} is now empty.` });
        onSaved(updated);
        return;
      }
      const parsed = parseModelsInput(models);
      if (parsed.length === 0) {
        toast({ title: 'Add a key name', description: 'Type the blank that goes here, or free the spot.' });
        setSaving(false);
        return;
      }
      const updated = await setPositionModels(cell.position, parsed, { notes: notes.trim() });
      toast({ title: 'Board updated', description: `${cell.position}: ${parsed.join(' / ')}` });
      onSaved(updated);
    } catch (e) {
      console.error('Failed to save board slot:', e);
      toast({ title: 'Could not save', description: 'The change did not stick. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!cell} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={themeClasses.card.primary}>
        <DialogHeader>
          <DialogTitle className="font-display font-semibold text-pub-ink">Spot {cell?.position}</DialogTitle>
          <DialogDescription>
            {cell?.doc?.status === 'recorded' ? cell.doc.models.join(' / ') : 'Nothing here yet.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-pub-muted">Key in this spot</Label>
            <Input
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="e.g. Ilco 01122BE  (use / for equivalents: HR1 / HR1 Brass)"
              className={`mt-1 ${themeClasses.input}`}
            />
            <p className="mt-1 text-xs text-pub-muted">
              Separate equivalent names with a slash.
            </p>
          </div>
          <div>
            <Label className="text-pub-muted">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth remembering about this spot"
              className={`mt-1 ${themeClasses.input}`}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {onFind && cell?.doc?.status === 'recorded' && (
            <Button type="button" variant="ghost" onClick={() => onFind(cell.doc!.models[0] ?? cell.position)} className="sm:mr-auto">
              <Search className="mr-2 h-4 w-4" />
              Find in keys
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => save('clear')} disabled={saving || cell?.doc?.status !== 'recorded'}>
            Free this spot
          </Button>
          <Button
            type="button"
            onClick={() => save('set')}
            disabled={saving}
            className={`rounded-full ${themeClasses.button.primary}`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KeyBoardMap;
