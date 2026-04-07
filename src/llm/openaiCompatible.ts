import type { ChatMessage, CompleteJsonOptions, LlmClient } from './types';

type CreateClientOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function createOpenAiCompatibleClient(opts: CreateClientOptions): LlmClient {
  const base = normalizeBaseUrl(opts.baseUrl);
  return {
    async completeJson(messages: ChatMessage[], options?: CompleteJsonOptions): Promise<string> {
      const res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${opts.apiKey}`,
        },
        signal: options?.signal,
        body: JSON.stringify({
          model: opts.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.6,
        }),
      });

      const data = (await res.json()) as OpenAiChatResponse;
      if (!res.ok) {
        const msg = data.error?.message ?? res.statusText;
        throw new Error(`LLM HTTP ${res.status}: ${msg}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty model content');
      return content;
    },
  };
}

/** Same-origin proxy: POST JSON body `{ model, messages, response_format, temperature }`. */
export function createProxyLlmClient(proxyPath: string): LlmClient {
  const path = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`;
  return {
    async completeJson(messages: ChatMessage[], options?: CompleteJsonOptions): Promise<string> {
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: options?.signal,
        body: JSON.stringify({
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.6,
        }),
      });
      const text = await res.text();
      let data: { content?: string; error?: string };
      try {
        data = JSON.parse(text) as { content?: string; error?: string };
      } catch {
        throw new Error(`Proxy returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(data.error ?? `Proxy error ${res.status}`);
      if (!data.content) throw new Error('Proxy returned empty content');
      return data.content;
    },
  };
}
