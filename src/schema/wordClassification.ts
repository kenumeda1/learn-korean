import { z } from 'zod';

export const wordPosSchema = z.enum(['noun', 'adjective', 'verb']);
export type WordPos = z.infer<typeof wordPosSchema>;

export const wordClassificationSchema = z.object({
  pos: wordPosSchema,
  confidence: z.enum(['low', 'medium', 'high']),
  /** Short English gloss / translation for learners (dictionary-style, a few words). */
  en: z.string(),
  note: z.string().optional(),
});

export type WordClassification = z.infer<typeof wordClassificationSchema>;
