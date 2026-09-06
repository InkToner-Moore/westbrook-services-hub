// Registry of action executors, keyed by intent action. The artifact rail looks
// up an executor when the user confirms an intent. Missing actions fall back to a
// plain acknowledgement until their executor is added in a later phase.
import type { AiAction, Intent } from '../types';
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
import { executeTimesheet } from './timesheet';

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
  timesheet: executeTimesheet,
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

// Whether an intent runs immediately (no confirmation slip). Timesheet is
// op-aware: punch in/out and the read views run at once (like track/list), but
// adding an employee goes through the confirmation slip. See PHASE-2.md item 6.
export function isImmediate(intent: Intent): boolean {
  if (intent.action === 'timesheet') {
    const op = intent.fields?.op?.value;
    return op !== 'add_employee';
  }
  return IMMEDIATE.has(intent.action);
}
