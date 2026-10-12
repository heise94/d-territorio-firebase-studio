export const updateTimeoutMs = 8_000;
export type UpdateResult = "ready" | "timeout" | "failed" | "cancelled";
type Worker = EventTarget & { state: string };

/** Activation may complete without claiming the current tab. Never wait forever. */
export function waitForCampaignUpdate(
  container: EventTarget,
  worker: Worker,
  requestActivation: () => void,
  timeoutMs = updateTimeoutMs,
) {
  let finish: (result: UpdateResult) => void;
  const promise = new Promise<UpdateResult>((resolve) => {
    let finished = false;
    const timer = setTimeout(() => complete("timeout"), timeoutMs);
    function complete(result: UpdateResult) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      container.removeEventListener("controllerchange", changed);
      worker.removeEventListener("statechange", stateChanged);
      resolve(result);
    }
    function changed() {
      complete("ready");
    }
    function stateChanged() {
      if (worker.state === "activated") complete("ready");
      else if (worker.state === "redundant") complete("failed");
    }
    finish = complete;
    container.addEventListener("controllerchange", changed);
    worker.addEventListener("statechange", stateChanged);
    stateChanged();
    if (!finished) {
      try {
        requestActivation();
      } catch {
        complete("failed");
      }
    }
  });
  return { promise, cancel: () => finish("cancelled") };
}
