import { motion } from 'framer-motion';

export default function GradientOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Primary gold orb */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsla(42, 87%, 55%, 0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: ['-10%', '5%', '-10%'],
          y: ['-5%', '10%', '-5%'],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '10%', left: '60%' }}
      />
      {/* Purple orb */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsla(260, 70%, 50%, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: ['5%', '-10%', '5%'],
          y: ['10%', '-5%', '10%'],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ bottom: '10%', left: '20%' }}
      />
      {/* Cyan accent */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, hsla(200, 90%, 50%, 0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: ['-5%', '8%', '-5%'],
          y: ['5%', '-8%', '5%'],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '50%', right: '10%' }}
      />
    </div>
  );
}
