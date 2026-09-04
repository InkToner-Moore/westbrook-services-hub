// Provider selection. Deterministic is always the baseline. When an LLM proxy URL
// is configured (VITE_AI_PROXY_URL), an LlmProvider wraps it and falls back to
// deterministic on any error. The rest of the app only ever sees the AiProvider
// interface.
import type { AiProvider } from '../types';
import { DeterministicProvider } from './deterministic';
import { LlmProvider } from './llm';

let cached: AiProvider | null = null;

export function getProvider(): AiProvider {
  if (cached) return cached;
  const proxyUrl = import.meta.env.VITE_AI_PROXY_URL as string | undefined;
  cached = proxyUrl ? new LlmProvider(proxyUrl) : new DeterministicProvider();
  return cached;
}
