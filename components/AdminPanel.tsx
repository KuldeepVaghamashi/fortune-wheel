"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Participant, SpinConfig } from "@/lib/types";

interface AdminPanelProps {
  participants: Participant[];
  config: SpinConfig;
  onSaveConfig: (config: SpinConfig) => Promise<void>;
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
}

export function AdminPanel({
  participants,
  config,
  onSaveConfig,
  onSaveParticipants,
}: AdminPanelProps) {
  const [localParticipants, setLocalParticipants] = useState(participants);
  const [localConfig, setLocalConfig] = useState<SpinConfig>(config);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingParticipants, setSavingParticipants] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const includedCount = localParticipants.filter((p) => !p.isExcluded && p.weight > 0).length;

  const eligible = useMemo(
    () => localParticipants.filter((p) => !p.isExcluded && p.weight > 0),
    [localParticipants],
  );

  useEffect(() => {
    setLocalParticipants(participants);
  }, [participants]);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // When override is active, poll /api/config every 2 s so the UI auto-clears
  // as soon as the spin consumes the preselect.
  useEffect(() => {
    if (localConfig.mode !== "override") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return; // already polling
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/config");
        const json = await res.json();
        const fresh: SpinConfig = json.config ?? { mode: "normal" };
        if (fresh.mode !== "override") {
          setLocalConfig({ mode: "normal" });
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
        }
      } catch { /* ignore */ }
    }, 2000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [localConfig.mode]);

  const preselectedWinner = eligible.find((p) => p._id === localConfig.overrideWinnerId);
  const activePreselected = localConfig.mode === "override" && localConfig.overrideWinnerId
    ? eligible.find((p) => p._id === localConfig.overrideWinnerId)
    : null;

  return (
    <div className="space-y-5 rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#101423]/85 to-[#141025]/75 p-6 backdrop-blur-xl shadow-[0_0_40px_rgba(0,240,255,0.08)]">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <h2 className="text-2xl font-[family-name:var(--font-orbitron)] font-semibold">Admin Override Panel</h2>
        <p className="mt-1 text-sm text-white/65">
          Users can add/remove participants on the main screen. Preselect a winner here for the next spin.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-white/10 px-3 py-1">Total: {localParticipants.length}</span>
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">
            Eligible: {includedCount}
          </span>
          <span
            className={`rounded-full px-3 py-1 ${
              activePreselected
                ? "bg-fuchsia-500/30 text-fuchsia-200"
                : "bg-white/10 text-white/70"
            }`}
          >
            {activePreselected ? `Preselected: ${activePreselected.name}` : "Next spin: Random"}
          </span>
        </div>
      </div>

      {/* Preselect winner */}
      <div className="space-y-3 rounded-xl bg-black/30 p-4 border border-white/10">
        <div>
          <p className="font-semibold text-cyan-200">Preselect Winner for Next Spin</p>
          <p className="mt-1 text-xs text-white/60">
            Pick a participant — they will win the <strong className="text-white/80">next spin only</strong>. The preselect is automatically cleared after that spin. You must set it again for any future override.
          </p>
        </div>

        <div className="grid max-h-60 grid-cols-1 gap-2 overflow-auto rounded-lg border border-white/10 bg-black/20 p-2">
          {/* None / random option */}
          <button
            className={`rounded-md px-3 py-2 text-left text-sm transition ${
              !localConfig.overrideWinnerId
                ? "bg-cyan-500 text-black font-semibold"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            onClick={() => setLocalConfig({ mode: "normal" })}
          >
            No preselection — use random
          </button>

          {eligible.map((p) => (
            <button
              key={p._id}
              className={`rounded-md px-3 py-2 text-left text-sm transition ${
                localConfig.overrideWinnerId === p._id
                  ? "bg-fuchsia-500 text-black font-semibold"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => setLocalConfig({ mode: "override", overrideWinnerId: p._id })}
            >
              <span className="font-medium">{p.name}</span>
              <span className="ml-2 text-xs opacity-70">weight {p.weight.toFixed(1)}</span>
            </button>
          ))}
        </div>

        {preselectedWinner && (
          <p className="text-xs text-fuchsia-300">
            Next spin will be forced to land on <strong>{preselectedWinner.name}</strong>. Resets to random automatically after.
          </p>
        )}

        <button
          className="rounded-md bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
          disabled={savingConfig}
          onClick={async () => {
            setSavingConfig(true);
            await onSaveConfig(localConfig);
            setSavingConfig(false);
          }}
        >
          {savingConfig ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Participant visibility */}
      <div className="space-y-3 rounded-xl bg-black/30 p-4 border border-white/10">
        <p className="font-semibold text-cyan-200">Participant Visibility</p>
        <p className="text-xs text-white/60">
          Hide participants from the user panel and wheel.
        </p>
        <div className="max-h-[320px] space-y-3 overflow-auto pr-1">
          {localParticipants.map((p) => (
            <div key={p._id} className="rounded-lg border border-white/10 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-white/60">w: {p.weight.toFixed(1)}</div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className={`text-xs ${p.isExcluded ? "text-rose-300" : "text-emerald-300"}`}>
                  {p.isExcluded ? "Hidden from users" : "Visible to users"}
                </div>
                <button
                  className="rounded-md bg-white/10 px-3 py-1 text-xs hover:bg-white/20"
                  onClick={() =>
                    setLocalParticipants((prev) =>
                      prev.map((x) => (x._id === p._id ? { ...x, isExcluded: !x.isExcluded } : x)),
                    )
                  }
                >
                  {p.isExcluded ? "Show" : "Hide"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          className="rounded-md bg-emerald-500 px-4 py-2 font-semibold text-black disabled:opacity-50"
          disabled={savingParticipants}
          onClick={async () => {
            setSavingParticipants(true);
            await onSaveParticipants(localParticipants);
            setSavingParticipants(false);
          }}
        >
          {savingParticipants ? "Saving..." : "Save Visibility Changes"}
        </button>
      </div>
    </div>
  );
}
