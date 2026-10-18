type UpdateWorker = EventTarget & { state: string };
type UpdateRegistration<W extends UpdateWorker> = EventTarget & {
  waiting: W | null; installing: W | null; active: W | null;
  update(): Promise<unknown>;
};
type UpdateContainer<W extends UpdateWorker> = EventTarget & { controller: W | null };

export async function checkCampaignRegistration<W extends UpdateWorker>(
  registration: UpdateRegistration<W>, timeoutMs = 8_000,
): Promise<"available" | "installing" | "current"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      registration.update(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("update-timeout")), timeoutMs); }),
    ]);
    return registration.waiting ? "available" : registration.installing ? "installing" : "current";
  } finally { clearTimeout(timer); }
}

/** Recheck on every resume, reconnection and while open; never delay rendering. */
export function monitorCampaignUpdates<W extends UpdateWorker>(
  registration: UpdateRegistration<W>, container: UpdateContainer<W>,
  options: {
    onReady: (worker: W) => void;
    isVisible: () => boolean;
    isOnline: () => boolean;
    windowEvents: EventTarget;
    documentEvents: EventTarget;
    intervalMs?: number;
    minimumCheckIntervalMs?: number;
  },
) {
  let stopped = false, checking = false, lastCheck = -Infinity;
  let lastReady: W | null = null;
  let original = container.controller ?? registration.active;
  const tracked = new Set<W>();
  const announce = (worker: W | null) => {
    if (!stopped && worker && worker !== lastReady) { lastReady = worker; options.onReady(worker); }
  };
  const inspect = () => {
    original ??= container.controller ?? registration.active;
    if (original) announce(registration.waiting);
  };
  const track = () => {
    if (stopped) return;
    const worker = registration.installing;
    if (worker && !tracked.has(worker)) {
      tracked.add(worker);
      worker.addEventListener("statechange", inspect);
    }
    inspect();
  };
  const changedController = () => {
    if (!original) original = container.controller;
    else if (container.controller !== original) announce(container.controller);
  };
  const check = () => {
    inspect();
    if (stopped || checking || !options.isOnline() || !options.isVisible() ||
      Date.now() - lastCheck < (options.minimumCheckIntervalMs ?? 10_000)) return;
    checking = true; lastCheck = Date.now();
    void checkCampaignRegistration(registration).then(track).catch(() => {}).finally(() => { checking = false; });
  };
  registration.addEventListener("updatefound", track);
  container.addEventListener("controllerchange", changedController);
  for (const name of ["focus", "online", "pageshow"]) options.windowEvents.addEventListener(name, check);
  options.documentEvents.addEventListener("visibilitychange", check);
  const interval = setInterval(check, options.intervalMs ?? 60_000);
  track(); check();
  return () => {
    stopped = true; clearInterval(interval);
    registration.removeEventListener("updatefound", track);
    container.removeEventListener("controllerchange", changedController);
    for (const name of ["focus", "online", "pageshow"]) options.windowEvents.removeEventListener(name, check);
    options.documentEvents.removeEventListener("visibilitychange", check);
    for (const worker of tracked) worker.removeEventListener("statechange", inspect);
  };
}
