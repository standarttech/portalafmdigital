import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/use-mobile';
import ParticleField from './ParticleField';
import GradientOrbs from './GradientOrbs';

export default function FuturisticOverlay() {
  const { isFuturistic } = useTheme();
  const isMobile = useIsMobile();
  if (!isFuturistic) return null;

  // On mobile: skip heavy canvas + animated orbs entirely
  if (isMobile) return null;

  return (
    <>
      <GradientOrbs />
      <ParticleField />
    </>
  );
}
