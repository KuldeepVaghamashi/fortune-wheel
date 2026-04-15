"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
}

interface AuroraWave {
  y: number;
  amplitude: number;
  frequency: number;
  speed: number;
  color: string;
  opacity: number;
  phase: number;
}

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const auroraRef = useRef<AuroraWave[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* ── Detect device capability once at mount ── */
    const isMobile = window.innerWidth < 768;
    const isLowEnd = isMobile; // treat mobile as low-end for now

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    /* Only track mouse on desktop — saves work on mobile */
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;
    if (!isMobile) {
      handleMouseMove = (e: MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
      };
      window.addEventListener("mousemove", handleMouseMove);
    }

    /* ── Particles ── */
    const colors = ["#00F0FF", "#7B61FF", "#FF61DC", "#00FF88", "#4DFFFF", "#A855F7"];
    const particleCount = isMobile ? 28 : 65;

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * (isMobile ? 0.2 : 0.3),
      vy: (Math.random() - 0.5) * (isMobile ? 0.2 : 0.3),
      size: Math.random() * (isMobile ? 1.8 : 2.5) + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      pulseSpeed: 0.02 + Math.random() * 0.03,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    /* ── Aurora waves ── */
    auroraRef.current = isMobile
      ? [
          { y: canvas.height * 0.4, amplitude: 40, frequency: 0.003, speed: 0.0004, color: "#00F0FF", opacity: 0.045, phase: 0 },
        ]
      : [
          { y: canvas.height * 0.3, amplitude: 60, frequency: 0.003, speed: 0.0005, color: "#00F0FF", opacity: 0.08, phase: 0 },
          { y: canvas.height * 0.5, amplitude: 80, frequency: 0.002, speed: 0.0007, color: "#7B61FF", opacity: 0.06, phase: Math.PI / 3 },
          { y: canvas.height * 0.7, amplitude: 50, frequency: 0.004, speed: 0.0003, color: "#FF61DC", opacity: 0.05, phase: Math.PI / 2 },
        ];

    /* ── Floating orbs (desktop only) ── */
    const orbPositions = [
      { x: canvas.width * 0.1, y: canvas.height * 0.2, size: 150, color: "#00F0FF" },
      { x: canvas.width * 0.9, y: canvas.height * 0.7, size: 200, color: "#7B61FF" },
      { x: canvas.width * 0.5, y: canvas.height * 0.9, size: 180, color: "#FF61DC" },
    ];

    /* ── RAF throttle for mobile ── */
    let lastFrameTime = 0;
    const targetInterval = isMobile ? 50 : 16; // 20fps mobile, 60fps desktop

    const animate = (timestamp: number) => {
      animationRef.current = requestAnimationFrame(animate);

      /* Throttle on mobile */
      if (timestamp - lastFrameTime < targetInterval) return;
      lastFrameTime = timestamp;

      timeRef.current += 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* Aurora waves */
      auroraRef.current.forEach((wave) => {
        wave.phase += wave.speed;

        ctx.beginPath();
        ctx.moveTo(0, wave.y);

        for (let x = 0; x <= canvas.width; x += (isMobile ? 8 : 5)) {
          const y =
            wave.y +
            Math.sin(x * wave.frequency + wave.phase) * wave.amplitude +
            Math.sin(x * wave.frequency * 0.5 + wave.phase * 2) * (wave.amplitude * 0.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, wave.y - wave.amplitude, 0, wave.y + wave.amplitude * 2);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, wave.color);
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.globalAlpha = wave.opacity * (0.8 + Math.sin(timeRef.current * 0.01) * 0.2);
        ctx.fill();
      });

      /* Particles */
      particlesRef.current.forEach((particle, index) => {
        /* Mouse attraction — desktop only */
        if (!isMobile) {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200 && dist > 0) {
            particle.vx += (dx / dist) * 0.01;
            particle.vy += (dy / dist) * 0.01;
          }
        }

        particle.vx *= 0.99;
        particle.vy *= 0.99;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -10) particle.x = canvas.width + 10;
        if (particle.x > canvas.width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = canvas.height + 10;
        if (particle.y > canvas.height + 10) particle.y = -10;

        const pulsingOpacity =
          particle.opacity * (0.7 + 0.3 * Math.sin(timeRef.current * particle.pulseSpeed + particle.pulsePhase));

        /* Draw particle core */
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = pulsingOpacity;
        ctx.fill();

        /* Glow halo — desktop only (expensive: createRadialGradient per particle) */
        if (!isLowEnd) {
          const glowGradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 6,
          );
          glowGradient.addColorStop(0, particle.color);
          glowGradient.addColorStop(0.4, particle.color + "40");
          glowGradient.addColorStop(1, "transparent");

          ctx.fillStyle = glowGradient;
          ctx.globalAlpha = pulsingOpacity * 0.4;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        /* Connection lines — desktop only (O(n²) — most expensive part) */
        if (!isLowEnd) {
          particlesRef.current.slice(index + 1).forEach((p2) => {
            const dx = particle.x - p2.x;
            const dy = particle.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 120) {
              const gradient = ctx.createLinearGradient(particle.x, particle.y, p2.x, p2.y);
              gradient.addColorStop(0, particle.color);
              gradient.addColorStop(1, p2.color);

              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 0.5;
              ctx.globalAlpha = 0.15 * (1 - distance / 120);
              ctx.stroke();
            }
          });
        }
      });

      /* Floating orbs — desktop only */
      if (!isLowEnd) {
        orbPositions.forEach((orb, i) => {
          const floatY = orb.y + Math.sin(timeRef.current * 0.008 + i) * 30;
          const floatX = orb.x + Math.cos(timeRef.current * 0.006 + i) * 20;

          const gradient = ctx.createRadialGradient(floatX, floatY, 0, floatX, floatY, orb.size);
          gradient.addColorStop(0, orb.color + "15");
          gradient.addColorStop(0.5, orb.color + "08");
          gradient.addColorStop(1, "transparent");

          ctx.beginPath();
          ctx.arc(floatX, floatY, orb.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = 1;
          ctx.fill();
        });
      }

      ctx.globalAlpha = 1;
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (handleMouseMove) window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: "linear-gradient(180deg, #050508 0%, #0A0A12 50%, #080810 100%)" }}
    />
  );
}
