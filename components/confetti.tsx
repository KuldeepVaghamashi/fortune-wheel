"use client";

import { useEffect, useState, useRef } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  speedX: number;
  speedY: number;
  gravity: number;
  opacity: number;
  shape: "rect" | "circle" | "star";
}

interface ConfettiProps {
  active: boolean;
}

const COLORS = [
  "#00F0FF", "#7B61FF", "#FF61DC", "#00FF88", "#FFD700", 
  "#FF6B6B", "#4ECDC4", "#A855F7", "#EC4899", "#F97316"
];

export function Confetti({ active }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const piecesRef = useRef<ConfettiPiece[]>([]);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (active) {
      setIsActive(true);
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Create confetti pieces with burst effect
      const pieces: ConfettiPiece[] = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.4;
      
      // Initial burst
      for (let i = 0; i < 150; i++) {
        const angle = (Math.random() * Math.PI * 2);
        const velocity = 10 + Math.random() * 15;
        pieces.push({
          id: i,
          x: centerX,
          y: centerY,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 10,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 15,
          speedX: Math.cos(angle) * velocity,
          speedY: Math.sin(angle) * velocity - 5,
          gravity: 0.15 + Math.random() * 0.1,
          opacity: 1,
          shape: ["rect", "circle", "star"][Math.floor(Math.random() * 3)] as "rect" | "circle" | "star",
        });
      }
      
      // Side bursts
      for (let side = 0; side < 2; side++) {
        const sideX = side === 0 ? canvas.width * 0.2 : canvas.width * 0.8;
        for (let i = 0; i < 50; i++) {
          const angle = side === 0 
            ? -Math.PI / 4 + (Math.random() * Math.PI / 2)
            : Math.PI / 4 + Math.PI / 2 + (Math.random() * Math.PI / 2);
          const velocity = 8 + Math.random() * 12;
          pieces.push({
            id: 150 + side * 50 + i,
            x: sideX,
            y: canvas.height * 0.6,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            size: 5 + Math.random() * 8,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 12,
            speedX: Math.cos(angle) * velocity,
            speedY: Math.sin(angle) * velocity - 8,
            gravity: 0.12 + Math.random() * 0.08,
            opacity: 1,
            shape: ["rect", "circle", "star"][Math.floor(Math.random() * 3)] as "rect" | "circle" | "star",
          });
        }
      }
      
      piecesRef.current = pieces;
      
      const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size / 2;
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        
        ctx.beginPath();
        ctx.moveTo(x, y - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
          rot += step;
          ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
          rot += step;
        }
        
        ctx.lineTo(x, y - outerRadius);
        ctx.closePath();
      };
      
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let stillActive = false;
        
        piecesRef.current.forEach((piece) => {
          if (piece.opacity <= 0) return;
          
          stillActive = true;
          
          // Update physics
          piece.speedY += piece.gravity;
          piece.x += piece.speedX;
          piece.y += piece.speedY;
          piece.rotation += piece.rotationSpeed;
          piece.speedX *= 0.99;
          
          // Fade out when below screen
          if (piece.y > canvas.height - 100) {
            piece.opacity -= 0.02;
          }
          
          // Draw piece
          ctx.save();
          ctx.translate(piece.x, piece.y);
          ctx.rotate((piece.rotation * Math.PI) / 180);
          ctx.globalAlpha = piece.opacity;
          ctx.fillStyle = piece.color;
          
          if (piece.shape === "rect") {
            ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
          } else if (piece.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, piece.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            drawStar(ctx, 0, 0, piece.size / 2);
            ctx.fill();
          }
          
          // Add glow effect
          ctx.shadowColor = piece.color;
          ctx.shadowBlur = 10;
          
          ctx.restore();
        });
        
        if (stillActive) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsActive(false);
        }
      };
      
      animate();
      
      // Auto cleanup after 6 seconds
      const timer = setTimeout(() => {
        cancelAnimationFrame(animationRef.current);
        setIsActive(false);
      }, 6000);
      
      return () => {
        clearTimeout(timer);
        cancelAnimationFrame(animationRef.current);
      };
    } else {
      setIsActive(false);
      cancelAnimationFrame(animationRef.current);
    }
  }, [active]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
