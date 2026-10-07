"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) window.location.href = "/";
    else setError((await res.json()).error ?? "Login failed");
  }

  return (
    <div className="modal-backdrop" style={{ background: "var(--bg)" }}>
      <form className="panel modal" onSubmit={submit}>
        <h1 style={{ marginBottom: 12 }}>CalendarGenie</h1>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="submit" disabled={busy || !password}>
            {busy ? "Checking…" : "Log in"}
          </button>
        </div>
      </form>
    </div>
  );
}
