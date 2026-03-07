import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function CookiePolicyPage() {
  return (
    <div className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp}
          className="text-4xl font-extrabold mb-8">Cookie Policy</motion.h1>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className="prose prose-invert prose-sm max-w-none text-white/70 space-y-6">

          <p className="text-white/50 text-sm">Last updated: March 7, 2026</p>

          <h2 className="text-xl font-bold text-white mt-8">What Are Cookies</h2>
          <p>Cookies are small text files placed on your device when you visit our website. They help us provide a better user experience by remembering your preferences and understanding how you use our site.</p>

          <h2 className="text-xl font-bold text-white mt-8">Types of Cookies We Use</h2>

          <h3 className="text-lg font-semibold text-white/90 mt-6">Essential Cookies</h3>
          <p>Required for the website to function properly. These cannot be disabled.</p>

          <h3 className="text-lg font-semibold text-white/90 mt-6">Analytics Cookies</h3>
          <p>Help us understand how visitors interact with our website, allowing us to improve our content and user experience.</p>

          <h3 className="text-lg font-semibold text-white/90 mt-6">Marketing Cookies</h3>
          <p>Used to deliver relevant advertisements and track the effectiveness of our marketing campaigns across platforms.</p>

          <h2 className="text-xl font-bold text-white mt-8">Managing Cookies</h2>
          <p>You can control cookies through your browser settings. Note that disabling certain cookies may affect the functionality of our website.</p>

          <h2 className="text-xl font-bold text-white mt-8">Contact</h2>
          <p>For questions about our cookie practices, contact <a href="mailto:privacy@afmdigital.com" className="text-[hsl(42,87%,55%)] hover:underline">privacy@afmdigital.com</a></p>
        </motion.div>
      </div>
    </div>
  );
}
