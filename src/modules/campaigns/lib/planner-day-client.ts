import type { PlannerDayView, PlannerWarningDTO } from "../domain/planner";

export class PlannerHttpError extends Error {
  constructor(message: string, public status: number, public warnings: PlannerWarningDTO[] = []) { super(message); }
}

export async function plannerResponse(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new PlannerHttpError(
    typeof data?.error === "string" ? data.error :
      response.status === 401 || response.status === 403 ? "No tienes acceso a esta planificación." :
      "No pudimos actualizar la planificación. Reintentar", response.status, data?.warnings ?? [],
  );
  if (!data || typeof data !== "object") throw new PlannerHttpError("El servidor no entregó una respuesta válida. Reintentar", response.status);
  return data;
}

export async function loadPlannerDay(fetcher: typeof fetch, base: string, token: string, dayId: string, signal: AbortSignal): Promise<PlannerDayView> {
  const response = await fetcher(`${base}/planner?dayId=${encodeURIComponent(dayId)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal,
  });
  const data = await plannerResponse(response);
  if (!data.campaign || !Array.isArray(data.blocks) || !Array.isArray(data.days))
    throw new PlannerHttpError("No pudimos cargar el día. Reintentar", 500);
  return data;
}

export function plannerViewAfterFailure(previous: PlannerDayView | null, failure: unknown) {
  return failure instanceof PlannerHttpError && [401, 403].includes(failure.status) ? null : previous;
}
