import { createAnthropicClient } from './anthropic';
import { createOpenAiCompatibleClient, createProxyLlmClient } from './openaiCompatible';
import type { LlmClient } from './types';

const STORAGE_BYOK = 'language-helper:byok-enabled';
const STORAGE_API_KEY = 'language-helper:api-key';

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function getEnv(key: keyof ImportMetaEnv): string | undefined {
  const v = import.meta.env[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function isAnthropicKey(key: string): boolean {
  return key.startsWith('sk-ant');
}

/**
 * Single entry for LLM access (P1 in TODOS.md).
 * - Production-style: set `VITE_LLM_PROXY_PATH` (e.g. `/api/chat`) and implement proxy server.
 * - Dev direct: browser-stored key (see STORAGE_*), or `VITE_OPENAI_API_KEY` / `VITE_ANTHROPIC_API_KEY` in `.env`.
 * - Claude keys (`sk-ant-...`) use Anthropic automatically unless `VITE_LLM_PROVIDER=openai`.
 */
export function getLlmClient(): LlmClient {
  const proxyPath = getEnv('VITE_LLM_PROXY_PATH');
  if (proxyPath) return createProxyLlmClient(proxyPath);

  const byok = readLocalStorage(STORAGE_BYOK) === 'true';
  const storedKey = readLocalStorage(STORAGE_API_KEY);
  const envOpenAi = getEnv('VITE_OPENAI_API_KEY');
  const envAnthropic = getEnv('VITE_ANTHROPIC_API_KEY');
  const providerPref = getEnv('VITE_LLM_PROVIDER');

  const apiKey = byok ? storedKey : (envOpenAi ?? envAnthropic);

  if (!apiKey) {
    throw new Error(
      'No API key: set VITE_OPENAI_API_KEY or VITE_ANTHROPIC_API_KEY in your environment, or set VITE_LLM_PROXY_PATH for a same-origin proxy.',
    );
  }

  const useAnthropic =
    providerPref === 'anthropic' ||
    (providerPref !== 'openai' &&
      (isAnthropicKey(apiKey) || (!envOpenAi && !!envAnthropic && !byok)));

  if (useAnthropic) {
    const baseUrl = getEnv('VITE_ANTHROPIC_BASE_URL') ?? 'https://api.anthropic.com';
    // Default: current fast model per https://docs.anthropic.com/en/docs/about-claude/models/overview
    const model = getEnv('VITE_ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001';
    return createAnthropicClient({ apiKey, baseUrl, model });
  }

  const baseUrl = getEnv('VITE_OPENAI_BASE_URL') ?? 'https://api.openai.com';
  const model = getEnv('VITE_OPENAI_MODEL') ?? 'gpt-4o-mini';
  return createOpenAiCompatibleClient({ apiKey, baseUrl, model });
}

export const llmStorageKeys = {
  byokEnabled: STORAGE_BYOK,
  apiKey: STORAGE_API_KEY,
} as const;
