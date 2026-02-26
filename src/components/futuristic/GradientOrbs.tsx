import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

// FIX #30-#33: Use CSS var-aligned colors per theme for consistent glow
export default function GradientOrbs() {
  const { theme, colorScheme } = useTheme();

  const getOrbs = () => {
    if (colorScheme === 'midnight-red') {
      return {
        primary: 'radial-gradient(circle, hsla(0, 72%, 51%, 0.12) 0%, transparent 70%)',
        secondary: 'radial-gradient(circle, hsla(340, 65%, 40%, 0.08) 0%, transparent 70%)',
        accent: 'radial-gradient(circle, hsla(30, 80%, 50%, 0.06) 0%, transparent 70%)',
      };
    }
    if (colorScheme === 'midnight-blue') {
      return {
        primary: 'radial-gradient(circle, hsla(207, 68%, 60%, 0.10) 0%, transparent 70%)',
        secondary: 'radial-gradient(circle, hsla(230, 60%, 45%, 0.08) 0%, transparent 70%)',
        accent: 'radial-gradient(circle, hsla(190, 80%, 50%, 0.06) 0%, transparent 70%)',
      };
    }
    if (colorScheme === 'clean-light') {
      // FIX #34: Much more subtle orbs on white/light bg
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
    // Default dark
    return {
      primary: 'radial-gradient(circle, hsla(42, 87%, 55%, 0.10) 0%, transparent 70%)',
      secondary: 'radial-gradient(circle, hsla(260, 70%, 50%, 0.07) 0%, transparent 70%)',
      accent: 'radial-gradient(circle, hsla(200, 90%, 50%, 0.05) 0%, transparent 70%)',
    };
  };

  const orbs = getOrbs();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{ background: orbs.primary, filter: 'blur(80px)' }}
        animate={{ x: ['-10%', '5%', '-10%'], y: ['-5%', '10%', '-5%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '10%', left: '60%' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{ background: orbs.secondary, filter: 'blur(80px)' }}
        animate={{ x: ['5%', '-10%', '5%'], y: ['10%', '-5%', '10%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ bottom: '10%', left: '20%' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{ background: orbs.accent, filter: 'blur(60px)' }}
        animate={{ x: ['-5%', '8%', '-5%'], y: ['5%', '-8%', '5%'] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '50%', right: '10%' }}
      />
    </div>
  );
}
