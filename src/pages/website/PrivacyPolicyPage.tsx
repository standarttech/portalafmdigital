import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp}
          className="text-4xl font-extrabold mb-8">Privacy Policy</motion.h1>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className="prose prose-invert prose-sm max-w-none text-white/70 space-y-6">

          <p className="text-white/50 text-sm">Last updated: March 7, 2026</p>

          <h2 className="text-xl font-bold text-white mt-8">1. Information We Collect</h2>
          <p>When you use our website or services, we may collect the following information:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Name, email address, phone number, and company name provided through contact forms</li>
            <li>Website URL and monthly advertising budget information</li>
            <li>Usage data including pages visited, time spent, and interaction patterns</li>
            <li>Device information, browser type, and IP address</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">2. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Respond to your inquiries and provide requested services</li>
            <li>Manage and optimize advertising campaigns on your behalf</li>
            <li>Improve our website and services</li>
            <li>Send relevant communications about our services (with your consent)</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share your information with:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Advertising platforms (Meta, Google, TikTok) as required to manage your campaigns</li>
            <li>Service providers who assist in our operations under strict confidentiality agreements</li>
            <li>Law enforcement when required by applicable law</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">4. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data, including encryption, access controls, and regular security audits. Our platform operates through whitelisted agency accounts with enhanced security protocols.</p>

          <h2 className="text-xl font-bold text-white mt-8">5. Data Retention</h2>
          <p>We retain your personal data only for as long as necessary to fulfill the purposes described in this policy or as required by law. Campaign data is retained for the duration of our business relationship plus 3 years for reporting purposes.</p>

          <h2 className="text-xl font-bold text-white mt-8">6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Access your personal data</li>
            <li>Request correction or deletion of your data</li>
            <li>Withdraw consent for marketing communications</li>
            <li>Request data portability</li>
            <li>Object to processing of your data</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">7. Cookies</h2>
          <p>We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. You can control cookie preferences through your browser settings.</p>

          <h2 className="text-xl font-bold text-white mt-8">8. Contact Us</h2>
          <p>For any questions about this Privacy Policy, please contact us at <a href="mailto:privacy@afmdigital.com" className="text-[hsl(42,87%,55%)] hover:underline">privacy@afmdigital.com</a></p>
        </motion.div>
      </div>
    </div>
  );
}
