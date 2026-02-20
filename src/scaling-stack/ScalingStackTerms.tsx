import React from "react";
import { useNavigate } from "react-router-dom";
import ssLogo from "@/assets/ss-logo-afm.png";
import "./ss.css";

const ScalingStackTerms: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="ss-root min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: "rgba(8,11,20,0.9)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate("/scaling-stack")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src={ssLogo} alt="AFM" className="h-7 w-auto" />
          </button>
          <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>/ Terms of Service</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 prose prose-invert prose-sm sm:prose-base max-w-none">
        <h1 style={{ color: "hsl(0 0% 98%)", fontWeight: 900 }}>Terms of Service</h1>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Last updated: January 1, 2025</p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>1. Acceptance of Terms</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          By accessing or using the AFM Digital Agency website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>2. Services</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          AFM Digital Agency provides paid advertising management, creative strategy, tracking setup, and related digital marketing services. The specific scope of services for each client is defined in a separate service agreement.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>3. Free Audit / Consultation</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          Our free ads audit is a no-obligation consultation. By submitting the application form, you consent to being contacted by our team for the purpose of discussing your advertising goals. We reserve the right to decline any application at our discretion.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>4. Intellectual Property</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          All content on this website, including text, graphics, and branding, is the property of AFM Digital Agency and is protected by applicable intellectual property laws. You may not reproduce or distribute any content without prior written consent.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>5. Disclaimer of Warranties</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          While we strive to deliver exceptional results, advertising performance is subject to platform policies, market conditions, and other factors outside our control. Past results presented on this website are not a guarantee of future performance.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>6. Limitation of Liability</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          To the maximum extent permitted by law, AFM Digital Agency shall not be liable for any indirect, incidental, or consequential damages arising from your use of our website or services.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>7. Governing Law</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through binding arbitration or in courts of competent jurisdiction.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>8. Changes to Terms</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          We reserve the right to update these Terms at any time. Continued use of our services after changes constitutes acceptance of the revised Terms.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>9. Contact</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          For questions about these Terms, contact us at:{" "}
          <a href="mailto:hello@afmdigital.com" style={{ color: "#63b3ed" }}>hello@afmdigital.com</a>
        </p>
      </div>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          © 2025 AFM Digital Agency · All rights reserved
        </div>
      </footer>
    </div>
  );
};

export default ScalingStackTerms;
