// Split one utterance into the separate actions it asks for. The counter often
// says several things at once - related ("refill for Sarah $34 and print a label")
// or not ("clock in Dave and note the printer jammed"). This splits the second
// kind into segments the router handles one by one, while leaving the first kind
// (a primary action with pay/label riding along) intact.
//
// The rule that separates the two: a fragment becomes its own segment only when it
// routes to a real action ON ITS OWN. "print a label" and "charge her card" do not
// route alone (they are attachments, handled inside one intent), so they glue back
// to their neighbour. "clock in Dave" does route alone, so it splits off. This uses
// the deterministic router as a free, offline probe - no network, no model.
import { DeterministicProvider } from './providers/deterministic';

const probe = new DeterministicProvider();

// Strong separators always split: newlines, semicolons, and the sequencing words
// "then" / "also" / "plus". These are unambiguous "next thing" markers. Note "+"
// is deliberately NOT here: it reads as an attachment join ("pay + label").
const STRONG_SEPARATOR = /\s*(?:\r?\n+|;+|\bthen\b|\balso\b|\bplus\b)\s*/i;

// Soft separators (a comma or " and ") only split when both sides stand alone as
// actions. Captured so the original joiner can be restored when a fragment glues
// back. "refill for Sarah, HP 65, $34" stays one action (its pieces do not route
// alone); "clock in Dave, clock in Sarah" becomes two.
const SOFT_SEPARATOR = /(\s*,\s*|\s+and\s+)/i;

async function routesAlone(text: string): Promise<boolean> {
  const t = text.trim();
  if (!t) return false;
  const intent = await probe.parse(t);
  return intent.action !== 'unknown';
}

// Split a chunk on soft separators, then greedily glue back any piece that does not
// route on its own (a continuation, like "Sarah and John", "..., HP 65", or "...
// and charge her card"), so only genuine second actions survive as segments.
async function splitSoft(chunk: string): Promise<string[]> {
  const raw = chunk.split(SOFT_SEPARATOR);
  const parts: string[] = [];
  const seps: string[] = [];
  raw.forEach((piece, i) => (i % 2 === 0 ? parts.push(piece) : seps.push(piece)));
  if (parts.length <= 1) return [chunk.trim()].filter(Boolean);

  const segments: string[] = [];
  let current = parts[0];
  for (let i = 1; i < parts.length; i += 1) {
    const [currentOk, partOk] = await Promise.all([routesAlone(current), routesAlone(parts[i])]);
    if (currentOk && partOk) {
      segments.push(current);
      current = parts[i];
    } else {
      // Keep the original separator so meaning and extraction are unchanged.
      current = `${current}${seps[i - 1] ?? ' and '}${parts[i]}`;
    }
  }
  segments.push(current);
  return segments.map((s) => s.trim()).filter(Boolean);
}

// The public splitter. Returns one segment for a plain single-action utterance, or
// several when it genuinely holds more than one action.
export async function segmentUtterance(text: string): Promise<string[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const strong = trimmed.split(STRONG_SEPARATOR).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const chunk of strong) {
    const pieces = await splitSoft(chunk);
    out.push(...pieces);
  }
  return out.length > 0 ? out : [trimmed];
}
