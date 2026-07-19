"use client";

import { useState } from "react";

export default function PayoneerApproval({ paymentId }: { paymentId: string }) {
  const [confirmationId, setConfirmationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/payments/${paymentId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationId }),
    });
    const result = await response.json();
    if (response.ok) window.location.reload();
    else setError(result.error || "Could not reconcile payment.");
    setBusy(false);
  }

  return <div className="min-w-48 space-y-2">
    <input value={confirmationId} onChange={(event) => setConfirmationId(event.target.value)} placeholder="Payoneer confirmation ID" className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs" />
    <button disabled={busy || confirmationId.trim().length < 4} onClick={approve} className="w-full rounded-lg border border-green-500/30 px-3 py-2 text-xs text-green-300 disabled:opacity-40">{busy ? "Confirming..." : "Confirm paid"}</button>
    {error && <p className="text-[11px] text-red-300">{error}</p>}
  </div>;
}
