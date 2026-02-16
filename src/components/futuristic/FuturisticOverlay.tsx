import { useTheme } from '@/contexts/ThemeContext';
import ParticleField from './ParticleField';
import GradientOrbs from './GradientOrbs';

export default function FuturisticOverlay() {
  const { isFuturistic } = useTheme();
  if (!isFuturistic) return null;

  return (
    <>
      <GradientOrbs />
      <ParticleField />
    </>
  );
}
