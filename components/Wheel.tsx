"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import type { Participant } from "@/lib/types";

interface WheelProps {
  participants: Participant[];
  currentRotation: number;
  highlightedIndex?: number;
}

const colors = ["#0ea5e9", "#7c3aed", "#db2777", "#16a34a", "#f59e0b", "#ef4444"];

export function Wheel({ participants, currentRotation, highlightedIndex }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eligibleParticipants = useMemo(
    () => participants.filter((p) => !p.isExcluded && p.weight > 0),
    [participants],
  );

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    ctx.clearRect(0, 0, size, size);

    if (eligibleParticipants.length === 0) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No eligible participants", center, center);
      return;
    }

    const segmentAngle = (Math.PI * 2) / eligibleParticipants.length;
    for (let i = 0; i < eligibleParticipants.length; i++) {
      const start = i * segmentAngle;
      const end = start + segmentAngle;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();

      if (highlightedIndex === i) {
        ctx.save();
        ctx.shadowColor = "#fde047";
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "#fde047";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const mid = start + segmentAngle / 2;
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(mid);
      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "right";
      const name = eligibleParticipants[i].name.slice(0, 16);
      ctx.fillText(name, radius - 20, 5);
      ctx.restore();
    }
  }, [eligibleParticipants, highlightedIndex]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  return (
    <div className="relative">
      <motion.div animate={{ rotate: currentRotation }} transition={{ duration: 0 }}>
        <canvas ref={canvasRef} width={520} height={520} className="rounded-full" />
      </motion.div>
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
        <div className="h-0 w-0 border-x-[16px] border-t-[30px] border-x-transparent border-t-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
      </div>
    </div>
  );
}
