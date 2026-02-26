import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ssLogo from "@/assets/ss-logo-afm.png";

// ---- Meta Pixel ----
function initMetaPixel() {
  if (typeof window === "undefined") return;
  const win = window as any;
  if (win.fbq) return;
  const n: any = function () {n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);};
  if (!win._fbq) win._fbq = n;
  n.push = n;n.loaded = true;n.version = "2.0";n.queue = [];
  win.fbq = n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  const s = document.getElementsByTagName("script")[0];
  s.parentNode?.insertBefore(t, s);
  n("init", "1566413911316887");
  n("track", "PageView");
}

// ---- UTM storage ----
function storeUTMs() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
  const result: Record<string, string> = {};
  keys.forEach((k) => {const v = params.get(k);if (v) result[k] = v;});
  if (Object.keys(result).length > 0) sessionStorage.setItem("afm_utm", JSON.stringify(result));
}

// ---- Stars ----
function Stars({ size = 20 }: {size?: number;}) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) =>
      <svg key={i} width={size} height={size} viewBox="0 0 20 20" fill="#FBBF24">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
    </div>);

}

// ---- Data ----
const TESTIMONIALS = [
{ quote: "AFM brought structure to our testing. CPA stabilized and we finally had a repeatable way to scale.", name: "Sarah M.", role: "DTC Skincare Founder", initials: "SM" },
{ quote: "We scaled from $15k/mo to $80k/mo in three months without killing our ROAS. The system just works.", name: "Marcus D.", role: "Supplements Brand", initials: "MD" },
{ quote: "Our ROAS jumped from 1.8x to 4.3x in 60 days. They found leaks we didn't even know existed.", name: "Ava S.", role: "Beauty Brand CEO", initials: "AS" },
{ quote: "Best investment we've made. The audit alone saved us $8k/month in wasted spend.", name: "Daniel L.", role: "Info Product Creator", initials: "DL" },
{ quote: "Tracking cleanup + better creative iteration made our Meta spend predictable again.", name: "Jason R.", role: "E-commerce Brand Owner", initials: "JR" },
{ quote: "Pixel setup was a mess. After their attribution cleanup we could finally trust our numbers.", name: "Chris B.", role: "D2C Brand Operator", initials: "CB" },
{ quote: "We tried 4 agencies before AFM. None of them had this level of structure and data-driven thinking.", name: "Natalie W.", role: "Coaching Business Owner", initials: "NW" },
{ quote: "They turned a struggling TikTok campaign into our best-performing acquisition channel in just 45 days.", name: "Priya M.", role: "Lifestyle Brand", initials: "PM" }];


const WHAT_COVERED = [
{ title: "Full performance breakdown", desc: "of your current Meta & TikTok ad accounts — what's working, what's leaking budget." },
{ title: "Custom scaling roadmap", desc: "showing exactly how to increase spend while maintaining or improving ROAS." },
{ title: "Tracking & attribution audit", desc: "to fix pixel issues, UTM gaps, and data blind spots so you can trust your numbers." }];


// ============================================================
const ScalingStackLanding2: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    initMetaPixel();
    storeUTMs();
  }, []);

  const goToForm = () => navigate("/scaling-stack/apply");

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", WebkitFontSmoothing: "antialiased", background: "#fff", color: "#1a1a2e", minHeight: "100dvh" }}>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #f0f4ff 0%, #ffffff 100%)" }}>
        {/* Soft gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute rounded-full blur-[120px]" style={{ width: 500, height: 500, background: "rgba(99,179,237,0.12)", top: "-10%", left: "-10%" }} />
          <div className="absolute rounded-full blur-[100px]" style={{ width: 400, height: 400, background: "rgba(168,130,255,0.08)", bottom: "-5%", right: "-5%" }} />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 pt-12 sm:pt-16 pb-10 sm:pb-14 text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            
            <span className="text-[15px] font-bold tracking-tight text-center" style={{ color: "#1a1a2e" }}>AFM Digital</span>
          </div>

          {/* Badge */}
          <p className="inline-block text-[12px] sm:text-[13px] font-semibold uppercase tracking-wider mb-5 px-4 py-1.5 rounded-full"
          style={{ background: "rgba(66,153,225,0.1)", color: "#3182ce", border: "1px solid rgba(66,153,225,0.2)" }}>
            Free Strategy Session
          </p>

          {/* Heading */}
          <h1 className="text-[clamp(28px,7vw,52px)] font-black leading-[1.08] tracking-tight mb-4" style={{ color: "#1a1a2e" }}>
            Get a Free Breakdown of Your{" "}
            <span style={{ color: "#3182ce" }}>Ad Performance</span>
          </h1>

          {/* Sub */}
          <p className="text-[15px] sm:text-[17px] leading-relaxed max-w-lg mx-auto mb-8" style={{ color: "#64748b" }}>
            We'll walk through your current Meta & TikTok setup, find the gaps, and show you exactly how to scale profitably — on a free strategy call.
          </p>

          {/* CTA */}
          <button onClick={goToForm}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-[16px] sm:text-[17px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: "#3182ce", color: "#fff", boxShadow: "0 4px 14px rgba(49,130,206,0.4)" }}>
            Book Your Free Audit
            <span className="text-[18px]">→</span>
          </button>

          {/* Social proof line */}
          <div className="flex flex-col items-center gap-2 mt-6">
            <p className="text-[13px] italic" style={{ color: "#94a3b8" }}>"We scaled to $100k/mo in 3 months"</p>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold" style={{ color: "#1e293b" }}>4.9 rating from</span>
              <span className="text-[13px]" style={{ color: "#64748b" }}>80+ brands</span>
            </div>
            <Stars size={18} />
          </div>
        </div>
      </section>

      {/* ── SPEAKER / ABOUT ── */}
      <section className="py-12 sm:py-16" style={{ background: "#fff" }}>
        <div className="max-w-2xl mx-auto px-5 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-wider mb-4" style={{ color: "#3182ce" }}>Who We Are</p>
          <p className="text-[16px] sm:text-[18px] leading-relaxed mb-6" style={{ color: "#334155" }}>
            We're <strong>AFM Digital</strong> — a performance marketing agency that's generated <strong>$42M+ in client revenue</strong> across Meta, TikTok & Google. We've managed <strong>$12M+ in ad spend</strong> for 80+ brands.
          </p>
          <p className="text-[15px] leading-relaxed mb-8" style={{ color: "#64748b" }}>
            Most agencies guess. We use structured creative testing, clean attribution, and scaling protocols to grow your revenue predictably. No vanity metrics — just results.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
            { val: "$42M+", label: "Revenue" },
            { val: "400%+", label: "Avg ROAS" },
            { val: "80+", label: "Brands" }].
            map((s) =>
            <div key={s.label} className="text-center">
                <div className="text-[22px] sm:text-[26px] font-black" style={{ color: "#1a1a2e" }}>{s.val}</div>
                <div className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color: "#94a3b8" }}>{s.label}</div>
              </div>
            )}
          </div>

          {/* Checkmarks */}
          <div className="flex flex-col items-start gap-3 mt-10 max-w-sm mx-auto text-left">
            {["Scale your ads profitably", "Fix your tracking & attribution", "Get a clear, custom roadmap"].map((t) =>
            <div key={t} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold" style={{ background: "#dcfce7", color: "#16a34a" }}>✓</span>
                <span className="text-[15px]" style={{ color: "#334155" }}>{t}</span>
              </div>
            )}
          </div>

          <button onClick={goToForm}
          className="mt-8 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-[16px] font-bold transition-all hover:-translate-y-0.5"
          style={{ background: "#3182ce", color: "#fff", boxShadow: "0 4px 14px rgba(49,130,206,0.4)" }}>
            Get Your Free Audit →
          </button>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-12 sm:py-16" style={{ background: "#f8fafc" }}>
        <div className="max-w-3xl mx-auto px-5">
          <p className="text-center text-[13px] font-semibold uppercase tracking-wider mb-8" style={{ color: "#3182ce" }}>What Our Clients Say</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t) =>
            <div key={t.name} className="flex flex-col p-5 rounded-2xl" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                <Stars size={14} />
                <p className="text-[14px] leading-relaxed mt-3 mb-4 flex-1" style={{ color: "#334155" }}>"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
                style={{ background: "rgba(49,130,206,0.1)", color: "#3182ce" }}>{t.initials}</div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "#1e293b" }}>{t.name}</div>
                    <div className="text-[11px]" style={{ color: "#94a3b8" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── WHAT WE COVER ── */}
      <section className="py-12 sm:py-16" style={{ background: "#fff" }}>
        <div className="max-w-2xl mx-auto px-5">
          <p className="text-center text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#3182ce" }}>Here's What We'll Cover</p>
          <p className="text-center text-[16px] sm:text-[18px] leading-relaxed mb-8 max-w-lg mx-auto" style={{ color: "#64748b" }}>
            On your free strategy call, we'll give you a complete breakdown of your ads — and a clear plan forward.
          </p>
          <div className="flex flex-col gap-4">
            {WHAT_COVERED.map((item, i) =>
            <div key={i} className="flex gap-4 p-5 rounded-2xl" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[14px]"
              style={{ background: "#3182ce", color: "#fff" }}>{i + 1}</span>
                <div>
                  <p className="text-[15px] font-bold mb-1" style={{ color: "#1e293b" }}>{item.title}</p>
                  <p className="text-[14px] leading-relaxed" style={{ color: "#64748b" }}>{item.desc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%)" }}>
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-[clamp(24px,5vw,40px)] font-black leading-tight mb-4" style={{ color: "#1a1a2e" }}>
            Ready to stop guessing<br />and start scaling?
          </h2>
          <p className="text-[15px] sm:text-[16px] leading-relaxed mb-8 max-w-md mx-auto" style={{ color: "#64748b" }}>
            Book your free strategy call. We'll audit your setup and give you a clear plan — no strings attached.
          </p>
          <button onClick={goToForm}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-5 rounded-xl text-[17px] font-bold transition-all hover:-translate-y-0.5"
          style={{ background: "#3182ce", color: "#fff", boxShadow: "0 4px 20px rgba(49,130,206,0.4)" }}>
            Book Your Free Audit
            <span className="text-[20px]">→</span>
          </button>
          <p className="mt-4 text-[13px]" style={{ color: "#94a3b8" }}>No commitment · Takes 2 minutes</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #e2e8f0", background: "#fff" }}>
        <div className="max-w-3xl mx-auto px-5 py-6">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              
              <span className="text-[12px] font-semibold" style={{ color: "#1e293b" }}>AFM Digital Agency</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]" style={{ color: "#94a3b8" }}>
              <a href="/scaling-stack/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
              <a href="/scaling-stack/terms" className="hover:text-gray-600 transition-colors">Terms</a>
              <span>© 2025 AFM Digital</span>
            </div>
          </div>
        </div>
      </footer>
    </div>);

};

export default ScalingStackLanding2;