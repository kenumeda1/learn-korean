import { z } from 'zod';

/** Model output for “one Korean sentence from learner vocab”. */
export const sentenceGenerationSchema = z.object({
  sentence: z.string().min(1, 'sentence required'),
  english_gloss: z.string().optional(),
  caveats: z.array(z.string()).optional(),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
  used_vocab: z
    .object({
      nouns: z.array(z.string()).optional(),
      adjectives: z.array(z.string()).optional(),
      verbs: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SentenceGeneration = z.infer<typeof sentenceGenerationSchema>;
