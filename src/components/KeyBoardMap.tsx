// A visual map of the physical key board: every row (A to J), each slot with the
// blank it holds and the spots that are empty or never filled. Data comes from
// Firestore (the `keyBoard` collection) via the parent, so this renders whatever
// the board currently is. Clicking a filled slot searches that key. Turning on
// Edit lets staff set, move, or clear any slot, which writes straight to
// Firestore. The AI Mode location action writes the same collection.
import React, { useMemo, useState } from 'react';
import { KeyRound, MapPin, HelpCircle, Pencil, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  BOARD_ROWS,
  clearPosition,
  parseModelsInput,
  setPositionModels,
  type KeyBoardPosition,
} from '@/lib/keyBoard';

interface Props {
  board: KeyBoardPosition[];
  loading?: boolean;
  onSelect?: (model: string) => void;
  // Called after an edit persists, with the changed position, so the parent can
  // refresh its board state without a full reload.
  onChange?: (updated: KeyBoardPosition) => void;
}

interface Cell {
  position: string;
  number: number;
  doc?: KeyBoardPosition; // absent = never dictated ("not provided")
}

export const KeyBoardMap: React.FC<Props> = ({ board, loading, onSelect, onChange }) => {
  const { themeClasses, isDarkMode } = useTheme();
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState<Cell | null>(null);

  // Build each row as a dense sequence 1..max(number seen in that row), so gaps
  // (never-dictated slots) show as faint cells the editor can fill.
  const rows = useMemo(() => {
    const byPos = new Map(board.map((p) => [p.position, p]));
    const maxByRow = new Map<string, number>();
    for (const p of board) {
      maxByRow.set(p.row, Math.max(maxByRow.get(p.row) ?? 0, p.number ?? 0));
    }
    return BOARD_ROWS.map((row) => {
      const max = maxByRow.get(row) ?? 0;
      const cells: Cell[] = [];
      for (let n = 1; n <= max; n++) {
        const position = `${row}${n}`;
        cells.push({ position, number: n, doc: byPos.get(position) });
      }
      return { row, cells };
    }).filter((r) => r.cells.length > 0);
  }, [board]);

  const totalRecorded = board.filter((p) => p.status === 'recorded').length;
  const totalEmpty = board.filter((p) => p.status === 'empty').length;

  const cellStyle = (cell: Cell): string => {
    const s = cell.doc?.status;
    if (!s) {
      // Not provided: a faint placeholder, only interesting in edit mode.
      return isDarkMode
        ? 'border-slate-800 bg-slate-900/20 text-slate-600'
        : 'border-slate-100 bg-slate-50/60 text-slate-300';
    }
    if (s === 'empty') {
      return isDarkMode
        ? 'border-dashed border-slate-700 bg-slate-900/30 text-slate-500'
        : 'border-dashed border-slate-300 bg-white text-slate-400';
    }
    return isDarkMode
      ? 'border-slate-700 bg-slate-800/60 text-slate-100 hover:border-orange-500/60 hover:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-800 hover:border-orange-300 hover:bg-orange-50';
  };

  const handleClick = (cell: Cell) => {
    if (editing) {
      setActive(cell);
      return;
    }
    if (cell.doc?.status === 'recorded' && onSelect) {
      onSelect(cell.doc.models[0] ?? cell.position);
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <MapPin className="h-4 w-4 text-orange-500" />
        <span className={`text-sm font-semibold ${themeClasses.text.primary}`}>Key board</span>
        <span className={`text-xs ${themeClasses.text.muted}`}>
          {totalRecorded} keys, {totalEmpty} free spots
        </span>
        <div className="ml-auto flex items-center gap-3">
          <Legend isDarkMode={isDarkMode} muted={themeClasses.text.muted} />
          <Button
            type="button"
            size="sm"
            variant={editing ? 'default' : 'outline'}
            onClick={() => setEditing((e) => !e)}
            className={editing ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            {editing ? 'Done' : 'Edit board'}
          </Button>
        </div>
      </div>

      {editing && (
        <p className={`mb-3 text-xs ${themeClasses.text.muted}`}>
          Tap any slot to set its key, move a blank, or free it up. Changes save right away.
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 justify-center">
          <Loader2 className={`h-5 w-5 animate-spin ${themeClasses.text.muted}`} />
          <span className={`text-sm ${themeClasses.text.secondary}`}>Loading the board...</span>
        </div>
      ) : rows.length === 0 ? (
        <p className={`text-sm ${themeClasses.text.muted}`}>
          The board is empty. Turn on Edit to place your first key.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ row, cells }) => (
            <div key={row} className="flex items-center gap-2">
              <span className={`w-4 shrink-0 text-center text-xs font-mono font-bold ${themeClasses.text.muted}`}>
                {row}
              </span>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {cells.map((cell) => {
                  const code = cell.doc?.status === 'recorded' ? cell.doc.models[0] : '';
                  const clickable = editing || cell.doc?.status === 'recorded';
                  const flagged = cell.doc?.notes && /FLAGGED:/i.test(cell.doc.notes);
                  return (
                    <button
                      key={cell.position}
                      type="button"
                      disabled={!clickable}
                      title={
                        cell.doc?.status === 'recorded'
                          ? `${cell.position}: ${cell.doc.models.join(' / ')}${cell.doc.notes ? ` (${cell.doc.notes})` : ''}`
                          : `${cell.position}: ${cell.doc?.status ?? 'not filled in'}`
                      }
                      onClick={() => handleClick(cell)}
                      className={`relative flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded border px-1 text-center transition-colors ${cellStyle(cell)} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="text-[9px] font-mono opacity-60 leading-none">{cell.number}</span>
                      <span className="mt-0.5 truncate text-[10px] font-semibold leading-tight w-full">
                        {code || (cell.doc?.status === 'empty' ? 'MT' : '')}
                      </span>
                      {flagged && (
                        <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <SlotEditor
        cell={active}
        onClose={() => setActive(null)}
        onSaved={(updated) => {
          onChange?.(updated);
          setActive(null);
        }}
      />
    </div>
  );
};

const Legend: React.FC<{ isDarkMode: boolean; muted: string }> = ({ muted }) => (
  <div className={`hidden sm:flex items-center gap-2 text-[11px] ${muted}`}>
    <span className="flex items-center gap-1">
      <KeyRound className="h-3 w-3 text-orange-500" /> key
    </span>
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full border border-dashed border-current opacity-50" /> free
    </span>
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> needs review
    </span>
  </div>
);

// Edit one board position: set the blank(s) that live there, move an existing
// blank onto it, or free it up. Writes to Firestore via the keyBoard helpers.
const SlotEditor: React.FC<{
  cell: Cell | null;
  onClose: () => void;
  onSaved: (updated: KeyBoardPosition) => void;
}> = ({ cell, onClose, onSaved }) => {
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
        toast({ title: 'Slot freed', description: `${cell.position} is now empty.` });
        onSaved(updated);
        return;
      }
      const parsed = parseModelsInput(models);
      if (parsed.length === 0) {
        toast({ title: 'Add a key name', description: 'Type the blank that goes here, or free the slot.' });
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
          <DialogTitle className={themeClasses.text.primary}>
            Slot {cell?.position}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className={themeClasses.text.secondary}>Key(s) in this slot</Label>
            <Input
              value={models}
              onChange={(e) => setModels(e.target.value)}
              placeholder="e.g. Ilco 01122BE  (use / for equivalents: HR1 / HR1 Brass)"
              className={`mt-1 ${themeClasses.input}`}
            />
            <p className={`mt-1 text-xs ${themeClasses.text.muted}`}>
              Separate equivalent names with a slash. Leave blank and press Free to empty the slot.
            </p>
          </div>
          <div>
            <Label className={themeClasses.text.secondary}>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything worth remembering about this slot"
              className={`mt-1 ${themeClasses.input}`}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => save('clear')} disabled={saving}>
            Free slot
          </Button>
          <Button
            type="button"
            onClick={() => save('set')}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KeyBoardMap;
