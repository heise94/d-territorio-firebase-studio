import { z } from "zod";

export const campaignDocumentIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,128}$/);
export const maxTurnsSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.null(),
]);
export const saveRegistrationSchema = z
  .object({
    congregationId: campaignDocumentIdSchema,
    maxTurns: maxTurnsSchema,
    timeBlockIds: z.array(campaignDocumentIdSchema).max(400),
  })
  .strict()
  .refine(
    (data) => new Set(data.timeBlockIds).size === data.timeBlockIds.length,
    {
      message: "No repitas horarios.",
      path: ["timeBlockIds"],
    },
  );
