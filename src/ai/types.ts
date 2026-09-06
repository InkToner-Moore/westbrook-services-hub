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
  | 'inventory'         // create/update inventory (write)
  | 'inventory_lookup'  // "is the HP 65 in stock?" (read, immediate)
  | 'directory'
  | 'purchase'          // send a transaction to Moneris + record it (Wave 3)
  | 'timesheet'         // punch clock / employees (Wave 3; may fan into subtypes)
  | 'track'
  | 'clarify'
  | 'unknown';

export type ReceiptSubtype = 'refill' | 'supplies' | 'shipping' | 'key';

// Optional side actions that ride along on one primary intent. An utterance like
// "refill for Sarah, HP 65, $34, charge her card and print a label" is ONE
// Record/Receipt intent that also PAYS and prints a LABEL. The confirmation slip
// renders these as toggles; on Confirm, the confirm chain runs the primary action
// then each attached side action. Keep it to exactly these two.
export interface IntentAttachments {
  pay?: boolean;      // also send to Moneris + record a transaction (Purchase)
  label?: boolean;    // also produce a 4x6 label
}

export interface Intent {
  action: AiAction;
  // For receipts, which of the four types.
  subtype?: ReceiptSubtype;
  // Extracted fields, each carrying provenance. Keyed by domain field name.
  fields: Record<string, FieldValue<unknown>>;
  // Optional side actions to run after the primary one (pay, print a label).
  attach?: IntentAttachments;
  // Present when action === 'clarify'.
  clarify?: string;
  // The two or three routes a clarify is choosing between, so the "did you mean"
  // card offers just those instead of the whole menu. Only set on a clarify.
  clarifyOptions?: Array<{ action: AiAction; subtype?: ReceiptSubtype }>;
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
//
// The kind is an OPEN union: the known kinds are listed for autocomplete and
// safety, but `(string & {})` lets a Wave-2/3 card introduce a new kind and
// register its renderer without editing this file. ArtifactRail looks the kind up
// in its renderer registry and falls back to the generic panel when it is absent.
export type KnownArtifactKind =
  | 'receipt' | 'tracking' | 'order' | 'list' | 'confirmation' | 'none'
  | 'payment'        // Purchase (Wave 3)
  | 'refill'         // Record card (Wave 2)
  | 'inventory'      // Inventory result/edit card (Wave 2)
  | 'note'           // Note card (Wave 2)
  | 'timesheet';     // Timesheet card (Wave 3)
export type ArtifactKind = KnownArtifactKind | (string & {});

export interface ArtifactState {
  kind: ArtifactKind;
  title?: string;
  // Renderer-specific data. Typed per-kind by the renderer that reads it.
  data?: unknown;
}
