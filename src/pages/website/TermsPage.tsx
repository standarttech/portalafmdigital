import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function TermsPage() {
  return (
    <div className="py-32 px-6">
      <div className="max-w-3xl mx-auto">
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp}
          className="text-4xl font-extrabold mb-8">Terms of Service</motion.h1>
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className="prose prose-invert prose-sm max-w-none text-white/70 space-y-6">

          <p className="text-white/50 text-sm">Last updated: March 7, 2026</p>

          <h2 className="text-xl font-bold text-white mt-8">1. Agreement to Terms</h2>
          <p>By accessing or using AFM Digital's website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

          <h2 className="text-xl font-bold text-white mt-8">2. Services</h2>
          <p>AFM Digital provides paid advertising management services, including but not limited to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Campaign strategy and planning across Meta, Google, and TikTok</li>
            <li>Ad account management through whitelisted agency accounts</li>
            <li>Performance analytics and reporting via our client portal</li>
            <li>Funnel optimization and conversion rate improvement</li>
            <li>Creative strategy and ad copy consultation</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">3. Client Obligations</h2>
          <p>As a client, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide accurate and complete information about your business</li>
            <li>Ensure your products/services comply with advertising platform policies</li>
            <li>Make timely payments according to the agreed schedule</li>
            <li>Respond to communications within a reasonable timeframe</li>
            <li>Not engage in activities that violate advertising platform terms</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">4. Payment Terms</h2>
          <p>Payment terms are specified in individual service agreements. Ad spend is billed separately from management fees. All invoices are due within 14 days of issue unless otherwise agreed in writing.</p>

          <h2 className="text-xl font-bold text-white mt-8">5. Performance Disclaimers</h2>
          <p>While we strive for optimal results, AFM Digital does not guarantee specific advertising outcomes. Performance metrics including ROAS, CPL, and conversion rates are influenced by factors beyond our control, including market conditions, competition, and product-market fit.</p>

          <h2 className="text-xl font-bold text-white mt-8">6. Intellectual Property</h2>
          <p>All content on this website, including text, graphics, logos, and software, is the property of AFM Digital and protected by intellectual property laws. Client-specific campaign materials remain the property of the respective client.</p>

          <h2 className="text-xl font-bold text-white mt-8">7. Confidentiality</h2>
          <p>Both parties agree to maintain the confidentiality of proprietary information shared during the course of our business relationship. This includes campaign data, strategies, and performance metrics.</p>

          <h2 className="text-xl font-bold text-white mt-8">8. Limitation of Liability</h2>
          <p>AFM Digital's total liability shall not exceed the total fees paid by the client in the 3 months preceding the claim. We are not liable for indirect, incidental, or consequential damages.</p>

          <h2 className="text-xl font-bold text-white mt-8">9. Termination</h2>
          <p>Either party may terminate the service agreement with 30 days written notice. Upon termination, we will provide a final performance report and transfer any applicable ad account access.</p>

          <h2 className="text-xl font-bold text-white mt-8">10. Contact</h2>
          <p>For questions about these Terms, contact us at <a href="mailto:legal@afmdigital.com" className="text-[hsl(42,87%,55%)] hover:underline">legal@afmdigital.com</a></p>
        </motion.div>
      </div>
    </div>
  );
}
