export type ChatRole = 'system' | 'user';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LlmClient = {
  /** Single completion; response must be JSON (provider uses json mode when supported). */
  completeJson: (messages: ChatMessage[]) => Promise<string>;
};
