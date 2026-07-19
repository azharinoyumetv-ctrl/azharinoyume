self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "Azyume Cut AI", body: "You have a new update." };
  event.waitUntil(self.registration.showNotification(data.title || "Azyume Cut AI", { body: data.body || "", data: { url: data.url || "/en/portal" } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/en/portal"));
});
