import { z } from 'zod';

/** Model output: English prompt to translate + model Korean reference (new flow). Legacy entries used Korean in `sentence` and English in `english_gloss`. */
export const sentenceGenerationSchema = z.object({
  /** English sentence the learner translates into Korean (new format). */
  sentence: z.string().min(1, 'sentence required'),
  /** Natural Korean using the learner’s vocab (required for new generations; absent on legacy saved entries). */
  korean_reference: z.string().min(1).optional(),
  /** Legacy: English gloss when `sentence` was Korean. Ignored when `korean_reference` is set. */
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
