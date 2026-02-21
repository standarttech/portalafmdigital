import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ssLogo from "@/assets/ss-logo-afm.png";
import "./ss.css";

// ---- Meta Pixel ----
function initMetaPixel() {
  if (typeof window === "undefined") return;
  const win = window as any;
  if (win.fbq) return;
  const n: any = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
  if (!win._fbq) win._fbq = n;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
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
  keys.forEach((k) => { const v = params.get(k); if (v) result[k] = v; });
  if (Object.keys(result).length > 0) sessionStorage.setItem("afm_utm", JSON.stringify(result));
}

// ---- useInView ----
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number; }) {
  const { ref, inView } = useInView(0.08);
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ${delay}ms ease, transform 0.6s ${delay}ms ease`,
    }}>
      {children}
    </div>
  );
}

// ---- DATA ----
const TESTIMONIALS = [
  { quote: "AFM brought structure to our testing. CPA stabilized and we finally had a repeatable way to scale.", name: "Sarah M.", role: "DTC Skincare Founder", initials: "SM" },
  { quote: "Tracking cleanup + better creative iteration made our Meta spend predictable again.", name: "Jason R.", role: "E-commerce Brand Owner", initials: "JR" },
  { quote: "We scaled from $15k/mo to $80k/mo in three months without killing our ROAS.", name: "Marcus D.", role: "Supplements Brand", initials: "MD" },
  { quote: "Our ROAS jumped from 1.8x to 4.2x in 60 days. They found leaks we didn't even know existed.", name: "Ava S.", role: "Beauty Brand CEO", initials: "AS" },
  { quote: "Best investment we've made. The audit alone saved us $8k/month in wasted spend.", name: "Daniel L.", role: "Info Product Creator", initials: "DL" },
  { quote: "Pixel setup was a mess. After their attribution cleanup we could finally trust our numbers.", name: "Chris B.", role: "D2C Brand Operator", initials: "CB" },
];

const WHAT_YOU_GET = [
  { icon: "📊", title: "Full Ads Audit", desc: "We analyze your current ad accounts, creative performance, tracking setup, and funnel metrics." },
  { icon: "🎯", title: "Custom Scaling Plan", desc: "A step-by-step roadmap to increase ad spend while maintaining or improving your ROAS." },
  { icon: "🔧", title: "Tracking & Attribution Fix", desc: "We identify and fix pixel issues, UTM gaps, and attribution blind spots in your setup." },
];

// ---- Stars ----
function Stars() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-yellow-400">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ============================================================
//  MAIN COMPONENT
// ============================================================
const ScalingStackLanding2: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    initMetaPixel();
    storeUTMs();
  }, []);

  const goToForm = () => navigate("/scaling-stack/apply");

  return (
    <div className="ss-root overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
        style={{ background: "rgba(8,11,20,0.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ssLogo} alt="AFM Digital" className="h-7 sm:h-8 w-auto" />
            <span className="text-[14px] sm:text-[15px] font-bold tracking-tight" style={{ color: "hsl(0 0% 98%)" }}>AFM Digital</span>
          </div>
          <button onClick={goToForm} className="px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:scale-[1.02]"
            style={{ background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.35)", color: "rgba(99,179,237,1)" }}>
            Get Free Audit →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-16 pb-12 overflow-hidden">
        {/* BG orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute rounded-full blur-[120px]" style={{ width: "min(600px,110vw)", height: "min(600px,110vw)", background: "rgba(99,179,237,0.14)", top: "-15%", left: "-15%", opacity: 0.5 }} />
          <div className="absolute rounded-full blur-[100px]" style={{ width: "min(400px,80vw)", height: "min(400px,80vw)", background: "rgba(99,179,237,0.12)", bottom: "-10%", right: "-10%", opacity: 0.4 }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] sm:text-[12px] font-medium mb-6"
            style={{ border: "1px solid rgba(99,179,237,0.25)", background: "rgba(99,179,237,0.08)", color: "rgba(99,179,237,0.85)", animation: "ss-fade-up 0.6s ease both" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            Free Strategy Session
          </div>

          <h1 className="text-[clamp(30px,7vw,64px)] font-black leading-[1.05] tracking-tight mb-5"
            style={{ animation: "ss-fade-up 0.7s 0.1s ease both", color: "hsl(0 0% 98%)" }}>
            Get a Free Breakdown of{" "}
            <span style={{ background: "linear-gradient(135deg, #63b3ed, #90cdf4, #4299e1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Your Ad Performance
            </span>
          </h1>

          <p className="text-[clamp(15px,2.5vw,18px)] max-w-xl mx-auto leading-relaxed mb-8"
            style={{ color: "rgba(255,255,255,0.6)", animation: "ss-fade-up 0.7s 0.2s ease both" }}>
            We'll walk through your current Meta & TikTok setup, find the gaps, and show you exactly how to scale profitably — on a free strategy call.
          </p>

          <div style={{ animation: "ss-fade-up 0.7s 0.3s ease both" }}>
            <button onClick={goToForm} className="group w-full sm:w-auto px-8 py-4 rounded-2xl text-[16px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #4299e1, #63b3ed)", color: "#fff", boxShadow: "0 0 40px rgba(99,179,237,0.35), 0 4px 20px rgba(0,0,0,0.3)" }}>
              Book Your Free Audit
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[12px] mt-8"
            style={{ color: "rgba(255,255,255,0.4)", animation: "ss-fade-up 0.7s 0.4s ease both" }}>
            <span className="flex items-center gap-1.5"><span className="text-yellow-400">★★★★★</span> 4.9 rating</span>
            <span className="hidden sm:block w-px h-4 bg-white/15" />
            <span>$42M+ client revenue</span>
            <span className="hidden sm:block w-px h-4 bg-white/15" />
            <span>80+ brands scaled</span>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section style={{ background: "rgba(99,179,237,0.04)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <p className="text-center text-[12px] font-medium uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>Trusted by brands spending $10k–$200k/mo on ads</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { val: "$42M+", label: "Revenue Generated" },
              { val: "400%+", label: "Average ROAS" },
              { val: "80+", label: "Brands Scaled" },
              { val: "$12M+", label: "Ad Spend Managed" },
            ].map((s) => (
              <div key={s.label} className="py-3">
                <div className="text-xl sm:text-2xl font-black" style={{ color: "hsl(0 0% 98%)" }}>{s.val}</div>
                <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <FadeIn className="py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[11px] uppercase tracking-[0.15em] font-semibold mb-3" style={{ color: "rgba(99,179,237,0.9)" }}>What You Get</p>
          <h2 className="text-center text-[clamp(24px,5vw,42px)] font-black leading-tight mb-10" style={{ color: "hsl(0 0% 98%)" }}>
            Here's what we'll cover on the call
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {WHAT_YOU_GET.map((item) => (
              <div key={item.title} className="p-6 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="text-[16px] font-bold mb-2" style={{ color: "hsl(0 0% 98%)" }}>{item.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── TESTIMONIALS ── */}
      <FadeIn className="py-14 sm:py-20" delay={100}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6">
          <p className="text-center text-[11px] uppercase tracking-[0.15em] font-semibold mb-3" style={{ color: "rgba(99,179,237,0.9)" }}>Client Results</p>
          <h2 className="text-center text-[clamp(24px,5vw,42px)] font-black leading-tight mb-10" style={{ color: "hsl(0 0% 98%)" }}>
            What our clients say
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col p-5 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
                <Stars />
                <p className="text-[14px] leading-relaxed mt-3 mb-4 flex-1 italic" style={{ color: "rgba(255,255,255,0.75)" }}>"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px]" style={{ background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.3)", color: "rgba(99,179,237,0.9)" }}>{t.initials}</div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "hsl(0 0% 98%)" }}>{t.name}</div>
                    <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── CTA ── */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full blur-[140px]" style={{ width: "min(500px,100vw)", height: "min(500px,100vw)", background: "rgba(99,179,237,0.1)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        </div>
        <FadeIn>
          <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-6 text-center">
            <h2 className="text-[clamp(26px,5vw,48px)] font-black leading-tight mb-5" style={{ color: "hsl(0 0% 98%)" }}>
              Ready to stop guessing<br />and start scaling?
            </h2>
            <p className="text-[16px] leading-relaxed mb-8 max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
              Book your free strategy call. We'll audit your setup and give you a clear plan — no strings attached.
            </p>
            <button onClick={goToForm} className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl text-[16px] sm:text-[17px] font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #4299e1, #63b3ed)", color: "#fff", boxShadow: "0 0 60px rgba(99,179,237,0.4), 0 4px 30px rgba(0,0,0,0.4)" }}>
              Get Your Free Audit
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
            <p className="mt-4 text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>No commitment · Takes 2 minutes</p>
          </div>
        </FadeIn>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2.5">
              <img src={ssLogo} alt="AFM Digital" className="h-6 w-auto" />
              <span className="text-[13px] font-semibold" style={{ color: "hsl(0 0% 98%)" }}>AFM Digital Agency</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <a href="/scaling-stack/privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="/scaling-stack/terms" className="hover:text-white transition-colors">Terms</a>
              <span>© 2025 AFM Digital Agency</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ScalingStackLanding2;
