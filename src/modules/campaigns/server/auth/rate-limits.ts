import "server-only";

export const globalAuthDefaults = { register: 160, login: 240 } as const;
/** Server-only ceilings; invalid configuration fails closed, never disables protection. */
export function globalAuthLimit(action: "register" | "login") {
  const key =
    action === "register"
      ? "CAMPAIGNS_AUTH_REGISTER_GLOBAL_LIMIT"
      : "CAMPAIGNS_AUTH_LOGIN_GLOBAL_LIMIT";
  const raw = process.env[key];
  if (raw === undefined) return globalAuthDefaults[action];
  if (
    !/^\d+$/.test(raw) ||
    !Number.isSafeInteger(Number(raw)) ||
    Number(raw) < 1 ||
    Number(raw) > 10000
  )
    throw new Error(`Invalid server configuration: ${key}`);
  return Number(raw);
}
