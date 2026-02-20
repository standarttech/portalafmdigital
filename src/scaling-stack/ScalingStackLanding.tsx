import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ssLogo from "@/assets/ss-logo-afm.png";
import "./ss.css";

// ============================================================
//  DATA
// ============================================================
const STATS = [
{ value: "$42M+", label: "Client Revenue Generated" },
{ value: "$12M+", label: "Ad Spend Managed" },
{ value: "80+", label: "Growth Projects" },
{ value: "400%+", label: "Average ROAS" }];


const SERVICES = [
{ icon: "📈", title: "Meta & TikTok Ads", desc: "Performance-first media buying on the platforms that move product. We optimize for ROAS, CAC, and LTV — not vanity metrics." },
{ icon: "🧪", title: "Creative Testing Framework", desc: "Systematic creative iteration that cuts CPM and finds winning angles faster. No more guessing what creative works." },
{ icon: "🎯", title: "Clean Tracking & Attribution", desc: "Server-side events, UTM hygiene, and pixel audits so your data reflects reality — not platform noise." },
{ icon: "🚀", title: "Scaling Systems", desc: "Structured budget scaling protocols that maintain efficiency as you grow. From $10k/month to $100k+ without the chaos." }];


const CASES = [
{ client: "Lapin Group", category: "Info Product / Webinar", metric: "29,871", detail: "webinar registrations in one week" },
{ client: "Kelner Homes", category: "Real Estate", metric: "$2.5M+", detail: "revenue generated in 3 months" },
{ client: "Hyper Cyber", category: "E-commerce", metric: "+343%", detail: "increase in monthly Shopify revenue" },
{ client: "Market Guru", category: "Info Product", metric: "$1.3M", detail: "revenue with evergreen webinar funnel" },
{ client: "Thomas Kralow", category: "Education / VSL", metric: "171K+", detail: "revenue with VSL funnel in 2 months" },
{ client: "Multifamily Expert", category: "Real Estate", metric: "1300%", detail: "live webinar ROAS from campaigns" },
{ client: "RICHE", category: "Cosmetics E-com", metric: "512%", detail: "average ROAS for cosmetic brand" },
{ client: "Eurosport", category: "Sports / Media", metric: "22,272", detail: "live broadcast subscriptions in 3 weeks" }];


const ALL_TESTIMONIALS = [
{ quote: "AFM brought structure to our testing. CPA stabilized and we finally had a repeatable way to scale.", name: "Sarah M.", role: "DTC Skincare Founder", initials: "SM" },
{ quote: "Tracking cleanup + better creative iteration made our Meta spend predictable again. We finally know what's working.", name: "Jason R.", role: "E-commerce Brand Owner", initials: "JR" },
{ quote: "Clear communication, fast execution, and actual performance thinking. They move like an in-house team.", name: "Emily T.", role: "Info-product Operator", initials: "ET" },
{ quote: "We scaled from $15k/mo to $80k/mo in three months without killing our ROAS. The system they built just works.", name: "Marcus D.", role: "Supplements Brand", initials: "MD" },
{ quote: "Finally an agency that doesn't hide behind vanity metrics. Our actual revenue numbers moved up significantly.", name: "Olivia K.", role: "DTC Fashion Brand", initials: "OK" },
{ quote: "The creative testing process they introduced changed everything. We went from burning creatives to having a real system.", name: "Ryan P.", role: "Ecom Founder", initials: "RP" },
{ quote: "Our ROAS jumped from 1.8x to 4.2x in 60 days. They found leaks we didn't even know existed in our funnel.", name: "Ava S.", role: "Beauty Brand CEO", initials: "AS" },
{ quote: "Best investment we've made. The audit alone gave us three immediate fixes that saved us $8k/month in wasted spend.", name: "Daniel L.", role: "Info Product Creator", initials: "DL" },
{ quote: "We tried 4 agencies before AFM. None of them had this level of structure and data-driven thinking.", name: "Natalie W.", role: "Coaching Business Owner", initials: "NW" },
{ quote: "Pixel setup was a mess. After their attribution cleanup we could actually trust our numbers for the first time.", name: "Chris B.", role: "D2C Brand Operator", initials: "CB" },
{ quote: "Scaled our webinar funnel from $5k/day to $25k/day while keeping CPR under $12. Insane results.", name: "Michael F.", role: "Online Educator", initials: "MF" },
{ quote: "Every decision they make is backed by data. No fluff, no excuses — just results. That's what we needed.", name: "Jessica N.", role: "SaaS Founder", initials: "JN" },
{ quote: "Our Meta account kept getting restricted before AFM. With their whitelisted accounts, we haven't had a single issue.", name: "Kevin T.", role: "Health Supplements", initials: "KT" },
{ quote: "They turned a struggling TikTok campaign into our best-performing acquisition channel in just 45 days.", name: "Priya M.", role: "Lifestyle Brand", initials: "PM" },
{ quote: "Real estate lead cost dropped 62%. We're now getting qualified appointments at under $40 each.", name: "James H.", role: "Real Estate Agency", initials: "JH" },
{ quote: "The transparency alone sets them apart. Weekly reporting that actually tells you what's happening with your money.", name: "Lauren C.", role: "E-commerce Director", initials: "LC" }];


const INITIAL_TESTIMONIALS = 8;

const WHO_FOR = [
{ icon: "🛍️", title: "E-commerce Brands", desc: "DTC brands spending $10k–$200k/month on paid ads who want more efficient scaling." },
{ icon: "🎓", title: "Info Products & Coaches", desc: "Course creators and coaches running webinar or VSL funnels looking to lower CPL." },
{ icon: "📊", title: "Performance Advertisers", desc: "Brands who already run ads and need a smarter system — not more spend." }];


// ============================================================
//  HOOKS
// ============================================================
function useCountUp(target: string, trigger: boolean) {
  const [display, setDisplay] = useState("0");
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!trigger) return;
    const num = parseFloat(target.replace(/[^0-9.]/g, ""));
    if (isNaN(num)) {setDisplay(target);return;}
    const duration = 1800;
    const start = performance.now();
    const prefix = target.match(/^\D+/)?.[0] || "";
    const suffix = target.match(/[^0-9.]+$/)?.[0] || "";
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = num * eased;
      const formatted = num >= 1000 ? Math.round(current).toLocaleString() : current.toFixed(num % 1 !== 0 ? 1 : 0);
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {if (rafRef.current) cancelAnimationFrame(rafRef.current);};
  }, [trigger, target]);
  return display;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {if (entry.isIntersecting) setInView(true);}, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ============================================================
//  PARTICLES
// ============================================================
interface Particle {x: number;y: number;vx: number;vy: number;radius: number;opacity: number;}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  const init = useCallback((w: number, h: number) => {
    const count = Math.floor(w * h / 20000);
    particles.current = Array.from({ length: Math.min(count, 50) }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      radius: Math.random() * 1.4 + 0.4, opacity: Math.random() * 0.35 + 0.08
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {canvas.width = window.innerWidth;canvas.height = window.innerHeight;init(canvas.width, canvas.height);};
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particles.current;
      ps.forEach((p) => {
        p.x += p.vx;p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99,179,237,${p.opacity})`;ctx.fill();
      });
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx = ps[i].x - ps[j].x;const dy = ps[i].y - ps[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();ctx.moveTo(ps[i].x, ps[i].y);ctx.lineTo(ps[j].x, ps[j].y);
            ctx.strokeStyle = `rgba(99,179,237,${0.07 * (1 - dist / 110)})`;ctx.lineWidth = 0.5;ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {window.removeEventListener("resize", resize);cancelAnimationFrame(animRef.current);};
  }, [init]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.55 }} />;
}

// ============================================================
//  SMALL COMPONENTS
// ============================================================
function Stars() {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) =>
      <svg key={i} width="13" height="13" viewBox="0 0 20 20" fill="currentColor" className="text-yellow-400">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
    </div>);

}

function StatCard({ value, label, trigger }: {value: string;label: string;trigger: boolean;}) {
  const display = useCountUp(value, trigger);
  return (
    <div className="text-center py-8 px-4 sm:p-8">
      <div className="text-3xl sm:text-4xl md:text-5xl font-black mb-2 tabular-nums" style={{ color: "hsl(0 0% 98%)", textShadow: "0 0 40px rgba(99,179,237,0.4)" }}>{display}</div>
      <div className="text-[11px] font-medium uppercase tracking-widest leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</div>
    </div>);

}

function FadeSection({ children, className = "" }: {children: React.ReactNode;className?: string;}) {
  const { ref, inView } = useInView(0.06);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: {children: React.ReactNode;}) {
  return (
    <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] font-semibold mb-4" style={{ color: "rgba(99,179,237,0.9)" }}>
      <span className="w-4 h-px" style={{ background: "rgba(99,179,237,0.7)" }} />
      {children}
      <span className="w-4 h-px" style={{ background: "rgba(99,179,237,0.7)" }} />
    </p>);

}

function TestimonialCard({ quote, name, role, initials }: {quote: string;name: string;role: string;initials: string;}) {
  return (
    <div className="flex flex-col p-5 sm:p-6 rounded-2xl transition-all duration-300 backdrop-blur-sm" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
      <Stars />
      <p className="text-[14px] leading-relaxed mt-3 mb-5 flex-1 italic" style={{ color: "rgba(255,255,255,0.75)" }}>"{quote}"</p>
      <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[12px]" style={{ background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.3)", color: "rgba(99,179,237,0.9)" }}>{initials}</div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "hsl(0 0% 98%)" }}>{name}</div>
          <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>{role}</div>
        </div>
      </div>
    </div>);

}

// ============================================================
//  MAIN
// ============================================================
const ScalingStackLanding: React.FC = () => {
  const navigate = useNavigate();
  const { ref: statsRef, inView: statsInView } = useInView(0.3);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllTestimonials, setShowAllTestimonials] = useState(false);

  const goToForm = () => navigate("/scaling-stack/apply");

  const visibleTestimonials = showAllTestimonials ? ALL_TESTIMONIALS : ALL_TESTIMONIALS.slice(0, INITIAL_TESTIMONIALS);
  const glowBlue = "rgba(99,179,237,0.16)";
  const glowBlueBright = "rgba(99,179,237,0.32)";

  return (
    <div className="ss-root overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
      style={{ background: "rgba(8,11,20,0.88)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ssLogo} alt="AFM Digital Agency" className="h-7 sm:h-8 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-6 lg:gap-8 text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#results" className="hover:text-white transition-colors">Results</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <button onClick={goToForm} className="ml-2 px-5 py-2.5 rounded-full text-[13px] font-semibold transition-all hover:scale-[1.02]"
            style={{ background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.35)", color: "rgba(99,179,237,1)" }}>
              Get Free Audit →
            </button>
          </div>
          <button className="md:hidden p-2 -mr-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            <div className={`w-5 h-0.5 bg-white mb-1.5 transition-all duration-200 origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <div className={`w-5 h-0.5 bg-white mb-1.5 transition-all duration-200 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
            <div className={`w-5 h-0.5 bg-white transition-all duration-200 origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
        {menuOpen &&
        <div className="md:hidden border-t border-white/[0.06] px-4 py-6 space-y-4" style={{ background: "rgba(8,11,20,0.97)" }}>
            {["Services", "Results", "About"].map((item) =>
          <a key={item} href={`#${item.toLowerCase()}`} className="block text-[15px] font-medium py-1 transition-colors"
          style={{ color: "rgba(255,255,255,0.7)" }} onClick={() => setMenuOpen(false)}>{item}</a>
          )}
            <button onClick={() => {setMenuOpen(false);goToForm();}} className="w-full py-3.5 rounded-xl text-[15px] font-semibold mt-2"
          style={{ background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.35)", color: "rgba(99,179,237,1)" }}>
              Get Free Audit →
            </button>
          </div>
        }
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-14 sm:pt-16 overflow-hidden">
        <ParticleCanvas />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute rounded-full blur-[120px] sm:blur-[140px]"
          style={{ width: "min(700px, 120vw)", height: "min(700px, 120vw)", background: glowBlue, top: "-20%", left: "-20%", opacity: 0.55 }} />
          <div className="absolute rounded-full blur-[100px] sm:blur-[120px]"
          style={{ width: "min(500px, 90vw)", height: "min(500px, 90vw)", background: glowBlue, bottom: "-10%", right: "-10%", opacity: 0.45 }} />
          <div className="absolute rounded-full blur-[60px] sm:blur-[80px]"
          style={{ width: "min(250px, 60vw)", height: "min(250px, 60vw)", background: glowBlueBright, top: "35%", right: "10%", opacity: 0.25 }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-6 text-center py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-[12px] font-medium mb-6 sm:mb-8"
          style={{ border: "1px solid rgba(99,179,237,0.25)", background: "rgba(99,179,237,0.08)", color: "rgba(99,179,237,0.85)", animation: "ss-fade-up 0.6s ease both" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            Authorized Meta · TikTok · Google Partner
          </div>

          <h1 className="text-[clamp(36px,8vw,88px)] font-black leading-[1.02] tracking-tight mb-5 sm:mb-6"
          style={{ animation: "ss-fade-up 0.7s 0.1s ease both", color: "hsl(0 0% 98%)" }}>
            Scale Your Ads.<br />
            <span style={{ background: "linear-gradient(135deg, #63b3ed 0%, #90cdf4 40%, #63b3ed 70%, #4299e1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Keep Your ROAS.
            </span>
          </h1>

          <p className="text-[clamp(15px,2.5vw,19px)] max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10"
          style={{ color: "rgba(255,255,255,0.6)", animation: "ss-fade-up 0.7s 0.2s ease both" }}>
            We help e-commerce and info-product brands unlock profitable traffic across Meta &amp; TikTok — with disciplined testing, clean tracking, and creative systems built to scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14"
          style={{ animation: "ss-fade-up 0.7s 0.3s ease both" }}>
            <button onClick={goToForm} className="group w-full sm:w-auto px-8 py-4 rounded-2xl text-[16px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #4299e1, #63b3ed)", color: "#fff", boxShadow: "0 0 40px rgba(99,179,237,0.35), 0 4px 20px rgba(0,0,0,0.3)" }}>
              Get a Free Ads Audit
              <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
            <a href="#results" className="w-full sm:w-auto px-8 py-4 rounded-2xl text-[16px] font-medium text-center transition-all hover:bg-white/[0.06] active:scale-[0.98]"
            style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.75)" }}>
              See Results
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[12px] sm:text-[13px]"
          style={{ color: "rgba(255,255,255,0.4)", animation: "ss-fade-up 0.7s 0.4s ease both" }}>
            <span className="flex items-center gap-1.5"><span className="text-yellow-400">★★★★★</span> 4.9 client rating</span>
            <span className="hidden sm:block w-px h-4 bg-white/15" />
            <span>$42M+ in client revenue</span>
            <span className="hidden sm:block w-px h-4 bg-white/15" />
            <span>80+ brands scaled</span>
          </div>
        </div>

        





      </section>

      {/* ── STATS ── */}
      <section className="relative border-y" style={{ borderColor: "rgba(99,179,237,0.1)", background: "rgba(99,179,237,0.04)" }}>
        <div ref={statsRef} className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ "--tw-divide-opacity": "0.1" } as React.CSSProperties}>
            {STATS.map((s) => <StatCard key={s.label} value={s.value} label={s.label} trigger={statsInView} />)}
          </div>
        </div>
      </section>

      {/* ── PARTNERSHIPS ── */}
      <FadeSection className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 text-center">
          <SectionLabel>Official Whitelisted Partner</SectionLabel>
          <div className="flex items-center justify-center gap-8 sm:gap-16 md:gap-20 flex-wrap mb-8">
            {["Meta", "TikTok", "Google"].map((p) =>
            <div key={p} className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: "rgba(255,255,255,0.18)" }}>{p}</div>
            )}
          </div>
          <div className="max-w-xl mx-auto text-[14px] leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
            As authorized agency partners, we operate through{" "}
            <span className="font-semibold" style={{ color: "rgba(99,179,237,0.9)" }}>exclusive whitelisted ad accounts</span>{" "}
            — giving clients priority support, faster approvals, and advantages unavailable to regular advertisers.
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {["No More Bans", "New Feature Access", "Private Support", "Fastest Moderation", "No Spending Limits"].map((b) =>
            <span key={b} className="px-3.5 py-1.5 rounded-full text-[12px] font-medium"
            style={{ border: "1px solid rgba(99,179,237,0.2)", color: "rgba(99,179,237,0.75)", background: "rgba(99,179,237,0.06)" }}>
                ✓ {b}
              </span>
            )}
          </div>
        </div>
      </FadeSection>

      {/* ── SERVICES ── */}
      <section id="services" className="py-14 sm:py-24 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(99,179,237,0.025)" }} />
        <FadeSection>
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="text-center mb-10 sm:mb-12">
              <SectionLabel>What We Do</SectionLabel>
              <h2 className="text-[clamp(26px,5vw,48px)] font-black leading-tight" style={{ color: "hsl(0 0% 98%)" }}>
                A system built for performance.<br className="hidden sm:block" /> Not promises.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SERVICES.map((s) =>
              <div key={s.title} className="group p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-default"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", backdropFilter: "blur(10px)" }}>
                  <div className="text-3xl mb-4">{s.icon}</div>
                  <h3 className="text-[17px] sm:text-[18px] font-bold mb-2" style={{ color: "hsl(0 0% 98%)" }}>{s.title}</h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{s.desc}</p>
                </div>
              )}
            </div>
            <div className="text-center mt-8 sm:mt-10">
              <button onClick={goToForm} className="w-full sm:w-auto px-8 py-4 rounded-2xl text-[15px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #4299e1, #63b3ed)", color: "#fff", boxShadow: "0 0 30px rgba(99,179,237,0.3)" }}>
                Apply to Work With Us →
              </button>
            </div>
          </div>
        </FadeSection>
      </section>

      {/* ── WHO IT'S FOR ── */}
      <FadeSection className="py-14 sm:py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <SectionLabel>Who We Work With</SectionLabel>
            <h2 className="text-[clamp(26px,5vw,48px)] font-black leading-tight" style={{ color: "hsl(0 0% 98%)" }}>
              Built for brands ready to scale profitably
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {WHO_FOR.map((item) =>
            <div key={item.title} className="p-6 sm:p-7 rounded-2xl text-center transition-all hover:-translate-y-1"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-[17px] font-bold mb-2" style={{ color: "hsl(0 0% 98%)" }}>{item.title}</h3>
                <p className="text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{item.desc}</p>
              </div>
            )}
          </div>
        </div>
      </FadeSection>

      {/* ── CASE STUDIES ── */}
      <section id="results" className="py-14 sm:py-24 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(99,179,237,0.025)" }} />
        <FadeSection>
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="text-center mb-10 sm:mb-12">
              <SectionLabel>Proven Results</SectionLabel>
              <h2 className="text-[clamp(26px,5vw,48px)] font-black leading-tight" style={{ color: "hsl(0 0% 98%)" }}>Numbers that speak for themselves</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CASES.map((c) =>
              <div key={c.client} className="group p-5 sm:p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
              style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: "rgba(99,179,237,0.7)" }}>{c.category}</div>
                  <div className="text-[32px] sm:text-[36px] font-black leading-none mb-2 tabular-nums" style={{ color: "hsl(0 0% 98%)", textShadow: "0 0 30px rgba(99,179,237,0.3)" }}>{c.metric}</div>
                  <div className="text-[13px] mb-4 leading-snug" style={{ color: "rgba(255,255,255,0.5)" }}>{c.detail}</div>
                  <div className="pt-3 border-t text-[12px] font-semibold" style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>{c.client}</div>
                </div>
              )}
            </div>
            <div className="text-center mt-8 sm:mt-10">
              <button onClick={goToForm} className="w-full sm:w-auto px-8 py-4 rounded-2xl text-[15px] font-bold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ border: "1px solid rgba(99,179,237,0.35)", color: "rgba(99,179,237,1)", background: "rgba(99,179,237,0.08)" }}>
                Get Your Free Audit →
              </button>
            </div>
          </div>
        </FadeSection>
      </section>

      {/* ── HOW WE WORK ── */}
      <FadeSection className="py-14 sm:py-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <SectionLabel>Our Process</SectionLabel>
            <h2 className="text-[clamp(26px,5vw,48px)] font-black leading-tight" style={{ color: "hsl(0 0% 98%)" }}>How we scale your ads</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
            { step: "01", title: "Audit", desc: "We analyze your pixel, tracking, creative, and targeting. Identify what's wasting money." },
            { step: "02", title: "Strategy", desc: "We build a custom scaling roadmap based on your goals, budget, and funnel structure." },
            { step: "03", title: "Launch", desc: "We test systematically — creatives, audiences, offers — using our proven testing framework." },
            { step: "04", title: "Scale", desc: "Once we have winners, we scale with confidence. More budget, same efficiency, zero chaos." }].
            map((item) =>
            <div key={item.step} className="p-6 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[28px] sm:text-[32px] font-black mb-3 tabular-nums" style={{ color: "rgba(99,179,237,0.28)" }}>{item.step}</div>
                <h3 className="text-[17px] font-bold mb-2" style={{ color: "hsl(0 0% 98%)" }}>{item.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{item.desc}</p>
              </div>
            )}
          </div>
        </div>
      </FadeSection>

      {/* ── TESTIMONIALS ── */}
      <section className="py-14 sm:py-24 relative" style={{ background: "rgba(99,179,237,0.025)" }}>
        <FadeSection>
          <div className="max-w-6xl mx-auto px-5 sm:px-6">
            <div className="text-center mb-10 sm:mb-12">
              <SectionLabel>Client Feedback</SectionLabel>
              <h2 className="text-[clamp(26px,5vw,48px)] font-black leading-tight" style={{ color: "hsl(0 0% 98%)" }}>What our clients say</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {visibleTestimonials.map((t) => <TestimonialCard key={t.name} {...t} />)}
            </div>
            {!showAllTestimonials &&
            <div className="text-center mt-8 sm:mt-10">
                <button onClick={() => setShowAllTestimonials(true)} className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-[14px] font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.98]"
              style={{ border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.04)" }}>
                  Load More Reviews ({ALL_TESTIMONIALS.length - INITIAL_TESTIMONIALS} more)
                </button>
              </div>
            }
          </div>
        </FadeSection>
      </section>

      {/* ── FOUNDERS ── */}
      <section id="about" className="py-14 sm:py-24">
        <FadeSection>
          <div className="max-w-4xl mx-auto px-5 sm:px-6">
            <div className="p-7 sm:p-10 md:p-12 rounded-3xl relative overflow-hidden"
            style={{ border: "1px solid rgba(99,179,237,0.2)", background: "rgba(99,179,237,0.06)" }}>
              <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 rounded-full blur-[80px] pointer-events-none"
              style={{ background: "rgba(99,179,237,0.12)" }} />
              <SectionLabel>From the Founders</SectionLabel>
              <blockquote className="text-[clamp(16px,2.5vw,21px)] font-semibold leading-relaxed mb-8 relative z-10"
              style={{ color: "rgba(255,255,255,0.85)" }}>
                "After 11 years in paid traffic and funnel optimization, we've seen how most agencies operate — they scale their client list, not their clients' results. We built AFM to do things differently.
                <br /><br />
                Every decision we make is driven by data. CPL, CPA, ROAS, and the full customer journey. We win only when you do."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {["DI", "DY"].map((init) =>
                  <div key={init} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 text-[11px] font-bold"
                  style={{ background: "rgba(99,179,237,0.15)", borderColor: "rgba(99,179,237,0.3)", color: "rgba(99,179,237,0.9)" }}>{init}</div>
                  )}
                </div>
                <div>
                  <div className="text-[14px] font-semibold" style={{ color: "hsl(0 0% 98%)" }}>Denis Ishimov &amp; Danil Yussupov</div>
                  <div className="text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>Founders, AFM Digital Agency</div>
                </div>
              </div>
            </div>
          </div>
        </FadeSection>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 sm:py-32 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full blur-[120px] sm:blur-[160px]"
          style={{ width: "min(600px,120vw)", height: "min(600px,120vw)", background: "rgba(99,179,237,0.11)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
        </div>
        <ParticleCanvas />
        <FadeSection>
          <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-6 text-center">
            <SectionLabel>Ready to Scale?</SectionLabel>
            <h2 className="text-[clamp(28px,5.5vw,58px)] font-black leading-tight mb-5 sm:mb-6" style={{ color: "hsl(0 0% 98%)" }}>
              Ready to scale without<br />killing your ROAS?
            </h2>
            <p className="text-[16px] sm:text-[17px] leading-relaxed mb-8 sm:mb-10 max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.55)" }}>
              Get a free ads audit where we walk through your current setup and identify the exact levers to pull for profitable scaling.
            </p>
            <button onClick={goToForm} className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl text-[16px] sm:text-[17px] font-bold transition-all hover:-translate-y-1 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #4299e1, #63b3ed)", color: "#fff", boxShadow: "0 0 60px rgba(99,179,237,0.4), 0 4px 30px rgba(0,0,0,0.4)" }}>
              Get Your Free Audit
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
            <p className="mt-4 text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>No commitment · Takes 2 minutes</p>
          </div>
        </FadeSection>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={ssLogo} alt="AFM Digital Agency" className="h-7 w-auto" />
              <span className="text-[13px] font-semibold" style={{ color: "hsl(0 0% 98%)" }}>AFM Digital Agency</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <a href="/scaling-stack/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/scaling-stack/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <span className="hidden sm:block">© 2025 AFM Digital Agency · All rights reserved</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              Meta · TikTok · Google Partner
            </div>
            <p className="sm:hidden text-[11px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>© 2025 AFM Digital Agency · All rights reserved</p>
          </div>
        </div>
      </footer>
    </div>);

};

export default ScalingStackLanding;