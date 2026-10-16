"use client";
export const offlineMessage =
  "No pudimos actualizar porque estás sin conexión.";
export async function campaignFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  if (!navigator.onLine) throw new Error(offlineMessage);
  try {
    return await fetch(input, { ...init, cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new Error(offlineMessage);
  }
}
