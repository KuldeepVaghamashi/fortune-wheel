"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface Participant {
  id: string;
  name: string;
  weight: number;
  included: boolean;
}

interface SpinningWheelProps {
  participants: Participant[];
  onSpinComplete: (winner: Participant) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  spinWinnerId: string | null;
  spinWinnerName?: string | null;
  spinNonce: number;
}

const SEGMENT_COLORS = [
  { from: "#FF3CAC", to: "#784BA0", glow: "#FF3CAC" },
  { from: "#21D4FD", to: "#B721FF", glow: "#21D4FD" },
  { from: "#00F0FF", to: "#0066FF", glow: "#00F0FF" },
  { from: "#FEE140", to: "#FA709A", glow: "#FEE140" },
  { from: "#43E97B", to: "#38F9D7", glow: "#43E97B" },
  { from: "#F953C6", to: "#B91D73", glow: "#F953C6" },
  { from: "#4FACFE", to: "#00F2FE", glow: "#4FACFE" },
  { from: "#FA8231", to: "#FF4757", glow: "#FA8231" },
  { from: "#A18CD1", to: "#FBC2EB", glow: "#A18CD1" },
  { from: "#96FBC4", to: "#F9F586", glow: "#96FBC4" },
];

export function SpinningWheel({
  participants,
  onSpinComplete,
  isSpinning,
  setIsSpinning,
  spinWinnerId,
  spinWinnerName,
  spinNonce,
}: SpinningWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowCanvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [showWinner, setShowWinner] = useState(false);
  const [winnerSegIdx, setWinnerSegIdx] = useState(-1);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const glowAnimationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const rotationRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cssScale, setCssScale] = useState(1);

  const activeParticipants = participants.filter((p) => p.included && p.weight > 0);
  const totalWeight = activeParticipants.reduce((sum, p) => sum + p.weight, 0);

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

  // Animated glow ring behind wheel
  useEffect(() => {
    const canvas = glowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 40;

    const isMobile = window.innerWidth < 768;

    // On mobile: skip the glow canvas entirely when not spinning — saves a full RAF loop
    // On mobile during spin: draw only a single lightweight pulsing ring
    // On desktop: full orbiting orbs + 3 rings + center pulse
    let lastFrameTime = 0;
    const targetInterval = isMobile ? 66 : 16; // ~15fps mobile, ~60fps desktop

    const animate = (timestamp: number) => {
      glowAnimationRef.current = requestAnimationFrame(animate);

      if (timestamp - lastFrameTime < targetInterval) return;
      lastFrameTime = timestamp;

      timeRef.current += 0.018;
      ctx.clearRect(0, 0, size, size);

      if (isMobile) {
        // ── Mobile: single simple ring + center pulse during spin ──
        const rr = r + 22;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = "#00F0FF";
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = (isSpinning ? 0.55 : 0.18) * (0.7 + Math.sin(timeRef.current * 2) * 0.3);
        ctx.setLineDash([16, 8]);
        ctx.lineDashOffset = timeRef.current * 45;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        if (isSpinning) {
          const ps = r * 0.35 + Math.sin(timeRef.current * 3.5) * 12;
          const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, ps);
          cg.addColorStop(0, "rgba(0,240,255,0.2)");
          cg.addColorStop(1, "transparent");
          ctx.beginPath();
          ctx.arc(cx, cy, ps, 0, Math.PI * 2);
          ctx.fillStyle = cg;
          ctx.fill();
        }
        return;
      }

      // ── Desktop: full animation ──

      // Rotating dashed rings
      for (let i = 0; i < 3; i++) {
        const rr = r + 22 + i * 9;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = i === 0 ? "#00F0FF" : i === 1 ? "#A29BFE" : "#FD79A8";
        ctx.lineWidth = 1.5 - i * 0.3;
        ctx.globalAlpha = (0.35 - i * 0.08) * (isSpinning ? 1.4 : 0.6);
        ctx.setLineDash([16, 8]);
        ctx.lineDashOffset = timeRef.current * (i % 2 === 0 ? 45 : -45);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;

      // Orbiting glowing orbs
      const orbCount = 8;
      for (let i = 0; i < orbCount; i++) {
        const angle = (i / orbCount) * Math.PI * 2 + timeRef.current * (isSpinning ? 2.5 : 0.4);
        const orbR = r + 42;
        const ox = cx + Math.cos(angle) * orbR;
        const oy = cy + Math.sin(angle) * orbR;
        const os = 3 + Math.sin(timeRef.current * 2 + i) * 1.5;
        const orbColors = ["#00F0FF", "#A29BFE", "#FD79A8", "#55EFC4", "#FDCB6E"];
        const color = orbColors[i % orbColors.length];

        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, os * 5);
        g.addColorStop(0, color);
        g.addColorStop(0.4, color + "66");
        g.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(ox, oy, os * 5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.globalAlpha = isSpinning ? 0.7 : 0.3;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ox, oy, os, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 0.85;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Center pulse glow during spin
      if (isSpinning) {
        const ps = r * 0.35 + Math.sin(timeRef.current * 3.5) * 18;
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, ps);
        cg.addColorStop(0, "rgba(0,240,255,0.25)");
        cg.addColorStop(0.6, "rgba(160,130,255,0.08)");
        cg.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(cx, cy, ps, 0, Math.PI * 2);
        ctx.fillStyle = cg;
        ctx.fill();
      }
    };

    glowAnimationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(glowAnimationRef.current);
  }, [isSpinning]);

  const drawWheel = useCallback(
    (ctx: CanvasRenderingContext2D, size: number, currentRotation: number, winnerIdx: number) => {
      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 40;

      ctx.clearRect(0, 0, size, size);

      if (activeParticipants.length === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15,15,25,0.9)";
        ctx.fill();
        ctx.font = "bold 18px var(--font-orbitron), sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Add participants", cx, cy);
        return;
      }

      // ── Rotated segment group ──────────────────────────────────────
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((currentRotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);

      let startAngle = 0;
      const segmentData: { start: number; end: number }[] = [];

      activeParticipants.forEach((participant, index) => {
        const segAngle = (participant.weight / totalWeight) * Math.PI * 2;
        const endAngle = startAngle + segAngle;
        const midAngle = startAngle + segAngle / 2;
        const colorIdx = index % SEGMENT_COLORS.length;
        const colors = SEGMENT_COLORS[colorIdx];

        segmentData.push({ start: startAngle, end: endAngle });

        // Segment gradient
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
        grad.addColorStop(0, colors.from + "CC");
        grad.addColorStop(0.55, colors.from);
        grad.addColorStop(0.88, colors.to);
        grad.addColorStop(1, colors.to + "BB");

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Inner shimmer
        const shimmer = ctx.createRadialGradient(
          cx + Math.cos(midAngle) * radius * 0.28,
          cy + Math.sin(midAngle) * radius * 0.28,
          0,
          cx + Math.cos(midAngle) * radius * 0.28,
          cy + Math.sin(midAngle) * radius * 0.28,
          radius * 0.45
        );
        shimmer.addColorStop(0, "rgba(255,255,255,0.18)");
        shimmer.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = shimmer;
        ctx.fill();

        // Divider lines
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(startAngle) * radius, cy + Math.sin(startAngle) * radius);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Text
        const textR = radius * 0.62;
        const tx = cx + Math.cos(midAngle) * textR;
        const ty = cy + Math.sin(midAngle) * textR;

        ctx.save();
        ctx.translate(tx, ty);
        if (midAngle > Math.PI / 2 && midAngle < (3 * Math.PI) / 2) {
          ctx.rotate(midAngle - Math.PI / 2);
        } else {
          ctx.rotate(midAngle + Math.PI / 2);
        }

        const fontSize = Math.min(46, Math.max(14, (segAngle * radius) / 6.5));
        ctx.font = `bold ${fontSize}px var(--font-orbitron), sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxW = radius * 0.74;
        let name = participant.name;
        if (ctx.measureText(name).width > maxW) {
          while (ctx.measureText(name + "…").width > maxW && name.length > 0) {
            name = name.slice(0, -1);
          }
          name += "…";
        }

        ctx.shadowColor = "rgba(0,0,0,0.95)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(name, 0, 0);
        ctx.restore();

        startAngle = endAngle;
      });

      // Winner segment gold highlight
      if (winnerIdx >= 0 && winnerIdx < segmentData.length) {
        const { start: ws, end: we } = segmentData[winnerIdx];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, ws, we);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 215, 0, 0.28)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, radius - 4, ws, we);
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 5;
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 22;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      // ── End rotated group ─────────────────────────────────────────

      // Outer chrome ring
      const ringGrad = ctx.createLinearGradient(0, 0, size, size);
      ringGrad.addColorStop(0, "#16162a");
      ringGrad.addColorStop(0.3, "#2a2a45");
      ringGrad.addColorStop(0.5, "#3a3a60");
      ringGrad.addColorStop(0.7, "#2a2a45");
      ringGrad.addColorStop(1, "#16162a");
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 9, 0, Math.PI * 2);
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 14;
      ctx.stroke();

      // Metallic highlight arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 7, -Math.PI * 0.25, Math.PI * 0.15);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer neon ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 17, 0, Math.PI * 2);
      ctx.strokeStyle = isSpinning ? "rgba(0,240,255,0.9)" : "rgba(0,240,255,0.45)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00F0FF";
      ctx.shadowBlur = isSpinning ? 30 : 18;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center hub
      const hubR = radius * 0.17;
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 2, hubR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      const hubGrad = ctx.createRadialGradient(cx - hubR * 0.3, cy - hubR * 0.3, 0, cx, cy, hubR);
      hubGrad.addColorStop(0, "#2e2e48");
      hubGrad.addColorStop(0.4, "#1e1e38");
      hubGrad.addColorStop(1, "#0a0a18");
      ctx.beginPath();
      ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,240,255,0.7)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00F0FF";
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(cx, cy, hubR * 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(160,130,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubR * 0.18);
      dotGrad.addColorStop(0, "#fff");
      dotGrad.addColorStop(0.5, "#00F0FF");
      dotGrad.addColorStop(1, "#0060FF");
      ctx.beginPath();
      ctx.arc(cx, cy, hubR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = dotGrad;
      ctx.shadowColor = "#00F0FF";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── Pointer — drawn in canvas coordinates, fixed at 12 o'clock (270°) ──
      // Tip lands exactly at the top edge of the colored segments.
      // Because both pointer and segments share the same canvas coordinate
      // system, there is zero CSS-pixel alignment error.
      const ptrTipX = cx;
      const ptrTipY = cy - radius - 2;   // tip just outside the segment edge
      const ptrBaseY = ptrTipY - 26;     // base 26 px above tip
      const ptrHW = 14;                  // half-width at base

      // Drop shadow
      ctx.beginPath();
      ctx.moveTo(ptrTipX + 2, ptrTipY + 2);
      ctx.lineTo(ptrTipX - ptrHW + 2, ptrBaseY + 2);
      ctx.lineTo(ptrTipX + ptrHW + 2, ptrBaseY + 2);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      // Gradient triangle (white → cyan → purple)
      const ptrGrad = ctx.createLinearGradient(ptrTipX, ptrBaseY, ptrTipX, ptrTipY);
      ptrGrad.addColorStop(0, "#ffffff");
      ptrGrad.addColorStop(0.5, "#00F0FF");
      ptrGrad.addColorStop(1, "#7B61FF");

      ctx.beginPath();
      ctx.moveTo(ptrTipX, ptrTipY);
      ctx.lineTo(ptrTipX - ptrHW, ptrBaseY);
      ctx.lineTo(ptrTipX + ptrHW, ptrBaseY);
      ctx.closePath();
      ctx.fillStyle = ptrGrad;
      ctx.shadowColor = "#00F0FF";
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Accent bar at base
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(ptrTipX - ptrHW - 2, ptrBaseY - 5, (ptrHW + 2) * 2, 5);
    },
    [activeParticipants, totalWeight, isSpinning]
  );

  // Redraw wheel whenever rotation or winner changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawWheel(ctx, canvas.width, rotation, showWinner ? winnerSegIdx : -1);
  }, [drawWheel, rotation, activeParticipants, showWinner, winnerSegIdx]);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  // Scale the 500px wheel down on small screens
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setCssScale(Math.min(1, entry.contentRect.width / 500));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spinToWinner = useCallback(
    (winnerId: string) => {
      if (isSpinning || activeParticipants.length === 0) return;

      setIsSpinning(true);
      setShowWinner(false);
      setWinnerSegIdx(-1);
      startTimeRef.current = Date.now();

      // Always start from a clean [0, 360) value
      const startRot = ((rotationRef.current % 360) + 360) % 360;

      let winnerIndex = activeParticipants.findIndex((p) => p.id === winnerId);
      if (winnerIndex < 0 && spinWinnerName) {
        winnerIndex = activeParticipants.findIndex((p) => p.name === spinWinnerName);
      }
      if (winnerIndex < 0) { setIsSpinning(false); return; }

      // Midpoint of winner's segment in degrees from 0° (right), going clockwise
      let winnerMiddle = 0;
      for (let i = 0; i < winnerIndex; i++) {
        winnerMiddle += (activeParticipants[i].weight / totalWeight) * 360;
      }
      winnerMiddle += (activeParticipants[winnerIndex].weight / totalWeight) * 360 / 2;

      // Pointer sits at 270° (12 o'clock, top of wheel).
      // After rotation R: segment middle appears at (winnerMiddle + R) mod 360.
      // We need (winnerMiddle + R) mod 360 = 270.
      // → R = (270 - winnerMiddle + 360*N) mod 360, always in [0, 360)
      const neededRot = ((270 - winnerMiddle) % 360 + 360) % 360;

      // How far forward from startRot to neededRot, always in (0, 360]
      let delta = ((neededRot - startRot) % 360 + 360) % 360;
      if (delta === 0) delta = 360;

      // Add extra full spins for drama
      const extraSpins = 5 + Math.floor(Math.random() * 3); // 5, 6 or 7
      const totalRot = extraSpins * 360 + delta;
      const duration = 4000 + Math.random() * 500;

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // easeOutQuart — smooth, natural deceleration
        const eased = 1 - Math.pow(1 - progress, 4);
        const currentRot = startRot + eased * totalRot;

        // No % 360 during animation — prevents backwards visual jump each revolution
        setRotation(currentRot);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Snap to the exact computed final angle so the winner is precisely at 270°
          setRotation(neededRot);
          setIsSpinning(false);
          setShowWinner(true);
          setWinnerSegIdx(winnerIndex);
          onSpinComplete(activeParticipants[winnerIndex]);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationRef.current);
    },
    [isSpinning, activeParticipants, totalWeight, setIsSpinning, onSpinComplete, spinWinnerName]
  );

  useEffect(() => {
    if (!spinWinnerId) return;
    spinToWinner(spinWinnerId);
  }, [spinNonce, spinWinnerId]);

  return (
    <div
      ref={wrapperRef}
      className="w-full"
      style={{ height: `${Math.round(500 * cssScale)}px` }}
    >
    <div style={{ width: "100%", display: "flex", justifyContent: "center", overflow: "hidden" }}>
    <div
      className="relative flex items-center justify-center"
      style={{
        transform: `scale(${cssScale})`,
        transformOrigin: "top center",
        width: 500,
        flexShrink: 0,
      }}
    >
      {/* Ambient glow layer */}
      <div
        className="absolute rounded-full pointer-events-none transition-all duration-700"
        style={{
          width: 600,
          height: 600,
          background: isSpinning
            ? "radial-gradient(circle, rgba(0,240,255,0.22) 0%, rgba(160,130,255,0.12) 35%, transparent 70%)"
            : showWinner
            ? "radial-gradient(circle, rgba(255,215,0,0.18) 0%, rgba(160,130,255,0.1) 35%, transparent 70%)"
            : "radial-gradient(circle, rgba(0,240,255,0.07) 0%, transparent 60%)",
        }}
      />

      {/* Glow canvas */}
      <canvas
        ref={glowCanvasRef}
        width={570}
        height={570}
        className="absolute z-0 pointer-events-none"
      />

      {/* Wheel container */}
      <div className={`relative ${!isSpinning && !showWinner ? "hover:scale-[1.015] transition-transform duration-500" : ""}`}>

        {/* Spin blur vignette */}
        {isSpinning && (
          <div
            className="absolute inset-0 pointer-events-none z-20 rounded-full"
            style={{
              background: "radial-gradient(circle, transparent 55%, rgba(0,240,255,0.12) 100%)",
              filter: "blur(6px)",
            }}
          />
        )}

        {/* Main wheel */}
        <canvas ref={canvasRef} width={500} height={500} className="relative z-10" />

        {/* Pointer is drawn directly on the canvas inside drawWheel — no SVG overlay needed */}

        {/* Winner glow ring around wheel when showWinner */}
        {showWinner && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none z-5"
            style={{
              boxShadow: "0 0 40px rgba(255,215,0,0.5), 0 0 80px rgba(255,215,0,0.2)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        )}
      </div>
    </div>
    </div>
    </div>
  );
}
