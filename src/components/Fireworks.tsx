"use client";

import { useEffect, useRef } from "react";

type Props = {
  active: boolean;
  colors: string[];
  durationMs?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  trail: boolean;
};

type Rocket = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  exploded: boolean;
};

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 255, g: 120, b: 90 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function withAlpha(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Fireworks({ active, colors, durationMs = 6500 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsKey = colors.join("|");

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = colors.length
      ? colors
      : ["#FF5A5F", "#FFB347", "#00C9A7", "#FFE66D", "#FF8FAB"];

    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;
    const particles: Particle[] = [];
    const rockets: Rocket[] = [];
    const start = performance.now();
    let lastBurst = 0;

    function resize() {
      const parent = canvas!.parentElement;
      width = parent?.clientWidth || window.innerWidth;
      height = parent?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function burst(x: number, y: number, color: string) {
      const count = 48 + Math.floor(Math.random() * 28);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = 1.8 + Math.random() * 4.8;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 45 + Math.random() * 35,
          color: Math.random() > 0.25 ? color : palette[Math.floor(Math.random() * palette.length)],
          size: 1.5 + Math.random() * 2.4,
          trail: Math.random() > 0.55,
        });
      }
      for (let i = 0; i < 18; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 1.8;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.4,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          color: "#ffffff",
          size: 1 + Math.random(),
          trail: false,
        });
      }
    }

    function launchRocket() {
      const color = palette[Math.floor(Math.random() * palette.length)];
      const x = width * (0.12 + Math.random() * 0.76);
      rockets.push({
        x,
        y: height + 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(7.5 + Math.random() * 3.5),
        targetY: height * (0.18 + Math.random() * 0.35),
        color,
        exploded: false,
      });
    }

    function frame(now: number) {
      if (!running) return;
      const elapsed = now - start;
      ctx!.clearRect(0, 0, width, height);

      if (elapsed < durationMs - 900 && now - lastBurst > 380 + Math.random() * 320) {
        launchRocket();
        if (Math.random() > 0.45) launchRocket();
        lastBurst = now;
      }

      for (const rocket of rockets) {
        if (rocket.exploded) continue;
        rocket.x += rocket.vx;
        rocket.y += rocket.vy;
        rocket.vy += 0.045;

        ctx!.beginPath();
        ctx!.fillStyle = withAlpha(rocket.color, 0.95);
        ctx!.arc(rocket.x, rocket.y, 2.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.strokeStyle = withAlpha(rocket.color, 0.35);
        ctx!.lineWidth = 2;
        ctx!.moveTo(rocket.x, rocket.y);
        ctx!.lineTo(rocket.x - rocket.vx * 4, rocket.y - rocket.vy * 4);
        ctx!.stroke();

        if (rocket.y <= rocket.targetY || rocket.vy >= -0.5) {
          rocket.exploded = true;
          burst(rocket.x, rocket.y, rocket.color);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.vx *= 0.985;
        p.vy *= 0.985;

        const t = p.life / p.maxLife;
        const alpha = Math.max(0, 1 - t);
        if (p.trail) {
          ctx!.beginPath();
          ctx!.strokeStyle = withAlpha(p.color, alpha * 0.55);
          ctx!.lineWidth = p.size * 0.7;
          ctx!.moveTo(p.x, p.y);
          ctx!.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
          ctx!.stroke();
        }
        ctx!.beginPath();
        ctx!.fillStyle = withAlpha(p.color, alpha);
        ctx!.arc(p.x, p.y, p.size * (1 - t * 0.35), 0, Math.PI * 2);
        ctx!.fill();

        if (p.life >= p.maxLife) particles.splice(i, 1);
      }

      if (elapsed < durationMs || particles.length > 0 || rockets.some((r) => !r.exploded)) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx!.clearRect(0, 0, width, height);
      }
    }

    resize();
    for (let i = 0; i < 3; i++) {
      window.setTimeout(() => launchRocket(), i * 180);
    }
    window.setTimeout(() => {
      burst(width * 0.5, height * 0.32, palette[0]);
    }, 420);

    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // colorsKey captures palette changes without unstable array identity
  }, [active, durationMs, colorsKey, colors]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="fireworks-canvas" aria-hidden />;
}
