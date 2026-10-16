import { z } from "zod";

export function normalizeChileanPhone(input: string): string {
  const compact = input.trim().replace(/\D/g, "");
  if (/^\d{8}$/.test(compact)) return `+569${compact}`;
  // `compact` contains digits only, so the Chilean country prefix is `56`.
  const national = compact.startsWith("56") ? compact.slice(2) : compact;
  if (!/^9\d{8}$/.test(national))
    throw new Error("Ingresa un teléfono móvil chileno válido.");
  return `+56${national}`;
}

/** Converts pasted Chilean mobile formats to the eight digits shown in the organizer form. */
export function organizerPhoneDigits(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0056")) digits = digits.slice(4);
  if (digits.startsWith("56")) digits = digits.slice(2);
  if (digits.length === 9 && digits.startsWith("9")) digits = digits.slice(1);
  return digits.slice(0, 8);
}

export function normalizePersonName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) =>
      word
        .split(/([-’'])/u)
        .map((part) =>
          /^[-’']$/u.test(part)
            ? part
            : part
              ? part.charAt(0).toLocaleUpperCase("es-CL") + part.slice(1).toLocaleLowerCase("es-CL")
              : part,
        )
        .join(""),
    )
    .join(" ");
}

export const phoneSchema = z
  .string()
  .max(40)
  .transform((value, ctx) => {
    try {
      return normalizeChileanPhone(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa los 8 dígitos de tu teléfono.",
      });
      return z.NEVER;
    }
  });
export const pinSchema = z
  .string()
  .regex(/^\d{4,6}$/, "El PIN debe tener de 4 a 6 números.");
export const loginSchema = z
  .object({ phone: phoneSchema, pin: pinSchema })
  .strict();
export const registrationSchema = loginSchema
  .extend({
    fullName: z.string().trim().min(2, "Ingresa tu nombre.").max(120),
    congregationId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,128}$/)
      .min(1, "Selecciona tu congregación."),
    confirmPin: pinSchema,
  })
  .refine((value) => value.pin === value.confirmPin, {
    message: "Los PIN no coinciden.",
    path: ["confirmPin"],
  });
export const changePinSchema = z
  .object({ currentPin: pinSchema, newPin: pinSchema, confirmPin: pinSchema })
  .strict()
  .refine((value) => value.newPin === value.confirmPin, {
    message: "Los PIN no coinciden.",
    path: ["confirmPin"],
  });
export const resetPinSchema = z
  .object({
    participantId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    newPin: pinSchema,
  })
  .strict();
