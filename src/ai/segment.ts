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
import { NOTE_LEAD, extractEmployeeName } from './extract';
import { isDayList } from '@/lib/shiftParse';
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

interface Probe {
  action: string;
  subtype?: string;
  // False for 'unknown' and for a guess made from shape alone (an item and a
  // price, a brand name). Only a sure route counts as an action of its own.
  sure: boolean;
}

async function routeOf(text: string): Promise<Probe> {
  const t = text.trim();
  if (!t) return { action: 'unknown', sure: false };
  const intent = await probe.parse(t);
  return { action: intent.action, subtype: intent.subtype, sure: intent.action !== 'unknown' && intent.confidence >= 0.7 };
}

const isShipping = (r: Probe) => r.action === 'receipt' && r.subtype === 'shipping';
// A courier, a tracking number or a shipment: pieces of one parcel when typed
// with commas between them ("ups, 1Z999AA10123456784, to toronto, $22").
const isParcel = (r: Probe) => isShipping(r) || r.action === 'track';

// The deterministic route for a message, exposed so the chat can tell a follow-up
// edit ("make it $40") from a new action ("clock in Dave").
export async function probeRoute(text: string): Promise<Probe> {
  return routeOf(text);
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
  // A note is everything typed after "note": its commas and "and"s are part of
  // what it says, not new requests.
  if (NOTE_LEAD.test(chunk)) return [chunk.trim()];

  const segments: string[] = [];
  let current = parts[0];
  for (let i = 1; i < parts.length; i += 1) {
    const [currentRoute, partRoute] = await Promise.all([routeOf(current), routeOf(parts[i])]);
    const bothRoute = currentRoute.sure && partRoute.sure;
    // Two shipments in a row stay one receipt: the shipping receipt holds several
    // items ("two labels"), so they are glued, not split into separate receipts.
    // The same goes for a courier and its tracking number typed as two pieces.
    const bothShipping = isParcel(currentRoute) && isParcel(partRoute) && !/\b(?:track|trace)\b/i.test(parts[i]);
    // A second timesheet clause with no name of its own is more about the same
    // person's shift ("Parsa took a 15 min break and left at 7:30"), not a new action.
    const sameShift =
      currentRoute.action === 'timesheet' && partRoute.action === 'timesheet' && !extractEmployeeName(parts[i]);
    // "Sue 10-5:30 oct 8, 9, 13": the days after each comma belong to the shift.
    const moreDays = currentRoute.action === 'timesheet' && isDayList(parts[i]);
    // Keys listed with "and" between them are one key receipt.
    const isKeys = (r: Probe) => r.action === 'receipt' && r.subtype === 'key';
    const bothKeys = isKeys(currentRoute) && isKeys(partRoute);
    if (bothRoute && !bothShipping && !bothKeys && !sameShift && !moreDays) {
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

  // A chunk after "then" / "plus" / a new line that is not an action on its own
  // ("plus box $5", "then charge her card") carries on the one before it.
  const strong: string[] = [];
  for (const chunk of trimmed.split(STRONG_SEPARATOR).map((s) => s.trim()).filter(Boolean)) {
    if (strong.length > 0 && !(await routeOf(chunk)).sure) strong[strong.length - 1] = `${strong[strong.length - 1]} and ${chunk}`;
    else strong.push(chunk);
  }
  const out: string[] = [];
  for (const chunk of strong) {
    const pieces = await splitSoft(chunk);
    out.push(...pieces);
  }
  const segments = out.length > 0 ? out : [trimmed];

  // Merge ADJACENT shipping segments into one receipt, even across a newline or
  // other strong separator. Two labels typed on two lines are one shipping receipt
  // with two items (the item parser re-splits the joined text), not two receipts
  // queued one behind the other.
  const merged: string[] = [];
  const routes = await Promise.all(segments.map(routeOf));
  segments.forEach((seg, i) => {
    const prevRoute = merged.length > 0 ? routes[i - 1] : null;
    if (prevRoute && isShipping(prevRoute) && isShipping(routes[i])) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}\n${seg}`;
    } else {
      merged.push(seg);
    }
  });
  return merged;
}
