"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, EyeOff, Save, Shuffle, Target, Users } from "lucide-react";
import type { Participant, SpinConfig } from "@/lib/types";

interface AdminPanelProps {
  participants: Participant[];
  config: SpinConfig;
  onSaveConfig: (config: SpinConfig) => Promise<void>;
  onSaveParticipants: (participants: Participant[]) => Promise<void>;
}

const AVATAR_COLORS = [
  "from-cyan-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-purple-600",
];

function Avatar({ name, index }: { name: string; index: number }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.35)" }}>
      <span className="text-xs font-bold text-white select-none">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
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

  useEffect(() => { setLocalParticipants(participants); }, [participants]);
  useEffect(() => { setLocalConfig(config); }, [config]);

  // Poll /api/config every 2 s when override is active so the badge auto-clears after spin
  useEffect(() => {
    if (localConfig.mode !== "override") {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
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

  const activePreselected = localConfig.mode === "override" && localConfig.overrideWinnerId
    ? eligible.find((p) => p._id === localConfig.overrideWinnerId)
    : null;

  const preselectedWinner = eligible.find((p) => p._id === localConfig.overrideWinnerId);

  /* ── Shared card style ── */
  const cardStyle = {
    background: "linear-gradient(145deg, rgba(8,8,22,0.88), rgba(14,14,30,0.82))",
    border: "1px solid rgba(255,255,255,0.07)",
    backdropFilter: "blur(24px)",
    boxShadow: "0 16px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
  };

  /* ── Gradient button ── */
  const GradientButton = ({
    onClick,
    disabled,
    children,
    icon,
  }: {
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
    icon?: React.ReactNode;
  }) => (
    <div className="relative" style={{ isolation: "isolate" }}>
      {!disabled && (
        <div className="absolute rounded-xl pointer-events-none" style={{
          inset: -1.5,
          background: "linear-gradient(135deg,#00F5FF,#7C3AED,#FF006E)",
          filter: "blur(4px)",
          opacity: 0.55,
          zIndex: -1,
        }} />
      )}
      <button
        onClick={onClick}
        disabled={disabled}
        className="relative w-full flex items-center justify-center gap-2 py-3 rounded-xl font-[family-name:var(--font-orbitron)] font-bold text-sm tracking-[0.1em] transition-all disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden group"
        style={{
          background: disabled
            ? "rgba(255,255,255,0.04)"
            : "linear-gradient(135deg,rgba(0,245,255,0.15) 0%,rgba(124,58,237,0.2) 50%,rgba(255,0,110,0.15) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: disabled ? "rgba(255,255,255,0.25)" : "white",
        }}
      >
        {!disabled && (
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" style={{
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)",
          }} />
        )}
        {icon}
        {children}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Status overview ── */}
      <div className="rounded-2xl p-4 sm:p-5" style={cardStyle}>
        <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(135deg,#00F5FF,#7C3AED)", filter: "blur(10px)", opacity: 0.4 }} />
            <div className="relative flex items-center justify-center rounded-xl" style={{
              width: 42, height: 42,
              background: "linear-gradient(135deg,rgba(0,245,255,0.12),rgba(124,58,237,0.12))",
              border: "1px solid rgba(0,245,255,0.25)",
            }}>
              <Target className="w-5 h-5" style={{ color: "#00F5FF" }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-[family-name:var(--font-orbitron)] font-bold text-base sm:text-lg text-white leading-tight">
              Override Panel
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
              Users manage participants on the main screen
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)",
          }}>
            <Users className="w-3 h-3" />
            {localParticipants.length} total
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{
            background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#6ee7b7",
          }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {includedCount} eligible
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${activePreselected ? "border" : ""}`} style={
            activePreselected
              ? { background: "rgba(217,70,239,0.15)", borderColor: "rgba(217,70,239,0.35)", color: "#e879f9" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
          }>
            {activePreselected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                {activePreselected.name}
              </>
            ) : (
              <>
                <Shuffle className="w-3 h-3" />
                Random
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── Preselect winner ── */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {/* Section header */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-[family-name:var(--font-orbitron)] font-bold text-sm tracking-wide text-white">
            Preselect Winner
          </h3>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Forces the next spin to land on this person. Automatically resets after one spin.
          </p>
        </div>

        {/* Participant list */}
        <div className="p-3 space-y-1.5 overflow-y-auto" style={{ maxHeight: 280 }}>
          {/* Random option */}
          <button
            onClick={() => setLocalConfig({ mode: "normal" })}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
            style={!localConfig.overrideWinnerId
              ? { background: "rgba(0,245,255,0.12)", border: "1px solid rgba(0,245,255,0.3)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
            }
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0" style={{
              background: !localConfig.overrideWinnerId
                ? "linear-gradient(135deg,rgba(0,245,255,0.3),rgba(0,245,255,0.1))"
                : "rgba(255,255,255,0.06)",
            }}>
              <Shuffle className="w-4 h-4" style={{ color: !localConfig.overrideWinnerId ? "#00F5FF" : "rgba(255,255,255,0.4)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${!localConfig.overrideWinnerId ? "text-cyan-300" : "text-white/60"}`}>
                Random Selection
              </p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>No override — fair draw</p>
            </div>
            {!localConfig.overrideWinnerId && (
              <Check className="w-4 h-4 shrink-0 text-cyan-400" />
            )}
          </button>

          {/* Divider */}
          {eligible.length > 0 && (
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
              <span className="text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>or pick a winner</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>
          )}

          {eligible.map((p, i) => {
            const isSelected = localConfig.overrideWinnerId === p._id;
            return (
              <button
                key={p._id}
                onClick={() => setLocalConfig({ mode: "override", overrideWinnerId: p._id })}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all"
                style={isSelected
                  ? { background: "rgba(217,70,239,0.14)", border: "1px solid rgba(217,70,239,0.35)" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
                }
              >
                <Avatar name={p.name} index={i} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isSelected ? "text-fuchsia-300" : "text-white/80"}`}>
                    {p.name}
                  </p>
                  <p className="text-[11px]" style={{ color: isSelected ? "rgba(217,70,239,0.6)" : "rgba(255,255,255,0.28)" }}>
                    weight {p.weight.toFixed(1)}
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 shrink-0 text-fuchsia-400" />}
              </button>
            );
          })}

          {eligible.length === 0 && (
            <p className="text-center py-6 text-sm" style={{ color: "rgba(255,255,255,0.22)" }}>
              No eligible participants yet
            </p>
          )}
        </div>

        {preselectedWinner && (
          <div className="mx-3 mb-3 px-3 py-2 rounded-xl text-xs" style={{
            background: "rgba(217,70,239,0.08)",
            border: "1px solid rgba(217,70,239,0.2)",
            color: "rgba(217,70,239,0.9)",
          }}>
            Next spin will be forced to land on <strong className="text-fuchsia-300">{preselectedWinner.name}</strong>. Resets automatically after.
          </div>
        )}

        {/* Save button */}
        <div className="p-3 pt-0">
          <GradientButton
            onClick={async () => {
              setSavingConfig(true);
              await onSaveConfig(localConfig);
              setSavingConfig(false);
            }}
            disabled={savingConfig}
            icon={savingConfig
              ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <Save className="w-4 h-4" />}
          >
            {savingConfig ? "Saving…" : "Save Override"}
          </GradientButton>
        </div>
      </div>

      {/* ── Participant visibility ── */}
      <div className="rounded-2xl overflow-hidden" style={cardStyle}>
        {/* Section header */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <h3 className="font-[family-name:var(--font-orbitron)] font-bold text-sm tracking-wide text-white">
            Participant Visibility
          </h3>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            Hidden participants are removed from the wheel and user panel.
          </p>
        </div>

        {/* List */}
        <div className="overflow-y-auto divide-y" style={{ maxHeight: 340, borderColor: "rgba(255,255,255,0.05)" }}>
          {localParticipants.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: "rgba(255,255,255,0.22)" }}>
              No participants yet
            </p>
          )}
          {localParticipants.map((p, i) => (
            <div key={p._id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <Avatar name={p.name} index={i} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${p.isExcluded ? "text-white/35" : "text-white/85"}`}>
                  {p.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.isExcluded ? "bg-rose-500" : "bg-emerald-400"}`} />
                  <span className="text-[11px]" style={{ color: p.isExcluded ? "rgba(248,113,113,0.7)" : "rgba(110,231,183,0.7)" }}>
                    {p.isExcluded ? "Hidden" : "Visible"} · w {p.weight.toFixed(1)}
                  </span>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalParticipants((prev) =>
                    prev.map((x) => (x._id === p._id ? { ...x, isExcluded: !x.isExcluded } : x))
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0"
                style={p.isExcluded
                  ? { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#6ee7b7" }
                  : { background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.2)", color: "#fca5a5" }
                }
              >
                {p.isExcluded
                  ? <><Eye className="w-3.5 h-3.5" /><span className="hidden sm:inline">Show</span></>
                  : <><EyeOff className="w-3.5 h-3.5" /><span className="hidden sm:inline">Hide</span></>
                }
              </button>
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="p-3">
          <GradientButton
            onClick={async () => {
              setSavingParticipants(true);
              await onSaveParticipants(localParticipants);
              setSavingParticipants(false);
            }}
            disabled={savingParticipants || localParticipants.length === 0}
            icon={savingParticipants
              ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              : <Save className="w-4 h-4" />}
          >
            {savingParticipants ? "Saving…" : "Save Visibility"}
          </GradientButton>
        </div>
      </div>

    </div>
  );
}
