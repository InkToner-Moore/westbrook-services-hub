// Track executor: read-only, so it runs immediately (no confirmation) and opens
// the tracking card in the Artifact. The card links out to the carrier page.
import type { Intent } from '../types';
import type { ActionResult } from './types';
import { buildTrackingCard, type Courier } from '../tracking';

export function executeTrack(intent: Intent): ActionResult {
  const courier = (intent.fields.courier?.value as Courier | null) ?? null;
  const trackingNumber = String(intent.fields.trackingNumber?.value ?? '').trim();

  if (!trackingNumber) {
    return {
      message: 'Which tracking number should I look up? You can also hover a courier pill and type it.',
    };
  }

  const card = buildTrackingCard(courier, trackingNumber);

  if (!card.courier) {
    return {
      message: `I could not tell which carrier ${trackingNumber} belongs to. Tell me FedEx, Purolator, UPS, Canada Post, or DHL.`,
      artifact: { kind: 'tracking', title: 'Tracking', data: card },
    };
  }

  return {
    message: `Here is the ${card.courier} tracking for ${trackingNumber}.`,
    artifact: { kind: 'tracking', title: `${card.courier} tracking`, data: card },
  };
}
