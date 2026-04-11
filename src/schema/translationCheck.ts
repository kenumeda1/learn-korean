import { z } from 'zod';

export const translationCheckSchema = z.object({
  verdict: z.enum(['good', 'close', 'needs_work']),
  feedback: z.string().min(1),
});

export type TranslationCheck = z.infer<typeof translationCheckSchema>;
