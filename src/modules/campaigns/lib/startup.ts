/** Participant phone/PIN sessions never need the platform's Firebase Auth provider. */
export function usesParticipantStartup(pathname: string): boolean {
  return pathname === "/unirse" || pathname === "/campanas" ||
    (pathname.startsWith("/campanas/") && pathname !== "/campanas/admin" && !pathname.startsWith("/campanas/admin/"));
}
