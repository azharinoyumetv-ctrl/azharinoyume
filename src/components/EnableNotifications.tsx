"use client";
import { useState } from "react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4); const data = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...data].map((character) => character.charCodeAt(0)));
}

export default function EnableNotifications() {
  const [message, setMessage] = useState("");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return null;
  async function enable() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(key!) });
      const response = await fetch("/api/v1/push-subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error("Could not save notification subscription");
      setMessage("Notifications enabled");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not enable notifications"); }
  }
  return <div><button onClick={enable} className="px-4 py-2 glass border border-white/10 rounded-xl text-sm">Enable alerts</button>{message && <span className="ml-3 text-xs text-muted-foreground">{message}</span>}</div>;
}
