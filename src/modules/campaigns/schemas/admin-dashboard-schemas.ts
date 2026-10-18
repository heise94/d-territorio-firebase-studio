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

export const adminUpdateAvailabilitySchema = z
  .object({
    blockChanges: z
      .array(
        z.object({
          blockId: campaignDocumentIdSchema,
          available: z.boolean(),
        }),
      )
      .default([]),
    maxTurns: z.union([z.number().int().min(1).max(10), z.null()]).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export const adminUpdateParticipantNameSchema = z.object({
  fullName: z.string().trim().min(2, "Ingresa el nombre.").max(120),
}).strict();

export const adminCreatePairRequestSchema = z.object({
  recipientRegistrationId: campaignDocumentIdSchema,
  timeBlockId: campaignDocumentIdSchema,
  acceptImmediately: z.boolean().optional().default(false),
}).strict();

export const adminAcceptPairRequestSchema = z.object({
  action: z.literal("accept"),
  requestId: campaignDocumentIdSchema,
}).strict();

export type AdminUpdateAvailabilityInput = z.infer<
  typeof adminUpdateAvailabilitySchema
>;
