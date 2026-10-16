import { z } from "zod";

export const campaignStatuses = [
  "draft",
  "registration_open",
  "planning",
  "published",
  "active",
  "completed",
] as const;
const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => value || undefined);
const optionalUrl = z
  .string()
  .trim()
  .max(2_000)
  .refine(
    (value) => value === "" || z.string().url().safeParse(value).success,
    "Ingresa una URL válida.",
  )
  .optional()
  .transform((value) => value || undefined)
  .refine(
    (value) => !value || /^https:\/\//i.test(value),
    "La URL debe usar HTTPS.",
  );
const optionalNonNegativeInt = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().int().min(0).optional(),
);

export const campaignSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  description: optionalText,
  locationName: optionalText,
  locationDetails: optionalText,
  defaultCapacityPerBlock: optionalNonNegativeInt,
  maxPointsDefault: optionalNonNegativeInt,
  status: z.enum(campaignStatuses).default("draft"),
});
export const campaignDaySchema = z.object({
  date: z.string().date("Selecciona una fecha válida."),
  label: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  maxPointsOverride: optionalNonNegativeInt,
  active: z.boolean().default(true),
});
export const timeBlockSchema = z
  .object({
    startTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Selecciona una hora de inicio válida.",
      ),
    endTime: z
      .string()
      .regex(
        /^([01]\d|2[0-3]):[0-5]\d$/,
        "Selecciona una hora de término válida.",
      ),
    label: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => value || undefined),
    capacityOverride: optionalNonNegativeInt,
    active: z.boolean().default(true),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: "La hora de término debe ser posterior a la de inicio.",
    path: ["endTime"],
  });
export const congregationSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  active: z.boolean().default(true),
});
const pointCapacityField = (defaultVal: number, fieldName: string) =>
  z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? defaultVal : val),
    z.coerce
      .number({ invalid_type_error: `Ingresa un número válido para ${fieldName}.` })
      .int(`El valor para ${fieldName} debe ser un número entero.`)
      .min(1, "El mínimo debe ser al menos 1 hermano."),
  );

export const pointSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
    description: optionalText,
    locationText: optionalText,
    mapUrl: optionalUrl,
    minParticipants: pointCapacityField(2, "el mínimo de hermanos"),
    maxParticipants: pointCapacityField(2, "el máximo de hermanos"),
    active: z.boolean().default(true),
  })
  .refine((data) => data.maxParticipants >= data.minParticipants, {
    message: "El máximo de hermanos no puede ser menor que el mínimo.",
    path: ["maxParticipants"],
  });

export const campaignInformationSchema = z
  .object({
    intro: optionalText,
    generalMapUrl: optionalUrl,
    pickup: z
      .object({
        location: optionalText,
        schedule: optionalText,
        instructions: optionalText,
        mapUrl: optionalUrl,
      })
      .strict()
      .optional(),
    returnInfo: z
      .object({
        location: optionalText,
        schedule: optionalText,
        instructions: optionalText,
        mapUrl: optionalUrl,
      })
      .strict()
      .optional(),
    contacts: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(120),
            role: optionalText,
            phone: z.string().trim().min(5).max(40),
            allowCall: z.boolean().default(true),
            allowWhatsApp: z.boolean().default(false),
          })
          .strict(),
      )
      .max(12)
      .optional(),
    notes: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(160),
            body: optionalText,
          })
          .strict(),
      )
      .max(20)
      .optional(),
  })
  .strict();
export type CampaignInput = z.infer<typeof campaignSchema>;
export type CampaignDayInput = z.infer<typeof campaignDaySchema>;
export type TimeBlockInput = z.infer<typeof timeBlockSchema>;
export type CongregationInput = z.infer<typeof congregationSchema>;
export type PointInput = z.input<typeof pointSchema>;
export type CampaignInformationInput = z.infer<
  typeof campaignInformationSchema
>;
