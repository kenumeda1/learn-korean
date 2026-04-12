import type { VercelRequest, VercelResponse } from '@vercel/node';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type RequestBody = {
  messages: ChatMessage[];
  temperature?: number;
};

type AnthropicMessage = { role: 'user' | 'assistant'; content: string };

function toAnthropicPayload(messages: ChatMessage[]): {
  system: string;
  messages: AnthropicMessage[];
} {
  const systemChunks: string[] = [];
  const nonSystem: ChatMessage[] = [];

  for (const m of messages) {
    if (m.role === 'system') systemChunks.push(m.content);
    else nonSystem.push(m);
  }

  // Merge consecutive user turns (Anthropic requires alternating)
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
    (systemChunks.length ? '\n\nReply with a single JSON object only, no markdown or other text.' : 'Reply with a single JSON object only, no markdown or other text.');

  return { system, messages: out };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
  }

  const { messages, temperature = 0.6 } = req.body as RequestBody;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages array required' });
  }

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
  const baseUrl = (process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com').replace(/\/+$/, '');

  const { system, messages: anthropicMessages } = toAnthropicPayload(messages);

  if (anthropicMessages.length === 0) {
    return res.status(400).json({ error: 'No user content in messages' });
  }

  const upstream = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      temperature,
      system,
      messages: anthropicMessages,
    }),
  });

  const data = await upstream.json() as {
    content?: Array<{ type: string; text?: string }>;
    error?: { message?: string };
  };

  if (!upstream.ok) {
    const msg = data.error?.message ?? upstream.statusText;
    return res.status(upstream.status).json({ error: `Anthropic error: ${msg}` });
  }

  const block = data.content?.find((c) => c.type === 'text');
  const content = block?.text?.trim();

  if (!content) {
    return res.status(500).json({ error: 'Empty response from model' });
  }

  return res.status(200).json({ content });
}
