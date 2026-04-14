"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Volume2, VolumeX, RotateCcw, History, Trophy, X, Crown } from "lucide-react";
import { ParticleBackground } from "@/components/particle-background";
import { SpinningWheel } from "@/components/spinning-wheel";
import { ParticipantPanel } from "@/components/participant-panel";
import { Confetti } from "@/components/confetti";
import type { Participant as DbParticipant } from "@/lib/types";

interface Participant {
  id: string;
  name: string;
  weight: number;
  included: boolean;
}

interface WinnerHistory {
  name: string;
  timestamp: Date;
}

interface SpinApiResponse {
  winnerId: string;
  winnerName: string;
  mode: "normal" | "override";
  timestamp: string;
  error?: string;
}

const mapFromDb = (p: DbParticipant): Participant => ({
  id: p._id,
  name: p.name,
  weight: p.weight,
  included: !p.isExcluded,
});

const mapToDb = (p: Participant) => ({
  _id: p.id,
  name: p.name,
  weight: p.weight,
  isExcluded: !p.included,
});

export default function WheelSelectorPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWinner, setLastWinner] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [winnerHistory, setWinnerHistory] = useState<WinnerHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [spinWinnerId, setSpinWinnerId] = useState<string | null>(null);
  const [spinWinnerName, setSpinWinnerName] = useState<string | null>(null);
  const [spinNonce, setSpinNonce] = useState(0);
  const [spinError, setSpinError] = useState("");
  const [isSpinRequestPending, setIsSpinRequestPending] = useState(false);
  const [showWinnerBanner, setShowWinnerBanner] = useState(false);
  // Round-based fairness: tracks who has already won in the current round.
  // Everyone wins once before anyone can win again — prevents repeated winners.
  const [roundWinnerIds, setRoundWinnerIds] = useState<string[]>([]);

  const initializedRef = useRef(false);
  const lastHandledSpinRef = useRef("");
  const skipNextPersistRef = useRef(false);

  // Load participants on mount
  useEffect(() => {
    fetch("/api/participants")
      .then((r) => r.json())
      .then((data) => {
        const mapped = (data.participants ?? []).map(mapFromDb);
        skipNextPersistRef.current = true;
        setParticipants(mapped);
        initializedRef.current = true;
      });
  }, []);

  // Persist participants with debounce
  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    const t = setTimeout(async () => {
      await fetch("/api/participants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: participants.map(mapToDb) }),
      });
    }, 350);
    return () => clearTimeout(t);
  }, [participants]);

  const handleSpinComplete = useCallback((winner: Participant) => {
    setLastWinner(winner.name);
    setShowWinnerBanner(true);
    setShowConfetti(true);
    setIsSpinRequestPending(false);
    setWinnerHistory((prev) => [
      { name: winner.name, timestamp: new Date() },
      ...prev.slice(0, 9),
    ]);
    // Record this winner in the current round
    setRoundWinnerIds((prev) => [...prev, winner.id]);
    setTimeout(() => setShowConfetti(false), 6000);
  }, []);

  const handleReset = async () => {
    const res = await fetch("/api/participants");
    const data = await res.json();
    setParticipants((data.participants ?? []).map(mapFromDb));
    setWinnerHistory([]);
    setLastWinner(null);
    setShowWinnerBanner(false);
    setRoundWinnerIds([]);
  };

  const triggerSpin = async () => {
    if (isSpinning || isSpinRequestPending || activeCount === 0) return;
    setSpinError("");
    setShowWinnerBanner(false);
    setIsSpinRequestPending(true);

    // Round-based fairness: compute which IDs to exclude this spin.
    // Only eligible (included + weight > 0) participants count toward the round.
    const eligibleIds = participants
      .filter((p) => p.included && p.weight > 0)
      .map((p) => p.id);

    const wonThisRound = roundWinnerIds.filter((id) => eligibleIds.includes(id));
    const allWon = eligibleIds.length > 0 && wonThisRound.length >= eligibleIds.length;

    if (allWon) {
      // Everyone has won once — start a fresh round, no exclusions this spin
      setRoundWinnerIds([]);
    }

    const excludeIds = allWon ? [] : wonThisRound;

    const res = await fetch("/api/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participants: participants.map(mapToDb), excludeIds }),
    });
    if (!res.ok) {
      setIsSpinRequestPending(false);
      setSpinError("Spin failed. Check participants and try again.");
      return;
    }
    const data = (await res.json()) as SpinApiResponse;
    if (data.error) {
      setIsSpinRequestPending(false);
      setSpinError(data.error);
      return;
    }
    if (data.timestamp !== lastHandledSpinRef.current) {
      lastHandledSpinRef.current = data.timestamp;
      setSpinWinnerId(data.winnerId);
      setSpinWinnerName(data.winnerName);
      setSpinNonce((n) => n + 1);
    }
  };

  const activeCount = participants.filter((p) => p.included && p.weight > 0).length;
  const isBusy = isSpinning || isSpinRequestPending;

  return (
    <main className="relative min-h-screen bg-[#050508] overflow-hidden text-white">
      <ParticleBackground />

      {/* Background gradient layers */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(0,240,255,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_110%,rgba(123,97,255,0.1),transparent)]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-[radial-gradient(circle,rgba(0,240,255,0.04),transparent)]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(253,121,168,0.05),transparent)]" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] backdrop-blur-sm">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 blur-xl opacity-60" />
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-600/20 border border-cyan-400/30 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#00F0FF" strokeWidth="1.5" />
                <path d="M12 3 L12 21 M3 12 L21 12" stroke="#00F0FF" strokeWidth="1" opacity="0.5" />
                <circle cx="12" cy="12" r="3" fill="#00F0FF" />
                <polygon points="12,3 10,7 14,7" fill="#A29BFE" />
              </svg>
            </div>
          </div>
          <div>
            <h1
              className="font-[family-name:var(--font-orbitron)] text-base sm:text-xl font-black tracking-wider sm:tracking-widest"
              style={{
                background: "linear-gradient(90deg,#00F0FF,#A29BFE,#FD79A8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              FORTUNE WHEEL
            </h1>
            <p className="text-[9px] sm:text-[10px] text-white/30 tracking-[0.2em] sm:tracking-[0.25em] uppercase">Spin &amp; Win</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`relative p-2.5 rounded-xl border transition-all ${
              showHistory
                ? "bg-violet-500/20 text-violet-300 border-violet-400/30"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border-white/10"
            }`}
            title="Winner history"
          >
            <History className="w-4 h-4" />
            {winnerHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full text-[9px] font-bold flex items-center justify-center">
                {winnerHistory.length}
              </span>
            )}
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-400/25"
                : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border-white/10"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── History panel ──────────────────────────────────────────── */}
      {showHistory && (
        <div className="absolute top-[72px] right-6 z-40 w-72 rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-white/70 flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Recent Winners
            </h3>
            <button onClick={() => setShowHistory(false)} className="text-white/30 hover:text-white/70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {winnerHistory.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-4">No spins yet</p>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {winnerHistory.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/[0.07]"
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && <Crown className="w-3 h-3 text-yellow-400" />}
                    <span className="text-sm font-medium text-white/85 truncate">{item.name}</span>
                  </div>
                  <span className="text-white/35 text-[11px] shrink-0 ml-2">
                    {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main layout ────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-14 px-4 sm:px-6 py-6 min-h-[calc(100vh-60px)] sm:min-h-[calc(100vh-72px)]">

        {/* Left: Wheel + controls */}
        <div className="flex flex-col items-center gap-4 sm:gap-5 w-full max-w-[500px] lg:max-w-none">

          {/* Title above wheel */}
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-white/30 tracking-[0.3em] sm:tracking-[0.4em] uppercase mb-1">Ready to spin?</p>
            <h2
              className="font-[family-name:var(--font-orbitron)] text-2xl sm:text-3xl font-black tracking-wide"
              style={{
                background: "linear-gradient(90deg,#00F0FF 0%,#A29BFE 50%,#FD79A8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              SPIN THE WHEEL
            </h2>
          </div>

          {/* Wheel */}
          <SpinningWheel
            participants={participants}
            onSpinComplete={handleSpinComplete}
            isSpinning={isSpinning}
            setIsSpinning={setIsSpinning}
            spinWinnerId={spinWinnerId}
            spinWinnerName={spinWinnerName}
            spinNonce={spinNonce}
          />

          {/* Winner banner */}
          <div
            className={`w-full max-w-[500px] transition-all duration-500 ${
              showWinnerBanner && lastWinner
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3 pointer-events-none"
            }`}
          >
            <div
              className="relative rounded-2xl px-6 py-4 text-center overflow-hidden border border-yellow-400/30"
              style={{
                background: "linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,150,0,0.08))",
                boxShadow: "0 0 30px rgba(255,215,0,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center justify-center gap-3">
                <Crown className="w-5 h-5 text-yellow-400" style={{ filter: "drop-shadow(0 0 6px rgba(255,215,0,0.8))" }} />
                <div>
                  <p className="text-[10px] text-yellow-300/60 tracking-[0.3em] uppercase">Winner</p>
                  <p
                    className="font-[family-name:var(--font-orbitron)] text-2xl font-black"
                    style={{
                      background: "linear-gradient(90deg,#FFD700,#FFA500)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 0 12px rgba(255,215,0,0.4))",
                    }}
                  >
                    {lastWinner}
                  </p>
                </div>
                <Crown className="w-5 h-5 text-yellow-400" style={{ filter: "drop-shadow(0 0 6px rgba(255,215,0,0.8))" }} />
              </div>
              <button
                onClick={() => setShowWinnerBanner(false)}
                className="absolute top-2 right-2 text-white/20 hover:text-white/60 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Spin button */}
          <button
            onClick={triggerSpin}
            disabled={isBusy || activeCount === 0}
            className="relative group w-full overflow-hidden rounded-2xl font-[family-name:var(--font-orbitron)] text-base sm:text-lg font-black py-4 sm:py-5 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isBusy
                ? "linear-gradient(135deg,#111122,#1a1a30)"
                : "linear-gradient(135deg,#00F0FF 0%,#7B61FF 50%,#FD79A8 100%)",
              boxShadow:
                !isBusy && activeCount > 0
                  ? "0 0 35px rgba(0,240,255,0.35), 0 0 70px rgba(123,97,255,0.18), 0 8px 32px rgba(0,0,0,0.4)"
                  : "none",
              transform: !isBusy && activeCount > 0 ? undefined : undefined,
            }}
          >
            {/* Shimmer sweep */}
            {!isBusy && activeCount > 0 && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}

            <span
              className={`relative flex items-center justify-center gap-3 ${
                isBusy ? "text-white/50" : "text-black"
              }`}
            >
              {isBusy ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  SPINNING…
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a10 10 0 1 0 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M22 2l-4 4 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  SPIN THE WHEEL
                </>
              )}
            </span>
          </button>

          {/* Status line */}
          <div className="text-sm min-h-[20px] flex items-center gap-2">
            {activeCount === 0 ? (
              <span className="text-rose-400/70 text-xs">Add at least one participant</span>
            ) : isBusy ? (
              <span className="text-cyan-400/70 text-xs animate-pulse">Selecting winner…</span>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white/35 text-xs">
                  {activeCount} participant{activeCount !== 1 ? "s" : ""} ready
                </span>
              </>
            )}
          </div>

          {spinError && (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/8 px-4 py-2 text-sm text-rose-300 text-center max-w-sm">
              {spinError}
            </div>
          )}
        </div>

        {/* Right: Participant panel */}
        <div
          className="w-full max-w-[500px] lg:max-w-sm lg:w-auto rounded-3xl p-1"
          style={{
            background: "linear-gradient(135deg,rgba(16,16,26,0.75),rgba(22,22,36,0.55))",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
            backdropFilter: "blur(24px)",
          }}
        >
          <ParticipantPanel
            participants={participants}
            setParticipants={setParticipants}
            showAdmin={false}
            setShowAdmin={() => undefined}
            allowAdminControls={false}
          />
        </div>
      </div>

      <Confetti active={showConfetti} />

      {/* Bottom fade */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-[1]" />
    </main>
  );
}
