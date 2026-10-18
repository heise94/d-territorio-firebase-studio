import { normalizePairSearch } from "../domain/pair-request";

export function matchesParticipantSearch(name: string, phone: string | undefined, query: string): boolean {
  const term = normalizePairSearch(query.trim());
  if (!term) return true;
  const digits = query.replace(/\D/g, "");
  return normalizePairSearch(name).includes(term) || (digits.length >= 3 && Boolean(phone?.includes(digits)));
}
