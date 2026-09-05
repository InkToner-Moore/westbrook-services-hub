// Core types for AI Mode. The engine's whole job is to turn a natural-language
// utterance into a typed Intent; deterministic TypeScript does everything real
// (Firestore writes, IDs, tax math, PDF generation). See docs/ai-mode/01-design.md.

// Where a field's value came from. This is what lets the confirmation check show
// guessed values differently from ones the user actually said.
export type FieldSource = 'explicit' | 'guessed' | 'not_provided';

export interface FieldValue<T = string> {
  value: T | null;
  source: FieldSource;
  // Optional short reason shown next to a guessed field ("defaulted to 1").
  reason?: string;
}

// Top-level actions the engine can route to. 'clarify' means the engine wants to
// ask a question instead of guessing; 'unknown' means it could not route at all.
export type AiAction =
  | 'receipt'
  | 'cartridge_create'
  | 'cartridge_modify'
  | 'cartridge_status'
  | 'cartridge_list'
  | 'note'
  | 'inventory'
  | 'directory'
  | 'followup'
  | 'track'
  | 'clarify'
  | 'unknown';

export type ReceiptSubtype = 'refill' | 'supplies' | 'shipping' | 'key';

export interface Intent {
  action: AiAction;
  // For receipts, which of the four types.
  subtype?: ReceiptSubtype;
  // Extracted fields, each carrying provenance. Keyed by domain field name.
  fields: Record<string, FieldValue<unknown>>;
  // Present when action === 'clarify'.
  clarify?: string;
  // 0..1. Deterministic provider grades from match strength; the LLM maps its
  // coarse high/medium/low bucket onto this scale.
  confidence: number;
  // The next-best route when routing was a close call, so the confirmation card
  // can offer a one-tap "or did you mean ...?" instead of the full grid.
  runnerUp?: { action: AiAction; subtype?: ReceiptSubtype };
}

// A parsing engine. Two implementations share this interface: a deterministic
// one (always available, free, offline) and an optional cheap-LLM one.
export interface AiProvider {
  readonly name: string;
  parse(utterance: string, context?: AiParseContext): Promise<Intent>;
}

// Minimal, explicit context passed to a provider. We never feed full chat
// history; only the last result when a follow-up needs it.
export interface AiParseContext {
  // The previous turn's proposed intent, when the user is refining it.
  lastIntent?: Intent | null;
  // The tab the user is currently on, as a routing hint. On the weak LLM this is
  // a strong disambiguation signal ("they are on the Cartridges page").
  activeTab?: string;
  // When the user corrects a misroute, skip routing entirely and treat the
  // utterance as this action (+ subtype). Extraction still runs on the text, so
  // the confirmation check fills in from what was actually said.
  forceAction?: AiAction;
  forceSubtype?: ReceiptSubtype;
}

// A generated receipt carried on an assistant turn, so the chat can offer the
// download (4x6 / full page) and print controls the brief wants in the chat, not
// in the Artifact. Uses SimpleReceiptOptions so both sizes are derivable.
import type { SimpleReceiptOptions } from '@/lib/simpleReceipt';
export interface ReceiptPayload {
  opts: SimpleReceiptOptions;
}

// A single message in the chat thread.
export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  // Plain text shown in the bubble/card.
  text: string;
  // When the assistant is proposing an action, the intent to confirm.
  intent?: Intent;
  // The user utterance that produced this assistant turn. Kept so a misroute can
  // be re-parsed under a corrected action without the user retyping.
  sourceText?: string;
  // Whether this proposed intent has been confirmed, edited, or dismissed.
  status?: 'pending' | 'confirmed' | 'dismissed';
  // A generated receipt attached to this turn (download/print controls).
  receipt?: ReceiptPayload;
  createdAt: number;
}

// A colored chip sitting in the composer before send.
export interface ComposerChip {
  id: string;
  label: string;
  // Domain the chip primes, used for coloring and routing hints.
  kind:
    | 'receipt'
    | 'refill'
    | 'purchase'
    | 'note'
    | 'inventory'
    | 'track-fedex'
    | 'track-purolator'
    | 'track-ups';
  // For tracking chips, a tracking number typed via hover-to-type.
  payload?: string;
}

// What fills the single Artifact panel. Kind decides which renderer runs.
// 'confirmation' is a proposed intent awaiting the counter's OK: the chat points
// at it ("I put the details on the right"), the rail renders the slip, and the
// rail's pinned foot carries Confirm / Not now.
export type ArtifactKind = 'receipt' | 'tracking' | 'order' | 'list' | 'confirmation' | 'none';

export interface ArtifactState {
  kind: ArtifactKind;
  title?: string;
  // Renderer-specific data. Typed per-kind by the renderer that reads it.
  data?: unknown;
}
