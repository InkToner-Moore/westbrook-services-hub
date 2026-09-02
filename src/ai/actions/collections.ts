// Chat create actions for the simpler collections: a staff note, a key inventory
// model, a website directory link, and a customer follow-up. Each reuses the same
// Firestore helpers and document shapes the corresponding page uses, so items
// added here show up there unchanged. Listing/editing stay on the pages for now.
import {
  generateInventoryId,
  generateNoteId,
  generateRequestId,
  setDocument,
} from '@/lib/firestore';
import type { Intent } from '../types';
import type { ActionResult } from './types';

function str(intent: Intent, key: string): string {
  const v = intent.fields[key]?.value;
  return v == null ? '' : String(v).trim();
}
function bool(intent: Intent, key: string): boolean {
  return intent.fields[key]?.value === true;
}
function nowIso(): string {
  return new Date().toISOString();
}

const NOTE_CATEGORIES = ['general', 'customer', 'inventory', 'shipping', 'urgent'];

export async function executeNote(intent: Intent): Promise<ActionResult> {
  const content = str(intent, 'content');
  const rawCategory = str(intent, 'noteCategory').toLowerCase();
  const category = NOTE_CATEGORIES.includes(rawCategory) ? rawCategory : 'general';
  const title = content.length > 42 ? `${content.slice(0, 42).trim()}...` : content || 'Note';
  const id = generateNoteId();

  await setDocument('notes', id, {
    id,
    title,
    content,
    category,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return { message: `Saved a ${category} note.` };
}

export async function executeInventory(intent: Intent): Promise<ActionResult> {
  const model = str(intent, 'keyName');
  const inStock = intent.fields.inStock ? bool(intent, 'inStock') : true;
  const id = generateInventoryId();

  await setDocument('keyInventory', id, {
    id,
    model,
    inStock,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return { message: `Added ${model} to key inventory, ${inStock ? 'in stock' : 'out of stock'}.` };
}

const DIRECTORY_CATEGORIES = ['courier', 'admin', 'shipping', 'other'];

// Directory ids follow the page's DIR- scheme (that generator is page-local).
function generateDirectoryId(): string {
  let s = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < 6; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return `DIR-${s}`;
}

function normalizeUrl(url: string): string {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export async function executeDirectory(intent: Intent): Promise<ActionResult> {
  const name = str(intent, 'linkName');
  const url = normalizeUrl(str(intent, 'url'));
  const rawCategory = str(intent, 'linkCategory').toLowerCase();
  const category = DIRECTORY_CATEGORIES.includes(rawCategory) ? rawCategory : 'other';
  const id = generateDirectoryId();

  await setDocument('directoryLinks', id, {
    id,
    name,
    description: str(intent, 'linkDescription'),
    url,
    category,
    iconKey: 'link',
    colorKey: 'blue',
    isAdmin: false,
    // Append to the end; the page sorts by this ascending.
    order: Date.now(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  return { message: `Added ${name} to the website directory.` };
}

export async function executeFollowup(intent: Intent): Promise<ActionResult> {
  const customerName = str(intent, 'customerName');
  const item = str(intent, 'item');
  const id = generateRequestId();

  await setDocument('customerRequests', id, {
    id,
    customerName,
    customerPhone: str(intent, 'customerPhone'),
    item,
    createdAt: nowIso(),
  });

  return { message: `Logged a follow-up for ${customerName}: ${item}.` };
}
