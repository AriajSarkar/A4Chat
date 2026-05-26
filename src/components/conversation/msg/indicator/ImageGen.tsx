"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";

/**
 * A dynamic canvas-based loading animation shown while
 * an image generation API call is processing.
 *
 * Renders particles crystallizing around a 3D-perspective frame
 * with a scanning shimmer, simulating the image being assembled.
 */
export function ImageGenIndicator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 280;
    const H = 200;
    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);

    const palette = [
      [61, 139, 255], // accent
      [114, 215, 255], // accent-soft
      [94, 163, 255], // accent-glow
      [196, 160, 255], // violet
      [92, 229, 197], // teal
      [255, 138, 107], // coral
    ];

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      rgb: number[];
      life: number;
      maxLife: number;
      phase: number;
    };

    const particles: Particle[] = [];
    const COUNT = 55;

    function spawn(): Particle {
      const angle = Math.random() * Math.PI * 2;
      const r = 25 + Math.random() * 70;
      return {
        x: W / 2 + Math.cos(angle) * r,
        y: H / 2 + Math.sin(angle) * r,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        size: 2 + Math.random() * 5,
        rgb: palette[Math.floor(Math.random() * palette.length)],
        life: 0,
        maxLife: 90 + Math.random() * 110,
        phase: Math.random() * Math.PI * 2,
      };
    }

    for (let i = 0; i < COUNT; i++) {
      const p = spawn();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    let t = 0;

    function draw() {
      if (!ctx) return;
      t++;
      ctx.clearRect(0, 0, W, H);

      // Pulsing radial background glow
      const pulse = 65 + Math.sin(t * 0.02) * 12;
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, pulse);
      bg.addColorStop(0, "rgba(61,139,255,0.07)");
      bg.addColorStop(0.6, "rgba(114,215,255,0.03)");
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 3D-perspective rotating frame
      ctx.save();
      ctx.translate(W / 2, H / 2);
      const rot = t * 0.007;
      const sx = 0.88 + Math.sin(rot) * 0.06;
      const sk = Math.sin(rot * 1.2) * 0.025;
      ctx.transform(sx, sk, -sk * 0.4, 1, 0, 0);

      const fw = 96,
        fh = 68;
      ctx.strokeStyle = `rgba(61,139,255,${0.14 + Math.sin(t * 0.03) * 0.06})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      rr(ctx, -fw, -fh, fw * 2, fh * 2, 10);
      ctx.stroke();

      // Scanline shimmer
      const sy = -fh + ((t * 1.4) % (fh * 2));
      const sg = ctx.createLinearGradient(-fw, sy - 3, -fw, sy + 3);
      sg.addColorStop(0, "rgba(114,215,255,0)");
      sg.addColorStop(0.5, "rgba(114,215,255,0.12)");
      sg.addColorStop(1, "rgba(114,215,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(-fw + 1, sy - 3, fw * 2 - 2, 6);

      ctx.restore();

      // Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life >= p.maxLife) {
          particles[i] = spawn();
          continue;
        }

        p.x += p.vx + Math.sin(t * 0.018 + p.phase) * 0.25;
        p.y += p.vy + Math.cos(t * 0.014 + p.phase) * 0.18;

        const dx = W / 2 - p.x,
          dy = H / 2 - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 4) {
          p.vx += (dx / d) * 0.012;
          p.vy += (dy / d) * 0.012;
        }
        p.vx *= 0.994;
        p.vy *= 0.994;

        const prog = p.life / p.maxLife;
        const a = prog < 0.15 ? prog / 0.15 : prog > 0.8 ? (1 - prog) / 0.2 : 1;
        const sz = p.size * (0.5 + a * 0.5);
        const [r, g, b] = p.rgb;

        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.55})`;
        ctx.fill();

        if (sz > 3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, sz * 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.08})`;
          ctx.fill();
        }
      }

      // Center landscape icon hint
      const ia = 0.18 + Math.sin(t * 0.035) * 0.08;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.strokeStyle = `rgba(114,215,255,${ia})`;
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const iw = 14,
        ih = 10;
      ctx.beginPath();
      rr(ctx, -iw, -ih, iw * 2, ih * 2, 2.5);
      ctx.stroke();

      // Mountain lines
      ctx.beginPath();
      ctx.moveTo(-iw + 2, ih - 1);
      ctx.lineTo(-iw + 8, -ih + 5);
      ctx.lineTo(-iw + 12, ih / 2);
      ctx.lineTo(-iw + 17, -ih + 7);
      ctx.lineTo(iw - 2, ih - 1);
      ctx.strokeStyle = `rgba(114,215,255,${ia * 0.6})`;
      ctx.stroke();

      // Sun
      ctx.beginPath();
      ctx.arc(iw - 6, -ih + 4, 2.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(245,197,66,${ia})`;
      ctx.stroke();
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="flex flex-col items-center gap-3 py-4"
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-white/6 bg-white/2"
        style={{ perspective: "600px" }}
      >
        <canvas ref={canvasRef} className="block" style={{ width: 280, height: 200 }} />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/3 to-transparent imagegen-shimmer" />
      </div>
      <div className="flex items-center gap-2 text-xs text-text-quaternary">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/40" />
          <span className="relative inline-flex size-2 rounded-full bg-accent/60" />
        </span>
        Generating image…
      </div>
    </motion.div>
  );
}

/** Canvas helper — rounded rectangle path */
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
