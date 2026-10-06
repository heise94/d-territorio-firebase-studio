import { z } from "zod";
import { campaignDocumentIdSchema } from "./registration-schemas";
import { normalizePairSearch } from "../domain/pair-request";

export const pairSearchSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((value) => normalizePairSearch(value).length >= 2);
export const pairMutationSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      recipientRegistrationId: campaignDocumentIdSchema,
    })
    .strict(),
  z
    .object({
      action: z.enum(["accept", "reject", "cancel"]),
      requestId: campaignDocumentIdSchema,
    })
    .strict(),
]);
