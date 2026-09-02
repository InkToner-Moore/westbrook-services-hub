// Registry of action executors, keyed by intent action. AiOverlay looks up an
// executor when the user confirms an intent. Missing actions fall back to a plain
// acknowledgement until their executor is added in a later phase.
import type { AiAction } from '../types';
import type { ActionExecutor } from './types';
import { executeReceipt } from './receipt';

const REGISTRY: Partial<Record<AiAction, ActionExecutor>> = {
  receipt: executeReceipt,
};

export function getExecutor(action: AiAction): ActionExecutor | undefined {
  return REGISTRY[action];
}
