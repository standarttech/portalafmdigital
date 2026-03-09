import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useShouldReduceEffects } from '@/hooks/useReducedMotion';

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

function getParticleColors(colorScheme: string, baseTheme: string) {
  if (colorScheme === 'midnight-red') {
    return { hues: [0, 15, 340], sat: 70, light: 50, connHue: 0, connSat: 65, connLight: 45, globalOpacity: 0.45 };
  }
  if (colorScheme === 'midnight-blue') {
    return { hues: [207, 220, 190], sat: 65, light: 55, connHue: 207, connSat: 60, connLight: 50, globalOpacity: 0.45 };
  }
  if (colorScheme === 'clean-light') {
    return { hues: [207, 230, 250], sat: 40, light: 35, connHue: 220, connSat: 35, connLight: 40, globalOpacity: 0.2 };
  }
  if (baseTheme === 'light') {
    return { hues: [42, 30, 260], sat: 55, light: 40, connHue: 42, connSat: 55, connLight: 45, globalOpacity: 0.25 };
  }
  return { hues: [42, 260], sat: 80, light: 65, connHue: 42, connSat: 80, connLight: 55, globalOpacity: 0.6 };
}

export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -1000, y: -1000 });
  const animRef = useRef<number>(0);
  const { colorScheme, theme } = useTheme();
  const reduceEffects = useShouldReduceEffects();

  useEffect(() => {
    // Skip entirely for reduced-motion / low-perf devices
    if (reduceEffects) return;

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

    const count = Math.min(50, Math.floor((window.innerWidth * window.innerHeight) / 25000));
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
    window.addEventListener('mousemove', handleMouse, { passive: true });

    let time = 0;
    let lastFrame = 0;
    const TARGET_FPS = 30; // Cap at 30fps to reduce CPU usage
    const FRAME_INTERVAL = 1000 / TARGET_FPS;

    const animate = (now: number) => {
      animRef.current = requestAnimationFrame(animate);

      // Throttle to target FPS
      if (now - lastFrame < FRAME_INTERVAL) return;
      lastFrame = now;

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

        // Connections — reduced distance for performance
        const connDist = colorScheme === 'clean-light' || theme === 'light' ? 70 : 100;
        for (let j = i + 1; j < particles.current.length; j++) {
          const p2 = particles.current[j];
          const d = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (d < connDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${colors.connHue}, ${colors.connSat}%, ${colors.connLight}%, ${0.06 * (1 - d / connDist)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouse);
      cancelAnimationFrame(animRef.current);
    };
  }, [colorScheme, theme, reduceEffects]);

  // Don't render canvas at all if effects are reduced
  if (reduceEffects) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: getParticleColors(colorScheme, theme).globalOpacity }}
    />
  );
}
