export const installDismissalMilliseconds = 7 * 24 * 3_600_000;
export function isAppleMobile(userAgent: string, touchPoints: number) {
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (/Macintosh/.test(userAgent) && touchPoints > 1)
  );
}
export function isInstallDismissed(value: string | null, now: number) {
  const timestamp = Number(value);
  return (
    timestamp > 0 &&
    timestamp <= now &&
    now - timestamp < installDismissalMilliseconds
  );
}
