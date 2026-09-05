// Registry of action executors, keyed by intent action. AiOverlay looks up an
// executor when the user confirms an intent. Missing actions fall back to a plain
// acknowledgement until their executor is added in a later phase.
import type { AiAction } from '../types';
import type { ActionExecutor } from './types';
import { executeReceipt } from './receipt';
import { executeTrack } from './track';
import {
  executeCartridgeCreate,
  executeCartridgeList,
  executeCartridgeModify,
  executeCartridgeStatus,
} from './cartridge';
import { executeDirectory, executeInventory, executeInventoryLookup, executeNote } from './collections';

const REGISTRY: Partial<Record<AiAction, ActionExecutor>> = {
  receipt: executeReceipt,
  track: executeTrack,
  cartridge_create: executeCartridgeCreate,
  cartridge_status: executeCartridgeStatus,
  cartridge_list: executeCartridgeList,
  cartridge_modify: executeCartridgeModify,
  note: executeNote,
  inventory: executeInventory,
  inventory_lookup: executeInventoryLookup,
  directory: executeDirectory,
};

export function getExecutor(action: AiAction): ActionExecutor | undefined {
  return REGISTRY[action];
}

// Read-only actions that are safe to run immediately, with no confirmation step.
const IMMEDIATE: Set<AiAction> = new Set([
  'track',
  'cartridge_list',
  'cartridge_modify',
  'inventory_lookup',
]);

export function isImmediate(action: AiAction): boolean {
  return IMMEDIATE.has(action);
}
