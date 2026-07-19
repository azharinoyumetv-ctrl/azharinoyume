"use client";
import { useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4); const data = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...data].map((character) => character.charCodeAt(0)));
}

export default function EnableNotifications() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return <p className="text-xs leading-5 text-white/35">Project alerts will appear here when push delivery is configured.</p>;
  async function enable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(key!) });
      const response = await fetch("/api/v1/push-subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error("Could not save notification subscription");
      setMessage("Notifications enabled");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not enable notifications"); }
    finally { setBusy(false); }
  }
  return <div><button disabled={busy || message === "Notifications enabled"} onClick={enable} className="dashboard-action w-full justify-between disabled:opacity-60">{message === "Notifications enabled" ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Bell className="h-4 w-4 text-violet-300" />}<span>{busy ? "Enabling…" : message === "Notifications enabled" ? "Alerts enabled" : "Enable project alerts"}</span></button>{message && message !== "Notifications enabled" && <p className="mt-2 text-xs leading-5 text-rose-300">{message}</p>}</div>;
}
