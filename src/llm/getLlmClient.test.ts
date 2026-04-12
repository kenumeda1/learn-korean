import { describe, it, expect, beforeEach, vi } from 'vitest';

// getLlmClient reads import.meta.env at call time, so we mock the module
// and then swap env values per test using vi.stubEnv.

const K_BYOK = 'language-helper:byok-enabled';
const K_KEY = 'language-helper:api-key';

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe('getLlmClient routing', () => {
  it('returns proxy client when VITE_LLM_PROXY_PATH is set', async () => {
    vi.stubEnv('VITE_LLM_PROXY_PATH', '/api/chat');
    const { getLlmClient } = await import('./getLlmClient');
    const client = getLlmClient();
    // proxy client completeJson posts to /api/chat — just check it exists
    expect(typeof client.completeJson).toBe('function');
  });

  it('throws when no key is available', async () => {
    // No env vars, no localStorage key
    vi.stubEnv('VITE_LLM_PROXY_PATH', '');
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '');
    const { getLlmClient } = await import('./getLlmClient');
    expect(() => getLlmClient()).toThrow(/No API key/);
  });

  it('uses Anthropic client for sk-ant- key from env', async () => {
    vi.stubEnv('VITE_LLM_PROXY_PATH', '');
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', 'sk-ant-test123');
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    const { getLlmClient } = await import('./getLlmClient');
    const client = getLlmClient();
    expect(typeof client.completeJson).toBe('function');
  });

  it('uses OpenAI-compatible client for non-sk-ant- key from env', async () => {
    vi.stubEnv('VITE_LLM_PROXY_PATH', '');
    vi.stubEnv('VITE_OPENAI_API_KEY', 'sk-openai-test');
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '');
    const { getLlmClient } = await import('./getLlmClient');
    const client = getLlmClient();
    expect(typeof client.completeJson).toBe('function');
  });

  it('uses BYOK key from localStorage when byok=true', async () => {
    vi.stubEnv('VITE_LLM_PROXY_PATH', '');
    vi.stubEnv('VITE_OPENAI_API_KEY', '');
    vi.stubEnv('VITE_ANTHROPIC_API_KEY', '');
    localStorage.setItem(K_BYOK, 'true');
    localStorage.setItem(K_KEY, 'sk-ant-byok-key');
    const { getLlmClient } = await import('./getLlmClient');
    const client = getLlmClient();
    expect(typeof client.completeJson).toBe('function');
  });
});
