"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import type { Participant, SpinConfig } from "@/lib/types";

export default function AdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [config, setConfig] = useState<SpinConfig>({ mode: "normal" });
  const [message, setMessage] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => setAuthorized(Boolean(data.authorized)))
      .catch(() => setMessage("Failed to verify admin session"));
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/participants"),
        fetch("/api/config"),
      ]);
      const pJson = await pRes.json();
      const cJson = await cRes.json();
      setParticipants(pJson.participants ?? []);
      setConfig(cJson.config ?? { mode: "normal" });
      setMessage("");
    } catch {
      setMessage("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once when authorized — no polling
  useEffect(() => {
    if (!authorized) return;
    loadAdminData();
  }, [authorized, loadAdminData]);

  const saveConfig = async (nextConfig: SpinConfig) => {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return setMessage(json.error ?? "Failed to save settings");
    }
    const json = await res.json();
    setConfig(json.config);
    setMessage(nextConfig.mode === "override" ? "Preselect saved — active for next spin only" : "Settings saved");
  };

  const saveParticipants = async (nextParticipants: Participant[]) => {
    const res = await fetch("/api/participants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participants: nextParticipants.map((p) => ({
          _id: p._id,
          name: p.name,
          weight: p.weight,
          isExcluded: p.isExcluded,
        })),
      }),
    });
    if (!res.ok) return setMessage("Failed to save participants");
    const json = await res.json();
    setParticipants(json.participants ?? []);
    setMessage("Participants saved");
  };

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#050508] px-4 py-8 text-white flex items-center justify-center">
        <div className="w-full mx-auto max-w-md rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#101423]/80 to-[#141025]/70 p-5 sm:p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(0,240,255,0.08)]">
          <h1 className="mb-1 text-2xl font-[family-name:var(--font-orbitron)] font-bold">Admin Access</h1>
          <p className="mb-4 text-sm text-white/60">Secure control room for override mode</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key !== "Enter") return;
              const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              if (!res.ok) { setMessage("Invalid admin password"); return; }
              setAuthorized(true);
              setMessage("");
            }}
            placeholder="Enter admin password"
            className="mb-3 w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-cyan-400/50"
          />
          <button
            onClick={async () => {
              const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              if (!res.ok) { setMessage("Invalid admin password"); return; }
              setAuthorized(true);
              setMessage("");
            }}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-2 font-bold text-black"
          >
            Login
          </button>
          {message && <p className="mt-3 text-sm text-rose-300">{message}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050508] px-4 py-6 sm:py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-orbitron)] font-bold">Control Center</h1>
            <p className="text-sm text-white/60">Manage participants and override spin outcomes</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Refresh button — pull latest participants from DB */}
            <button
              onClick={loadAdminData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50 transition-all"
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
              </svg>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <a
              href="/"
              className="rounded-xl border border-white/20 px-3 py-2 text-sm text-cyan-300 hover:bg-white/5"
            >
              ← Back to wheel
            </a>
          </div>
        </div>

        <AdminPanel
          participants={participants}
          config={config}
          onSaveConfig={saveConfig}
          onSaveParticipants={saveParticipants}
        />

        {message && (
          <p className={`mt-4 text-sm ${message.includes("saved") ? "text-emerald-400" : "text-rose-300"}`}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
