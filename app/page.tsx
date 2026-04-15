"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Volume2, VolumeX, RotateCcw, History, X, Crown, Zap, Trophy } from "lucide-react";
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
  const [roundWinnerIds, setRoundWinnerIds] = useState<string[]>([]);

  const initializedRef = useRef(false);
  const lastHandledSpinRef = useRef("");
  const skipNextPersistRef = useRef(false);

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

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipNextPersistRef.current) { skipNextPersistRef.current = false; return; }
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
    setWinnerHistory((prev) => [{ name: winner.name, timestamp: new Date() }, ...prev.slice(0, 9)]);
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

    const eligibleIds = participants.filter((p) => p.included && p.weight > 0).map((p) => p.id);
    const wonThisRound = roundWinnerIds.filter((id) => eligibleIds.includes(id));
    const allWon = eligibleIds.length > 0 && wonThisRound.length >= eligibleIds.length;
    if (allWon) setRoundWinnerIds([]);
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
    if (data.error) { setIsSpinRequestPending(false); setSpinError(data.error); return; }
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
    <main className="relative min-h-[100dvh] overflow-hidden text-white" style={{ background: "#020208" }}>
      <ParticleBackground />

      {/* ── Atmospheric depth ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 130% 70% at 50% -15%, rgba(0,220,255,0.07) 0%, transparent 60%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 110% at -8% 55%, rgba(100,50,255,0.08) 0%, transparent 55%)" }} />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 70% at 108% 95%, rgba(255,0,100,0.07) 0%, transparent 55%)" }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(0,210,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(0,210,255,0.022) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }} />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-3.5" style={{
        borderBottom: "1px solid rgba(255,255,255,0.045)",
        background: "rgba(2,2,10,0.75)",
        backdropFilter: "blur(28px)",
      }}>
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-2xl" style={{ background: "linear-gradient(135deg,#00F5FF,#7C3AED)", filter: "blur(12px)", opacity: 0.55 }} />
            <div className="relative flex items-center justify-center rounded-2xl" style={{ width: 44, height: 44, background: "linear-gradient(135deg,rgba(0,245,255,0.12),rgba(124,58,237,0.12))", border: "1px solid rgba(0,245,255,0.28)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#00F5FF" strokeWidth="1.5" opacity="0.55" />
                <circle cx="12" cy="12" r="4.5" stroke="#A78BFA" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="1.8" fill="#00F5FF" />
                <line x1="12" y1="2" x2="12" y2="7.5" stroke="#00F5FF" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="16.5" x2="12" y2="22" stroke="#00F5FF" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="12" x2="7.5" y2="12" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
                <line x1="16.5" y1="12" x2="22" y2="12" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] font-black tracking-[0.13em] leading-none text-lg sm:text-xl" style={{
              background: "linear-gradient(90deg,#00F5FF 0%,#A78BFA 45%,#FF006E 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>FORTUNE WHEEL</h1>
            <p className="text-[9px] tracking-[0.4em] mt-0.5 uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>Spin &amp; Win</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => setShowHistory(!showHistory)} title="Winner history"
            className="relative p-2.5 rounded-xl border transition-all duration-300"
            style={showHistory
              ? { background: "rgba(124,58,237,0.2)", border: "1px solid rgba(167,139,250,0.4)", color: "#A78BFA" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
            <History className="w-4 h-4" />
            {winnerHistory.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-0.5 bg-violet-500 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ boxShadow: "0 0 8px rgba(124,58,237,0.9)" }}>
                {winnerHistory.length}
              </span>
            )}
          </button>
          <button onClick={handleReset} title="Reset"
            className="p-2.5 rounded-xl border transition-all duration-300"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
            <RotateCcw className="w-4 h-4" />
          </button>
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl border transition-all duration-300"
            style={soundEnabled
              ? { background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.3)", color: "#67e8f9" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── History panel ── */}
      {showHistory && (
        <div className="fixed right-4 sm:right-8 z-50 rounded-2xl overflow-hidden" style={{
          top: 72,
          width: "min(288px, calc(100vw - 32px))",
          background: "rgba(4,4,14,0.97)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(28px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 className="font-[family-name:var(--font-orbitron)] text-[11px] font-bold tracking-[0.12em] flex items-center gap-2" style={{ color: "rgba(255,255,255,0.55)" }}>
              <Trophy className="w-3.5 h-3.5 text-yellow-400" /> RECENT WINNERS
            </h3>
            <button onClick={() => setShowHistory(false)} className="transition-colors" style={{ color: "rgba(255,255,255,0.2)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {winnerHistory.length === 0 ? (
            <p className="text-center py-7 text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>No spins yet</p>
          ) : (
            <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
              {winnerHistory.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{
                  background: i === 0 ? "rgba(255,215,0,0.07)" : "rgba(255,255,255,0.03)",
                  border: i === 0 ? "1px solid rgba(255,215,0,0.18)" : "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div className="flex items-center gap-2">
                    {i === 0 && <Crown className="w-3 h-3 shrink-0" style={{ color: "#FFD700", filter: "drop-shadow(0 0 4px #FFD700)" }} />}
                    <span className="text-sm font-medium truncate" style={{ color: i === 0 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.55)" }}>{item.name}</span>
                  </div>
                  <span className="text-[11px] shrink-0 ml-2" style={{ color: "rgba(255,255,255,0.22)" }}>
                    {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main layout ── */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 lg:gap-12 xl:gap-20 px-4 sm:px-6 lg:px-10 py-6 sm:py-10 pb-10 min-h-[calc(100dvh-68px)]">

        {/* ── Left: Wheel + Controls ── */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 w-full max-w-[520px] shrink-0">

          {/* Title */}
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.14)" }}>
              <span className={`w-1.5 h-1.5 rounded-full ${isBusy ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
              <span className="text-[10px] tracking-[0.28em] uppercase font-medium" style={{ color: "rgba(0,245,255,0.65)" }}>
                {isBusy ? "Spinning…" : activeCount > 0 ? `${activeCount} players ready` : "Add participants"}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-orbitron)] font-black tracking-wide leading-[1.08]" style={{ fontSize: "clamp(1.6rem,5vw,2.75rem)" }}>
              <span style={{ background: "linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.6) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                SPIN THE{" "}
              </span>
              <span style={{ background: "linear-gradient(90deg,#00F5FF 0%,#A78BFA 50%,#FF006E 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                WHEEL
              </span>
            </h2>
          </div>

          {/* ── Wheel with atmosphere ── */}
          <div className="relative flex items-center justify-center w-full" style={{ minHeight: "min(320px, 90vw)" }}>

            {/* Deep ambient glow */}
            <div className="absolute rounded-full pointer-events-none" style={{
              width: "min(640px, 140vw)", height: "min(640px, 140vw)",
              background: isSpinning
                ? "radial-gradient(circle, rgba(0,245,255,0.14) 0%, rgba(124,58,237,0.08) 38%, transparent 65%)"
                : showWinnerBanner
                ? "radial-gradient(circle, rgba(255,200,0,0.13) 0%, rgba(255,100,0,0.05) 40%, transparent 65%)"
                : "radial-gradient(circle, rgba(0,245,255,0.055) 0%, transparent 55%)",
              transition: "background 1.4s ease",
              transform: "translate(-50%,-50%)", left: "50%", top: "50%",
            }} />

            {/* Spinning conic ring during spin */}
            {isSpinning && (
              <div className="absolute rounded-full pointer-events-none" style={{
                width: "min(556px, 120vw)", height: "min(556px, 120vw)",
                background: "conic-gradient(transparent 0deg, rgba(0,245,255,0.07) 60deg, transparent 120deg, rgba(167,139,250,0.07) 180deg, transparent 240deg, rgba(255,0,110,0.07) 300deg, transparent 360deg)",
                animation: "spin-ring 4s linear infinite",
                transform: "translate(-50%,-50%)", left: "50%", top: "50%",
              }} />
            )}

            {/* Winner gold ring */}
            {showWinnerBanner && lastWinner && !isSpinning && (
              <div className="absolute rounded-full pointer-events-none" style={{
                width: "min(530px, 115vw)", height: "min(530px, 115vw)",
                border: "2px solid rgba(255,215,0,0.25)",
                boxShadow: "0 0 40px rgba(255,200,0,0.18), inset 0 0 40px rgba(255,200,0,0.06)",
                animation: "glow-pulse 2s ease-in-out infinite",
                transform: "translate(-50%,-50%)", left: "50%", top: "50%",
              }} />
            )}

            <SpinningWheel
              participants={participants}
              onSpinComplete={handleSpinComplete}
              isSpinning={isSpinning}
              setIsSpinning={setIsSpinning}
              spinWinnerId={spinWinnerId}
              spinWinnerName={spinWinnerName}
              spinNonce={spinNonce}
            />
          </div>

          {/* ── Winner banner ── */}
          <div className={`w-full transition-all duration-700 ${showWinnerBanner && lastWinner ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95 pointer-events-none"}`}>
            <div className="relative rounded-2xl overflow-hidden" style={{
              background: "linear-gradient(135deg,rgba(255,215,0,0.09),rgba(255,120,0,0.06),rgba(255,215,0,0.09))",
              border: "1px solid rgba(255,215,0,0.24)",
              boxShadow: "0 0 60px rgba(255,180,0,0.14), 0 20px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}>
              {/* Animated gold shimmer */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(90deg,transparent 0%,rgba(255,215,0,0.1) 50%,transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer-gold 2.5s linear infinite",
              }} />
              <div className="relative px-6 py-5 flex items-center justify-center gap-4">
                <Crown className="w-7 h-7 shrink-0" style={{ color: "#FFD700", filter: "drop-shadow(0 0 14px rgba(255,215,0,0.95))" }} />
                <div className="text-center">
                  <p className="text-[9px] tracking-[0.5em] uppercase mb-1.5" style={{ color: "rgba(255,215,0,0.45)" }}>Winner</p>
                  <p className="font-[family-name:var(--font-orbitron)] font-black" style={{
                    fontSize: "clamp(1.6rem,5vw,2.2rem)",
                    background: "linear-gradient(90deg,#FFD700 0%,#FFA500 35%,#FFD700 65%,#FFA500 100%)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    animation: "shimmer-gold 2s linear infinite",
                    filter: "drop-shadow(0 0 24px rgba(255,180,0,0.45))",
                  }}>
                    {lastWinner}
                  </p>
                </div>
                <Crown className="w-7 h-7 shrink-0" style={{ color: "#FFD700", filter: "drop-shadow(0 0 14px rgba(255,215,0,0.95))" }} />
              </div>
              <button onClick={() => setShowWinnerBanner(false)} className="absolute top-2.5 right-2.5 transition-colors" style={{ color: "rgba(255,255,255,0.18)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Spin button ── */}
          <div className="relative w-full" style={{ isolation: "isolate" }}>
            {/* Animated glow border when ready */}
            {!isBusy && activeCount > 0 && (
              <div className="absolute rounded-[18px] pointer-events-none" style={{
                inset: -2,
                background: "linear-gradient(135deg,#00F5FF,#7C3AED,#FF006E,#7C3AED,#00F5FF)",
                backgroundSize: "300% 300%",
                animation: "shimmer-gold 3s linear infinite, btn-glow-pulse 2s ease-in-out infinite",
                filter: "blur(5px)",
                zIndex: -1,
              }} />
            )}
            <button
              onClick={triggerSpin}
              disabled={isBusy || activeCount === 0}
              className="relative w-full overflow-hidden font-[family-name:var(--font-orbitron)] font-black tracking-[0.14em] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed group"
              style={{
                borderRadius: 16,
                padding: "clamp(16px, 4vw, 22px) 24px",
                fontSize: "clamp(15px,2.5vw,18px)",
                background: isBusy
                  ? "linear-gradient(135deg,#0c0c20,#16162e)"
                  : "linear-gradient(135deg,#00F5FF 0%,#7C3AED 45%,#FF006E 100%)",
                boxShadow: !isBusy && activeCount > 0
                  ? "0 8px 36px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.18)"
                  : "0 4px 16px rgba(0,0,0,0.4)",
              }}
            >
              {/* Hover shimmer sweep */}
              {!isBusy && activeCount > 0 && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" style={{
                  background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)",
                }} />
              )}
              <span
                className={`relative flex items-center justify-center gap-3 select-none ${isBusy ? "text-white/25" : "text-white"}`}
                style={{ textShadow: !isBusy && activeCount > 0 ? "0 0 24px rgba(255,255,255,0.45)" : "none" }}
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
                    <Zap className="w-5 h-5 shrink-0" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.7))" }} />
                    SPIN THE WHEEL
                    <Zap className="w-5 h-5 shrink-0" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.7))" }} />
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Status + error */}
          <div className="min-h-[18px] flex items-center justify-center gap-2">
            {spinError ? (
              <span className="text-xs text-rose-300/80">{spinError}</span>
            ) : activeCount === 0 ? (
              <span className="text-xs" style={{ color: "rgba(251,113,133,0.55)" }}>Add at least one participant to get started</span>
            ) : isBusy ? (
              <span className="text-xs tracking-wide animate-pulse" style={{ color: "rgba(0,245,255,0.45)" }}>Selecting winner…</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: "0 0 6px #34d399" }} />
                <span className="text-xs tracking-wide" style={{ color: "rgba(255,255,255,0.22)" }}>
                  {activeCount} participant{activeCount !== 1 ? "s" : ""} ready to spin
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Participant panel ── */}
        <div className="w-full max-w-[500px] lg:max-w-[380px] lg:sticky lg:top-8 shrink-0">
          <div className="relative rounded-3xl overflow-hidden" style={{
            background: "linear-gradient(145deg,rgba(7,7,18,0.88),rgba(11,11,26,0.78))",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(0,245,255,0.035)",
            backdropFilter: "blur(32px)",
          }}>
            {/* Corner glows */}
            <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none" style={{ background: "radial-gradient(circle,rgba(0,245,255,0.06),transparent 70%)" }} />
            <div className="absolute bottom-0 left-0 w-36 h-36 pointer-events-none" style={{ background: "radial-gradient(circle,rgba(124,58,237,0.07),transparent 70%)" }} />
            <ParticipantPanel
              participants={participants}
              setParticipants={setParticipants}
              showAdmin={false}
              setShowAdmin={() => undefined}
              allowAdminControls={false}
            />
          </div>
        </div>
      </div>

      <Confetti active={showConfetti} />

      {/* Bottom vignette */}
      <div className="fixed bottom-0 left-0 right-0 h-24 pointer-events-none" style={{ zIndex: 1, background: "linear-gradient(to top,rgba(2,2,8,0.85),transparent)" }} />
    </main>
  );
}
