import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  hue: number;
  saturation: number;
  lightness: number;
}

// Theme-specific particle color palettes
function getParticleColors(colorScheme: string, baseTheme: string): { hues: number[]; sat: number; light: number; connHue: number; connSat: number; connLight: number; globalOpacity: number } {
  if (colorScheme === 'midnight-blue') {
    return {
      hues: [207, 220, 240],     // blue palette
      sat: 70, light: 60,
      connHue: 207, connSat: 70, connLight: 55,
      globalOpacity: 0.5,
    };
  }
  if (colorScheme === 'clean-light') {
    return {
      hues: [207, 220, 260],     // blue/indigo on light bg
      sat: 50, light: 45,        // darker to be visible on white
      connHue: 207, connSat: 50, connLight: 50,
      globalOpacity: 0.35,       // more subtle on light
    };
  }
  if (baseTheme === 'light') {
    return {
      hues: [42, 30, 260],       // gold/amber/purple, darker
      sat: 65, light: 45,
      connHue: 42, connSat: 65, connLight: 50,
      globalOpacity: 0.35,
    };
  }
  // Default dark
  return {
    hues: [42, 260],             // gold + purple
    sat: 80, light: 65,
    connHue: 42, connSat: 80, connLight: 55,
    globalOpacity: 0.6,
  };
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);
  const { colorScheme, theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = getParticleColors(colorScheme, theme);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 15000));
    particles.current = Array.from({ length: count }, () => {
      const hue = colors.hues[Math.floor(Math.random() * colors.hues.length)];
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        hue,
        saturation: colors.sat,
        lightness: colors.light,
      };
    });

    const handleMouse = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouse);

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;

      particles.current.forEach((p, i) => {
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.vx -= (dx / dist) * force * 0.02;
          p.vy -= (dy / dist) * force * 0.02;
        }

        const driftAngle = time * 0.5 + i * 0.7;
        p.vx += Math.sin(driftAngle) * 0.003;
        p.vy += Math.cos(driftAngle * 0.8 + i) * 0.003;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed < 0.15) {
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy += (Math.random() - 0.5) * 0.05;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.995;
        p.vy *= 0.995;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const pulse = 0.3 + 0.4 * Math.sin(time * 1.2 + i * 1.3);
        const currentOpacity = p.opacity * (0.5 + pulse);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.9 + pulse * 0.3), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${currentOpacity})`;
        ctx.fill();

        if (currentOpacity > 0.4) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${currentOpacity * 0.08})`;
          ctx.fill();
        }

        for (let j = i + 1; j < particles.current.length; j++) {
          const p2 = particles.current[j];
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < 120) {
            const connPulse = 0.5 + 0.5 * Math.sin(time * 0.8 + i * 0.3 + j * 0.2);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${colors.connHue}, ${colors.connSat}%, ${colors.connLight}%, ${0.06 * connPulse * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animRef.current);
    };
  }, [colorScheme, theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: getParticleColors(colorScheme, theme).globalOpacity }}
    />
  );
}
