import { memo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * PERF: Replaced framer-motion infinite JS animations with pure CSS keyframes.
 * framer-motion was updating style.transform every frame (~60fps), causing
 * constant React reconciliation visible in session replay as rapid attribute mutations.
 * CSS animations run on compositor thread, zero JS overhead.
 */

const orbKeyframes = `
@keyframes orb1 {
  0%, 100% { transform: translate(-10%, -5%); }
  50% { transform: translate(5%, 10%); }
}
@keyframes orb2 {
  0%, 100% { transform: translate(5%, 10%); }
  50% { transform: translate(-10%, -5%); }
}
@keyframes orb3 {
  0%, 100% { transform: translate(-5%, 5%); }
  50% { transform: translate(8%, -8%); }
}
`;

function GradientOrbsInner() {
  const { theme, colorScheme } = useTheme();

  const getOrbs = () => {
    if (colorScheme === 'midnight-blue') {
      return {
        primary: 'radial-gradient(circle, hsla(207, 68%, 60%, 0.10) 0%, transparent 70%)',
        secondary: 'radial-gradient(circle, hsla(230, 60%, 45%, 0.08) 0%, transparent 70%)',
        accent: 'radial-gradient(circle, hsla(190, 80%, 50%, 0.06) 0%, transparent 70%)',
      };
    }
    if (colorScheme === 'clean-light') {
      return {
        primary: 'radial-gradient(circle, hsla(207, 60%, 55%, 0.05) 0%, transparent 70%)',
        secondary: 'radial-gradient(circle, hsla(260, 40%, 50%, 0.04) 0%, transparent 70%)',
        accent: 'radial-gradient(circle, hsla(190, 60%, 50%, 0.03) 0%, transparent 70%)',
      };
    }
    if (theme === 'light') {
      return {
        primary: 'radial-gradient(circle, hsla(42, 87%, 55%, 0.12) 0%, transparent 70%)',
        secondary: 'radial-gradient(circle, hsla(260, 60%, 50%, 0.08) 0%, transparent 70%)',
        accent: 'radial-gradient(circle, hsla(200, 80%, 50%, 0.06) 0%, transparent 70%)',
      };
    }
    return {
      primary: 'radial-gradient(circle, hsla(42, 87%, 55%, 0.10) 0%, transparent 70%)',
      secondary: 'radial-gradient(circle, hsla(260, 70%, 50%, 0.07) 0%, transparent 70%)',
      accent: 'radial-gradient(circle, hsla(200, 90%, 50%, 0.05) 0%, transparent 70%)',
    };
  };

  const orbs = getOrbs();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <style>{orbKeyframes}</style>
      <div
        className="absolute w-[600px] h-[600px] rounded-full will-change-transform"
        style={{
          background: orbs.primary,
          filter: 'blur(80px)',
          top: '10%',
          left: '60%',
          animation: 'orb1 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full will-change-transform"
        style={{
          background: orbs.secondary,
          filter: 'blur(80px)',
          bottom: '10%',
          left: '20%',
          animation: 'orb2 25s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full will-change-transform"
        style={{
          background: orbs.accent,
          filter: 'blur(60px)',
          top: '50%',
          right: '10%',
          animation: 'orb3 18s ease-in-out infinite',
        }}
      />
    </div>
  );
}

const GradientOrbs = memo(GradientOrbsInner);
export default GradientOrbs;
