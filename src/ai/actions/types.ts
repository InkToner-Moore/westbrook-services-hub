// The action-execution layer. A confirmed Intent is handed to an executor that
// does the real, deterministic work (build a receipt, write to Firestore) and
// returns a result the chat renders. Every feature phase adds an executor here
// following the same shape. See docs/ai-mode/02-implementation-plan.md.
import type { ArtifactState, Intent, ReceiptPayload } from '../types';

export interface ActionResult {
  // Short, warm line shown in the chat after the action runs.
  message: string;
  // Optional content to open in the single Artifact panel.
  artifact?: ArtifactState;
  // Optional generated receipt (download/print controls in the chat).
  receipt?: ReceiptPayload;
}

export type ActionExecutor = (intent: Intent) => Promise<ActionResult> | ActionResult;
