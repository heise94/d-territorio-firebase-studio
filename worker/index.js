import { initializeApp, getApps } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { safeNotificationRoute } from "../src/modules/campaigns/domain/notification";

// This module is imported by next-pwa's generated worker, not a second registration.
self.addEventListener("message", (event) => {
  if (event.data?.type === "CAMPAIGNS_LOGOUT")
    event.waitUntil(
      (async () => {
        for (const name of await caches.keys()) {
          const cache = await caches.open(name);
          for (const request of await cache.keys()) {
            const path = new URL(request.url).pathname;
            if (
              path === "/campanas" ||
              path.startsWith("/campanas/") ||
              path.startsWith("/api/campanas/")
            )
              await cache.delete(request);
          }
        }
        for (const notification of await self.registration.getNotifications()) {
          if (notification.tag.startsWith("campanas:")) notification.close();
        }
        for (const client of await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        })) {
          if (new URL(client.url).pathname.startsWith("/campanas"))
            client.postMessage({ type: "CAMPAIGNS_SESSION_CLEARED" });
        }
      })(),
    );
});
async function ownEvent(id) {
  if (!/^[a-f0-9]{64}$/.test(id ?? "")) return null;
  try {
    const response = await fetch(
      "/api/campanas/participant/notifications/push-event?id=" + id,
      { credentials: "same-origin", cache: "no-store" },
    );
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
self.addEventListener("notificationclick", (event) => {
  if (!event.notification.tag.startsWith("campanas:")) return;
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    (async () => {
      const current = await ownEvent(event.notification.data?.eventId);
      const route = safeNotificationRoute(current?.targetRoute);
      const url = new URL(route, self.location.origin).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) =>
          new URL(client.url).origin === self.location.origin &&
          new URL(client.url).pathname.startsWith("/campanas"),
      );
      if (existing) {
        await existing.navigate(url);
        await existing.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
if (
  Object.values(config).every(
    (value) => typeof value === "string" && value.length,
  )
) {
  try {
    const app = getApps()[0] ?? initializeApp(config);
    onBackgroundMessage(getMessaging(app), async (payload) => {
      const data = payload.data ?? {},
        current = await ownEvent(data.eventId);
      if (!current) return; // Cookie ownership is checked again after logout/login.
      await self.registration.showNotification("D-Territorio Campañas", {
        body:
          current.type === "turn_reminder"
            ? "Tienes un turno próximo. Revisa la aplicación."
            : "Tienes un aviso nuevo. Revisa la aplicación.",
        icon: "/campanas-icon-192.png",
        badge: "/campanas-icon-192.png",
        tag: "campanas:" + data.eventId,
        data: { eventId: data.eventId },
      });
    });
  } catch {
    /* Internal history remains available if this environment has no FCM. */
  }
}
