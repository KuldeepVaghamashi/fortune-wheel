"use client";

import { useEffect, useState, useRef } from "react";
import { Trophy, Sparkles, X, Crown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Participant {
  id: string;
  name: string;
  weight: number;
  included: boolean;
}

interface WinnerDisplayProps {
  winner: Participant | null;
  onClose: () => void;
}

export function WinnerDisplay({ winner, onClose }: WinnerDisplayProps) {
  const [show, setShow] = useState(false);
  const [textReveal, setTextReveal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (winner) {
      const timer1 = setTimeout(() => setShow(true), 200);
      const timer2 = setTimeout(() => setTextReveal(true), 600);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else {
      setShow(false);
      setTextReveal(false);
    }
  }, [winner]);

  // Animated background particles
  useEffect(() => {
    if (!show || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = 500;
    canvas.height = 400;
    
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      opacity: number;
    }> = [];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: -Math.random() * 2 - 1,
        color: ["#00F0FF", "#7B61FF", "#FF61DC", "#FFD700"][Math.floor(Math.random() * 4)],
        opacity: Math.random() * 0.8 + 0.2,
      });
    }
    
    let animationId: number;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity -= 0.005;
        
        if (p.y < 0 || p.opacity <= 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
          p.opacity = Math.random() * 0.8 + 0.2;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        
        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.globalAlpha = p.opacity * 0.3;
        ctx.fill();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => cancelAnimationFrame(animationId);
  }, [show]);

  if (!winner) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Animated light rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
          style={{
            background: "conic-gradient(from 0deg, transparent, rgba(0, 240, 255, 0.1), transparent, rgba(123, 97, 255, 0.1), transparent, rgba(255, 97, 220, 0.1), transparent)",
            animation: "spin 8s linear infinite",
          }}
        />
      </div>

      {/* Winner card */}
      <div
        className={`relative glass-panel rounded-3xl p-10 max-w-lg w-full mx-4 text-center transform transition-all duration-700 overflow-hidden ${
          show ? "scale-100 translate-y-0" : "scale-75 translate-y-20"
        }`}
        style={{
          boxShadow: "0 0 60px rgba(0, 240, 255, 0.3), 0 0 100px rgba(123, 97, 255, 0.2), inset 0 0 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Particle canvas */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
        />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all hover:scale-110 border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Crown icon */}
        <div className={`relative mx-auto mb-2 transition-all duration-500 delay-200 ${textReveal ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
          <Crown className="w-10 h-10 text-yellow-400 mx-auto" style={{ filter: "drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))" }} />
        </div>

        {/* Trophy icon */}
        <div className={`relative mx-auto w-28 h-28 mb-6 transition-all duration-500 delay-300 ${textReveal ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/30 animate-ping" style={{ animationDuration: "2s" }} />
          <div className="absolute inset-2 rounded-full border-2 border-purple-400/30 animate-ping" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
          
          {/* Main trophy container */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 animate-pulse" />
            <Trophy className="w-14 h-14 text-cyan-400 relative z-10" style={{ filter: "drop-shadow(0 0 20px rgba(0, 240, 255, 0.8))" }} />
          </div>
          
          {/* Sparkles */}
          <Sparkles className="absolute -top-3 -right-2 w-7 h-7 text-yellow-400 animate-pulse" />
          <Star className="absolute -top-1 left-0 w-5 h-5 text-purple-400 animate-pulse" style={{ animationDelay: "0.3s" }} />
          <Sparkles className="absolute -bottom-1 -left-2 w-6 h-6 text-cyan-400 animate-pulse" style={{ animationDelay: "0.6s" }} />
          <Star className="absolute bottom-0 -right-3 w-4 h-4 text-pink-400 animate-pulse" style={{ animationDelay: "0.9s" }} />
        </div>

        {/* Winner text */}
        <div className={`mb-3 transition-all duration-500 delay-400 ${textReveal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <p className="text-white/70 text-sm font-semibold tracking-[0.3em] uppercase">
            The winner is
          </p>
        </div>

        {/* Winner name with animated gradient */}
        <h2 
          className={`font-[family-name:var(--font-orbitron)] text-5xl md:text-6xl font-black mb-8 text-balance leading-tight transition-all duration-700 delay-500 ${textReveal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          style={{
            background: "linear-gradient(135deg, #00F0FF 0%, #7B61FF 25%, #FF61DC 50%, #FFD700 75%, #00F0FF 100%)",
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "gradient-shift 3s ease infinite",
            textShadow: "0 0 40px rgba(0, 240, 255, 0.5)",
          }}
        >
          {winner.name}
        </h2>

        {/* Decorative lines */}
        <div className={`flex items-center gap-4 mb-8 transition-all duration-500 delay-600 ${textReveal ? "opacity-100" : "opacity-0"}`}>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
        </div>

        {/* Action button */}
        <div className={`transition-all duration-500 delay-700 ${textReveal ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <Button
            onClick={onClose}
            className="relative group bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:via-purple-400 hover:to-pink-400 text-white font-bold rounded-2xl px-10 py-6 text-lg shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:shadow-[0_0_50px_rgba(0,240,255,0.6)] transition-all hover:scale-105"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Spin Again
            </span>
          </Button>
        </div>

        {/* Background decorations */}
        <div className="absolute -z-10 inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>
      </div>
      
      {/* Add keyframe animation */}
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
