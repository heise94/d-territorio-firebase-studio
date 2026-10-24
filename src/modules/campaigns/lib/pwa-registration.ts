// No trailing slash: /campanas itself is the installed start URL (Next redirects
// its trailing slash). Admin below this prefix is explicitly NetworkOnly.
export const campaignWorkerScope = "/campanas";

export function isLegacyCampaignWorker(registration: ServiceWorkerRegistration, origin: string) {
  const workers = [registration.active, registration.waiting, registration.installing].filter(Boolean) as ServiceWorker[];
  return registration.scope === `${origin}/` && workers.length > 0 &&
    workers.every((worker) => worker.scriptURL === `${origin}/sw.js`);
}

export function identifyCampaignWorker(worker: ServiceWorker, timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (matches: boolean) => {
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(matches);
    };
    const timer = setTimeout(() => finish(false), timeout);
    channel.port1.onmessage = (event) => finish(event.data?.type === "CAMPAIGNS_WORKER_IDENTITY" && event.data?.application === "campanas-exhibidores");
    try { worker.postMessage({ type: "CAMPAIGNS_WORKER_IDENTITY" }, [channel.port2]); }
    catch { finish(false); }
  });
}

export async function migrateLegacyCampaignWorker(
  container: ServiceWorkerContainer,
  origin: string,
  identify = identifyCampaignWorker,
) {
  const legacy = await container.getRegistration(`${origin}/`);
  if (!legacy || !isLegacyCampaignWorker(legacy, origin)) return false;
  // Old releases lack the identity handshake. Updating this exact registration
  // downloads the current worker; only its explicit identity allows removal.
  await legacy.update();
  for (let attempt = 0; attempt < 8; attempt++) {
    if (!isLegacyCampaignWorker(legacy, origin)) return false;
    const worker = legacy.waiting ?? legacy.installing ?? legacy.active;
    if (worker && await identify(worker)) return legacy.unregister();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false; // Unknown workers stay untouched; no global cache deletion.
}

export function waitForActiveCampaignWorker(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const worker = registration.installing ?? registration.waiting;
    const finish = () => {
      if (worker?.state !== "activated") return;
      clearTimeout(timer);
      worker.removeEventListener("statechange", finish);
      resolve();
    };
    const timer = setTimeout(() => {
      worker?.removeEventListener("statechange", finish);
      reject(new Error("La aplicación todavía se está preparando."));
    }, 15000);
    worker?.addEventListener("statechange", finish);
    finish();
  });
}
