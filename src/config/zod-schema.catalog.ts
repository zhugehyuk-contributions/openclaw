import { z } from "zod";

const ThinkLevelSchema = z.union([
  z.literal("off"),
  z.literal("minimal"),
  z.literal("low"),
  z.literal("medium"),
  z.literal("high"),
  z.literal("xhigh"),
]);

export const ModelPresetSchema = z
  .object({
    model: z.string(),
    thinking: ThinkLevelSchema.optional(),
  })
  .strict();

export const PersonaSchema = z
  .object({
    soulPath: z.string(),
  })
  .strict();

export const CatalogSchema = z
  .object({
    modelPresets: z.record(z.string(), ModelPresetSchema).optional(),
    personas: z.record(z.string(), PersonaSchema).optional(),
  })
  .strict()
  .optional();
