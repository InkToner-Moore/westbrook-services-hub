// The artifact renderer registry: the seam that lets each action-state get its
// own bespoke card in the right rail without a shared switch. ArtifactRail looks
// up ARTIFACT_RENDERERS[artifact.kind]; a hit renders that kind's Body (+ Foot,
// or the generic ArtifactActions foot); a miss falls back to today's generic
// ArtifactPanel + ArtifactActions, so existing kinds (receipt/tracking/order/
// list) keep working before any new card exists. See docs/ui-rehaul/
// PHASE-2-ARCH.md section 3.2.
//
// How Wave-2/3 agents register a new kind WITHOUT editing this file:
//   1. Write the renderer in its own file, e.g.
//      src/components/ai/artifacts/RefillCard.tsx, and export a hook:
//        export function register(reg: ArtifactRegistry) {
//          reg.refill = { Body: RefillBody, Foot: RefillFoot };
//        }
//   2. The integrator adds ONE import + call at the bottom of this file:
//        import { register as registerRefill } from '@/components/ai/artifacts/RefillCard';
//        registerRefill(ARTIFACT_RENDERERS);
// Agents never edit ARTIFACT_RENDERERS directly; they export `register(reg)` and
// the integrator wires the single line above.
import React, { createContext, useContext } from 'react';
import { useAiMode, type ConfirmationArtifactData } from '@/ai/context';
import { getFieldSpecs } from '@/ai/fieldSpecs';
import ConfirmationCheck, { useConfirmationDraft, type ConfirmationDraft } from '@/components/ai/ConfirmationCheck';
import ArtifactActions from '@/components/ai/ArtifactActions';
import { register as registerReceipt } from '@/components/ai/artifacts/ReceiptCard';
import { register as registerRecord } from '@/components/ai/artifacts/RecordCard';
import { register as registerNote } from '@/components/ai/artifacts/NoteCard';
import { register as registerInventory } from '@/components/ai/artifacts/InventoryCard';
import { register as registerTimesheet } from '@/components/ai/artifacts/TimesheetCard';
import { register as registerPayment } from '@/components/ai/artifacts/PaymentCard';

export interface ArtifactRenderer {
  // The scrollable body of the rail for this kind. The rail supplies the
  // scrolling frame around it.
  Body: React.FC<{ data: unknown }>;
  // Optional pinned foot (actions). If absent, the rail shows the generic
  // ArtifactActions for this kind (download / print / open-on-carrier as today).
  Foot?: React.FC<{ data: unknown }>;
  // Optional wrapper placed around BOTH Body and Foot so a kind can share state
  // between them (the confirmation slip's editable draft is shared by its ledger
  // Body and its Confirm / Not now Foot). A kind whose Body and Foot are
  // independent does not need this.
  Provider?: React.FC<{ data: unknown; children: React.ReactNode }>;
}

export type ArtifactRegistry = Record<string, ArtifactRenderer>;

// --- 'confirmation' renderer (moved here from ArtifactRail) -----------------
// The slip and its foot share one editable draft. The rail renders Body and
// Foot as siblings, so the shared draft lives in a context supplied by the
// renderer's Provider.
interface ConfirmationCtx {
  data: ConfirmationArtifactData;
  specs: ReturnType<typeof getFieldSpecs>;
  draft: ConfirmationDraft;
}
const ConfirmationDraftContext = createContext<ConfirmationCtx | null>(null);

const useConfirmationCtx = (): ConfirmationCtx => {
  const ctx = useContext(ConfirmationDraftContext);
  if (!ctx) throw new Error('Confirmation renderer used outside its Provider');
  return ctx;
};

const ConfirmationProvider: React.FC<{ data: unknown; children: React.ReactNode }> = ({ data, children }) => {
  const d = data as ConfirmationArtifactData;
  const specs = getFieldSpecs(d.intent) ?? [];
  const draft = useConfirmationDraft(d.intent, specs);
  return (
    <ConfirmationDraftContext.Provider value={{ data: d, specs, draft }}>
      {children}
    </ConfirmationDraftContext.Provider>
  );
};

const ConfirmationBody: React.FC<{ data: unknown }> = () => {
  const { data, specs, draft } = useConfirmationCtx();
  const { rerouteIntent } = useAiMode();
  return (
    <ConfirmationCheck
      intent={data.intent}
      specs={specs ?? []}
      draft={draft}
      onReroute={(action, subtype) => rerouteIntent(data.turnId, data.sourceText, action, subtype)}
    />
  );
};

const ConfirmationFoot: React.FC<{ data: unknown }> = () => {
  const { data, draft } = useConfirmationCtx();
  const { busy, confirmArtifactIntent, dismissArtifactIntent } = useAiMode();
  return (
    <ArtifactActions
      kind="confirmation"
      confirmation={{
        canConfirm: draft.canConfirm,
        missing: draft.missing,
        busy,
        onConfirm: () => confirmArtifactIntent(data.turnId, draft.workingIntent),
        onDismiss: () => dismissArtifactIntent(data.turnId),
        attach: draft.attach,
        onToggleAttach: draft.toggleAttach,
      }}
    />
  );
};

export const ARTIFACT_RENDERERS: ArtifactRegistry = {
  confirmation: {
    Body: ConfirmationBody,
    Foot: ConfirmationFoot,
    Provider: ConfirmationProvider,
  },
};

// Wave-2 cards register themselves here, one line each, via their register(reg)
// hook (see the pattern at the top of this file). Each writes its renderer in its
// own file under src/components/ai/artifacts/; the integrator wires the calls.
registerReceipt(ARTIFACT_RENDERERS); // kind 'receipt'
registerRecord(ARTIFACT_RENDERERS); // kind 'refill'
registerNote(ARTIFACT_RENDERERS); // kind 'note'
registerInventory(ARTIFACT_RENDERERS); // kind 'inventory'
registerTimesheet(ARTIFACT_RENDERERS); // kind 'timesheet'
registerPayment(ARTIFACT_RENDERERS); // kind 'payment'
