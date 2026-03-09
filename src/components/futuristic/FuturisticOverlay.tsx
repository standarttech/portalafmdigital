import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useShouldReduceEffects } from '@/hooks/useReducedMotion';
import ParticleField from './ParticleField';
import GradientOrbs from './GradientOrbs';

export default function FuturisticOverlay() {
  const { isFuturistic } = useTheme();
  const isMobile = useIsMobile();
  const reduceEffects = useShouldReduceEffects();

  if (!isFuturistic) return null;

  // On mobile or reduced-motion: skip heavy canvas + animated orbs entirely
  if (isMobile) return null;

  // On low-perf devices: show only lightweight CSS orbs, skip canvas
  if (reduceEffects) {
    return <GradientOrbs />;
  }

  return (
    <>
      <GradientOrbs />
      <ParticleField />
    </>
  );
}
