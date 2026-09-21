import { z } from "zod";

export const implementationPatchSchema = z.object({
  summary: z.string().max(500),
  patches: z
    .array(
      z.object({
        path: z.string().min(1).max(240),
        content: z.string().min(1).max(120_000),
        changeSummary: z.string().max(500),
      })
    )
    .min(1)
    .max(4),
});

export type ImplementationPatch = z.infer<typeof implementationPatchSchema>;
