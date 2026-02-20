import React from "react";
import { useNavigate } from "react-router-dom";
import ssLogo from "@/assets/ss-logo-afm.png";
import "./ss.css";

const ScalingStackPrivacy: React.FC = () => {
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
          <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>/ Privacy Policy</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 prose prose-invert prose-sm sm:prose-base max-w-none">
        <h1 style={{ color: "hsl(0 0% 98%)", fontWeight: 900 }}>Privacy Policy</h1>
        <p style={{ color: "rgba(255,255,255,0.5)" }}>Last updated: January 1, 2025</p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>1. Introduction</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          AFM Digital Agency ("we," "our," or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website or submit information through our forms.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>2. Information We Collect</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>We may collect the following types of personal information:</p>
        <ul style={{ color: "rgba(255,255,255,0.65)" }}>
          <li><strong style={{ color: "hsl(0 0% 98%)" }}>Contact Information:</strong> Name, email address, phone number.</li>
          <li><strong style={{ color: "hsl(0 0% 98%)" }}>Business Information:</strong> Monthly ad spend, business vertical, marketing challenges.</li>
          <li><strong style={{ color: "hsl(0 0% 98%)" }}>Technical Data:</strong> IP address, browser type, referring URL, UTM parameters, and usage analytics.</li>
          <li><strong style={{ color: "hsl(0 0% 98%)" }}>Cookie Data:</strong> We use cookies and tracking pixels (including Meta Pixel) to measure advertising performance.</li>
        </ul>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>3. How We Use Your Information</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>We use the collected information to:</p>
        <ul style={{ color: "rgba(255,255,255,0.65)" }}>
          <li>Respond to your inquiries and provide our services</li>
          <li>Schedule and conduct strategy calls</li>
          <li>Improve our website and marketing materials</li>
          <li>Comply with legal obligations</li>
          <li>Send relevant marketing communications (you may opt out at any time)</li>
        </ul>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>4. Third-Party Services</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          We use GoHighLevel (GHL) as our CRM to manage leads and client communications. Your submitted data is stored securely in our CRM systems. We also use Meta Pixel for advertising measurement and retargeting purposes. These third parties have their own privacy policies governing the use of your data.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>5. Data Retention</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          We retain your personal information for as long as necessary to provide our services or as required by law. You may request deletion of your data at any time by contacting us.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>6. Your Rights</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>Depending on your location, you may have the right to:</p>
        <ul style={{ color: "rgba(255,255,255,0.65)" }}>
          <li>Access the personal information we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Opt out of marketing communications</li>
          <li>Data portability (where applicable)</li>
        </ul>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>7. Cookies</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          Our website uses cookies and similar tracking technologies to enhance your experience and measure advertising performance. By using our site, you consent to our use of cookies. You can control cookies through your browser settings.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>8. Security</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2 style={{ color: "hsl(0 0% 98%)" }}>9. Contact Us</h2>
        <p style={{ color: "rgba(255,255,255,0.65)" }}>
          If you have any questions about this Privacy Policy or how we handle your data, please contact us at:{" "}
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

export default ScalingStackPrivacy;
