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

/**
 * Single entry for LLM access (P1 in TODOS.md).
 * - Production-style: set `VITE_LLM_PROXY_PATH` (e.g. `/api/chat`) and implement proxy server.
 * - Dev direct: enable BYOK in UI, or set `VITE_OPENAI_API_KEY` (optional convenience; still prefer BYOK for real keys).
 */
export function getLlmClient(): LlmClient {
  const proxyPath = getEnv('VITE_LLM_PROXY_PATH');
  if (proxyPath) return createProxyLlmClient(proxyPath);

  const byok = readLocalStorage(STORAGE_BYOK) === 'true';
  const storedKey = readLocalStorage(STORAGE_API_KEY);
  const envKey = getEnv('VITE_OPENAI_API_KEY');
  const apiKey = byok ? storedKey : envKey;

  if (!apiKey) {
    throw new Error(
      'No API key: enable "Store API key locally (dev)" in the app, set VITE_OPENAI_API_KEY for local builds, or set VITE_LLM_PROXY_PATH for a same-origin proxy.',
    );
  }

  const baseUrl =
    getEnv('VITE_OPENAI_BASE_URL') ?? 'https://api.openai.com';
  const model = getEnv('VITE_OPENAI_MODEL') ?? 'gpt-4o-mini';

  return createOpenAiCompatibleClient({ apiKey, baseUrl, model });
}

export const llmStorageKeys = {
  byokEnabled: STORAGE_BYOK,
  apiKey: STORAGE_API_KEY,
} as const;
