import type { ChatMessage, CompleteJsonOptions, LlmClient } from './types';

type CreateAnthropicOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

type AnthropicMessage = { role: 'user' | 'assistant'; content: string };

type AnthropicOk = {
  content: Array<{ type: string; text?: string }>;
};

type AnthropicErr = {
  error?: { type?: string; message?: string };
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Anthropic requires alternating user/assistant; merge consecutive user turns. */
function toAnthropicPayload(messages: ChatMessage[]): { system: string; messages: AnthropicMessage[] } {
  const systemChunks: string[] = [];
  const nonSystem: ChatMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') systemChunks.push(m.content);
    else nonSystem.push(m);
  }
  let userBlob = '';
  for (const m of nonSystem) {
    if (m.role === 'user') {
      userBlob = userBlob ? `${userBlob}\n\n${m.content}` : m.content;
    }
  }
  const out: AnthropicMessage[] = [];
  if (userBlob) out.push({ role: 'user', content: userBlob });
  const system =
    systemChunks.join('\n\n') +
    (systemChunks.length
      ? '\n\nReply with a single JSON object only, no markdown or other text.'
      : 'Reply with a single JSON object only, no markdown or other text.');
  return { system, messages: out };
}

export function createAnthropicClient(opts: CreateAnthropicOptions): LlmClient {
  const base = normalizeBaseUrl(opts.baseUrl);
  return {
    async completeJson(messages: ChatMessage[], options?: CompleteJsonOptions): Promise<string> {
      const { system, messages: amsg } = toAnthropicPayload(messages);
      if (amsg.length === 0) throw new Error('Anthropic request has no user content');

      const res = await fetch(`${base}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': opts.apiKey,
          'anthropic-version': '2023-06-01',
          // Required for browser fetch; BYOK / dev-only use matches Anthropic's intended pattern.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        signal: options?.signal,
        body: JSON.stringify({
          model: opts.model,
          max_tokens: 2048,
          temperature: 0.6,
          system,
          messages: amsg,
        }),
      });

      const data = (await res.json()) as AnthropicOk & AnthropicErr;
      if (!res.ok) {
        const msg = data.error?.message ?? res.statusText;
        throw new Error(`LLM HTTP ${res.status}: ${msg}`);
      }
      const block = data.content?.find((c) => c.type === 'text');
      const text = block?.text?.trim();
      if (!text) throw new Error('Empty model content');
      return text;
    },
  };
}
