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
import {
  executeDirectory,
  executeInventory,
  executeInventoryLookup,
  executeKeyLocation,
  executeNote,
} from './collections';
import { executeTimesheet } from './timesheet';
import { managerUnlocked } from '@/lib/managerAuth';

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
  key_location: executeKeyLocation,
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
  'key_location',
]);

const TIMESHEET_CONFIRMABLE = new Set(['add_employee', 'add_shift', 'adjust_shift']);

// Whether an intent runs immediately (no confirmation slip). Timesheet is
// op-aware: the read views run at once (like track/list), while adding an
// employee, planning a shift and logging actual times go through the slip.
// Planning a shift is manager-only, so while the schedule is locked it runs
// immediately too: the executor answers with the "manager sign in" card instead
// of making the counter fill a slip that cannot be saved.
export function isImmediate(intent: Intent): boolean {
  if (intent.action === 'timesheet') {
    const op = String(intent.fields?.op?.value ?? '');
    if (op === 'add_shift' && !managerUnlocked()) return true;
    return !TIMESHEET_CONFIRMABLE.has(op);
  }
  return IMMEDIATE.has(intent.action);
}
