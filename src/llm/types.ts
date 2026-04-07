export type ChatRole = 'system' | 'user';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type CompleteJsonOptions = {
  signal?: AbortSignal;
};

export type LlmClient = {
  /** Single completion; response must be JSON (provider uses json mode when supported). */
  completeJson: (messages: ChatMessage[], options?: CompleteJsonOptions) => Promise<string>;
};
