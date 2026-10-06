import { z } from "zod";
import { campaignDocumentIdSchema } from "./registration-schemas";
export const adminParticipantFiltersSchema = z
  .object({
    q: z.string().trim().max(120).default(""),
    congregationId: campaignDocumentIdSchema.optional(),
    dayId: campaignDocumentIdSchema.optional(),
    blockId: campaignDocumentIdSchema.optional(),
    status: z.enum(["active", "withdrawn", "cancelled"]).default("active"),
    link: z
      .enum(["all", "none", "pending", "accepted", "conflict"])
      .default("all"),
    page: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .strict();
export type AdminParticipantFilters = z.infer<
  typeof adminParticipantFiltersSchema
>;
