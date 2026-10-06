import "server-only";
export type OperationalArea =
  | "participant"
  | "admin"
  | "publication"
  | "change"
  | "push"
  | "scheduler";
/** Fixed fields only. Never serialize an Error, request, headers or identity. */
export function operationalLog(
  area: OperationalArea,
  status: number,
  counts?: { delivered: number; failed: number; skipped: number },
) {
  if (
    status < 500 &&
    status !== 429 &&
    area !== "push" &&
    area !== "scheduler" &&
    !(["publication", "change"].includes(area) && status >= 400)
  )
    return;
  console.info(
    JSON.stringify({
      component: "campaigns",
      area,
      status,
      ...(counts
        ? {
            delivered: counts.delivered,
            failed: counts.failed,
            skipped: counts.skipped,
          }
        : {}),
    }),
  );
}
