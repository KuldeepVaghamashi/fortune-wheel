"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminPanel } from "@/components/AdminPanel";
import { ParticleBackground } from "@/components/particle-background";
import type { Participant, SpinConfig } from "@/lib/types";
import { ArrowLeft, Lock, RefreshCw, Shield } from "lucide-react";

export default function AdminPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [config, setConfig] = useState<SpinConfig>({ mode: "normal" });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => setAuthorized(Boolean(data.authorized)))
      .catch(() => {
        setMessage("Failed to verify admin session");
        setMessageType("error");
      });
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
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authorized) return;
    loadAdminData();
  }, [authorized, loadAdminData]);

  // Poll /api/participants every 3 s so the admin sees user-side adds/removes instantly.
  // When IDs are identical the update is skipped to preserve unsaved admin visibility
  // toggles. When anything changed, the server data is used as-is (authoritative).
  useEffect(() => {
    if (!authorized) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/participants");
        const data = await res.json();
        const fresh: Participant[] = data.participants ?? [];
        setParticipants((prev) => {
          const prevKey = prev.map((p) => p._id).join(",");
          const freshKey = fresh.map((p: Participant) => p._id).join(",");
          if (prevKey === freshKey) return prev; // same list — keep unsaved local toggles
          return fresh;                          // list changed — use server truth directly
        });
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(id);
  }, [authorized]);

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoginLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setMessage("Invalid admin password");
        setMessageType("error");
        return;
      }
      setAuthorized(true);
      setMessage("");
    } finally {
      setLoginLoading(false);
    }
  };

  const saveConfig = async (nextConfig: SpinConfig) => {
    const res = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextConfig),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error ?? "Failed to save settings");
      setMessageType("error");
      return;
    }
    const json = await res.json();
    setConfig(json.config);
    setMessage(nextConfig.mode === "override" ? "Preselect saved — active for next spin only" : "Settings saved");
    setMessageType("success");
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
    if (!res.ok) {
      setMessage("Failed to save participants");
      setMessageType("error");
      return;
    }
    const json = await res.json();
    setParticipants(json.participants ?? []);
    setMessage("Participants saved");
    setMessageType("success");
  };

  /* ── Shared atmospheric background ── */
  const Atmosphere = () => (
    <>
      <ParticleBackground />
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 130% 70% at 50% -15%, rgba(0,220,255,0.07) 0%, transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 110% at -8% 55%, rgba(100,50,255,0.08) 0%, transparent 55%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 70% at 108% 95%, rgba(255,0,100,0.07) 0%, transparent 55%)" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(0,210,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,255,0.022) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
      </div>
    </>
  );

  /* ── Login screen ── */
  if (!authorized) {
    return (
      <main className="relative min-h-[100dvh] overflow-hidden text-white flex items-center justify-center p-4" style={{ background: "#020208" }}>
        <Atmosphere />

        <div className="relative z-10 w-full max-w-sm">
          {/* Glow behind card */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124,58,237,0.18) 0%, rgba(0,245,255,0.08) 50%, transparent 100%)",
            filter: "blur(32px)",
            transform: "scale(1.3)",
          }} />

          <div className="relative rounded-3xl p-6 sm:p-8" style={{
            background: "linear-gradient(145deg, rgba(8,8,20,0.92), rgba(12,12,28,0.88))",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(32px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}>
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(135deg,#00F5FF,#7C3AED)", filter: "blur(16px)", opacity: 0.5 }} />
                <div className="relative flex items-center justify-center rounded-2xl" style={{
                  width: 56, height: 56,
                  background: "linear-gradient(135deg,rgba(0,245,255,0.12),rgba(124,58,237,0.12))",
                  border: "1px solid rgba(0,245,255,0.28)",
                }}>
                  <Lock className="w-6 h-6" style={{ color: "#00F5FF" }} />
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="font-[family-name:var(--font-orbitron)] font-black text-xl tracking-wider" style={{
                background: "linear-gradient(90deg,#00F5FF 0%,#A78BFA 50%,#FF006E 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                ADMIN ACCESS
              </h1>
              <p className="mt-1.5 text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
                Enter your admin password to continue
              </p>
            </div>

            {/* Password input */}
            <div className="relative mb-3">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.25)" }} />
              <input
                type="password"
                value={password}
                autoFocus
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,245,255,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,245,255,0.08)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {/* Login button */}
            <button
              onClick={handleLogin}
              disabled={loginLoading || !password.trim()}
              className="relative w-full py-3.5 rounded-xl font-[family-name:var(--font-orbitron)] font-bold text-sm tracking-[0.12em] overflow-hidden transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg,#00F5FF 0%,#7C3AED 50%,#FF006E 100%)",
                boxShadow: "0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              {loginLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  VERIFYING…
                </span>
              ) : "ENTER CONTROL CENTER"}
            </button>

            {message && (
              <p className="mt-3 text-center text-sm" style={{ color: "#fb7185" }}>{message}</p>
            )}

            {/* Back link */}
            <div className="mt-5 text-center">
              <a href="/" className="inline-flex items-center gap-1.5 text-xs transition-colors" style={{ color: "rgba(255,255,255,0.22)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(0,245,255,0.7)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.22)"; }}>
                <ArrowLeft className="w-3 h-3" />
                Back to wheel
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── Authorized view ── */
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden text-white" style={{ background: "#020208" }}>
      <Atmosphere />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-3.5" style={{
        borderBottom: "1px solid rgba(255,255,255,0.045)",
        background: "rgba(2,2,10,0.8)",
        backdropFilter: "blur(28px)",
      }}>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(135deg,#00F5FF,#7C3AED)", filter: "blur(10px)", opacity: 0.5 }} />
            <div className="relative flex items-center justify-center rounded-2xl" style={{
              width: 40, height: 40,
              background: "linear-gradient(135deg,rgba(0,245,255,0.12),rgba(124,58,237,0.12))",
              border: "1px solid rgba(0,245,255,0.28)",
            }}>
              <Shield className="w-4.5 h-4.5" style={{ color: "#00F5FF", width: 18, height: 18 }} />
            </div>
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] font-black tracking-[0.1em] text-base sm:text-lg leading-none" style={{
              background: "linear-gradient(90deg,#00F5FF 0%,#A78BFA 50%,#FF006E 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              CONTROL CENTER
            </h1>
            <p className="text-[9px] tracking-[0.35em] mt-0.5 uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>Admin Panel</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all disabled:opacity-40"
            style={{
              background: "rgba(0,245,255,0.07)",
              border: "1px solid rgba(0,245,255,0.2)",
              color: "rgba(0,245,255,0.8)",
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{loading ? "Loading…" : "Refresh"}</span>
          </button>
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to wheel</span>
          </a>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-12">
        <AdminPanel
          participants={participants}
          config={config}
          onSaveConfig={saveConfig}
          onSaveParticipants={saveParticipants}
        />

        {message && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm font-medium" style={{
            background: messageType === "success" ? "rgba(52,211,153,0.1)" : "rgba(251,113,133,0.1)",
            border: `1px solid ${messageType === "success" ? "rgba(52,211,153,0.25)" : "rgba(251,113,133,0.25)"}`,
            color: messageType === "success" ? "#6ee7b7" : "#fca5a5",
          }}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
