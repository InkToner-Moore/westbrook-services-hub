// Provider selection. Deterministic is always the baseline. When an LLM proxy is
// configured (Phase 8), an LlmProvider wraps it and falls back to deterministic on
// any error. The rest of the app only ever sees the AiProvider interface.
import type { AiProvider } from '../types';
import { DeterministicProvider } from './deterministic';

let cached: AiProvider | null = null;

export function getProvider(): AiProvider {
  if (cached) return cached;
  // Phase 8 will branch here on an env-configured proxy URL and return an
  // LlmProvider(deterministicFallback). For now the deterministic engine is it.
  cached = new DeterministicProvider();
  return cached;
}
