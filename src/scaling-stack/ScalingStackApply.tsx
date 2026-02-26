import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ssLogo from "@/assets/ss-logo-afm.png";
import ssBg from "@/assets/ss-bg-gradient.jpg";
import ProgressBar from "./ProgressBar";
import OptionCard from "./OptionCard";
import "./ss.css";

// ---- Meta Pixel: PageView only (Lead is fired on /thanks) ----
function initMetaPixel() {
  if (typeof window === "undefined") return;
  const win = window as any;
  if (win.fbq) return;
  const n: any = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
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

// ---- UTM helpers ----
function getUTMParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
  const result: Record<string, string> = {};
  utmKeys.forEach((key) => {
    const val = params.get(key);
    if (val) result[key] = val;
  });
  const stored = sessionStorage.getItem("afm_utm");
  if (stored) {
    try { return { ...JSON.parse(stored), ...result }; } catch { /* ignore */ }
  }
  return result;
}

function storeUTMParams() {
  if (typeof window === "undefined") return;
  const utm = getUTMParams();
  if (Object.keys(utm).length > 0) sessionStorage.setItem("afm_utm", JSON.stringify(utm));
}

// ---- Phone formatting helpers ----
// Strips everything except digits
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

// Format US number: (XXX) XXX-XXXX
function formatUSPhone(digits: string): string {
  // Remove leading 1 if present
  const d = digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

function validatePhone(raw: string): string | null {
  const digits = digitsOnly(raw);
  const local = digits.startsWith("1") ? digits.slice(1) : digits;
  if (local.length === 0) return "Phone number is required.";
  if (local.length < 10) return "Phone number is too short — enter all 10 digits.";
  if (local.length > 10) return "Phone number is too long.";
  return null; // valid
}

// ---- Types ----
interface FormData {
  monthly_ad_spend: string;
  business_vertical: string;
  biggest_challenge: string;
  full_name: string;
  phone: string; // stored as raw formatted, sent with +1 prefix
  email: string;
}

interface ContactErrors {
  full_name?: string;
  phone?: string;
  email?: string;
}

// ---- Constants ----
const TOTAL_STEPS = 5;
const SPEND_OPTIONS = ["$5,000 – $10,000", "$10,000 – $50,000", "$50,000 – $100,000", "$100,000+"];
const VERTICAL_OPTIONS = ["E-COM Brand", "Info Product / Coaching", "Other Online Business"];

const TESTIMONIALS = [
  { quote: "AFM brought structure to our testing. CPA stabilized and we finally had a repeatable way to scale.", name: "Sarah M.", role: "DTC Skincare", initials: "SM" },
  { quote: "Tracking cleanup + better creative iteration made our Meta spend predictable again.", name: "Jason R.", role: "Ecom Founder", initials: "JR" },
  { quote: "Clear communication, fast execution, and actual performance thinking.", name: "Emily T.", role: "Info-product Operator", initials: "ET" },
];

// ---- Helpers ----
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateContact(data: FormData): ContactErrors {
  const errors: ContactErrors = {};
  if (!data.full_name.trim()) errors.full_name = "Full name is required.";
  const phoneErr = validatePhone(data.phone);
  if (phoneErr) errors.phone = phoneErr;
  if (!data.email.trim()) errors.email = "Email is required.";
  else if (!validateEmail(data.email)) errors.email = "Please enter a valid email.";
  return errors;
}

// ---- Star Row ----
const StarRow = () => (
  <div className="flex gap-0.5">
    {[...Array(5)].map((_, i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-yellow-400">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

// ---- Testimonials — redesigned like reference image ----
function TestimonialsBlock() {
  return (
    <div className="mt-6 space-y-3">
      {TESTIMONIALS.map((t, i) => (
        <div
          key={i}
          className="rounded-2xl p-4"
          style={{
            background: "hsl(220 14% 95%)",
            border: "1px solid hsl(var(--ss-border))",
          }}
        >
          {/* Stars row */}
          <StarRow />
          {/* Quote */}
          <p
            className="text-[13px] leading-snug italic mt-2 mb-3"
            style={{ color: "hsl(220 15% 35%)" }}
          >
            "{t.quote}"
          </p>
          {/* Author */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-[11px]"
              style={{
                background: "hsl(220 13% 82%)",
                color: "hsl(220 15% 35%)",
              }}
            >
              {t.initials}
            </div>
            <p className="text-[12px]" style={{ color: "hsl(var(--ss-card-fg))" }}>
              <span className="font-semibold">{t.name}</span>
              <span style={{ color: "hsl(var(--ss-muted-fg))" }}> — {t.role}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Step Components ----
function StepHero({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="step-animate">
      <div className="flex items-center gap-3 mb-6">
        <img src={ssLogo} alt="AFM Digital Agency" className="h-9 w-auto" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--ss-muted-fg))" }}>AFM Agency</p>
          <p className="text-[13px] font-medium" style={{ color: "hsl(var(--ss-card-fg))" }}>Performance Media Buying</p>
        </div>
      </div>
      <h1 className="text-[clamp(22px,5vw,30px)] font-extrabold leading-tight tracking-tight mb-3" style={{ color: "hsl(var(--ss-card-fg))" }}>
        Want to keep your ROAS at 400%+ while scaling?
      </h1>
      <p className="text-[15px] leading-relaxed mb-5" style={{ color: "hsl(var(--ss-muted-fg))" }}>
        We help e-commerce and info-product brands scale profitably across Meta with disciplined testing, tracking, and creative systems.
      </p>
      <ul className="space-y-2.5 mb-6">
        {["Performance-first media buying", "Creative testing framework", "Clean tracking & attribution"].map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "hsl(var(--ss-primary))" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[14px] font-medium" style={{ color: "hsl(var(--ss-card-fg))" }}>{item}</span>
          </li>
        ))}
      </ul>
      <button className="btn-primary" onClick={onContinue}>
        Continue
        <svg className="ml-2" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <TestimonialsBlock />
    </div>
  );
}

function StepSingleChoice({ title, options, selected, onSelect, onContinue, canContinue }: {
  title: string; options: string[]; selected: string;
  onSelect: (val: string) => void; onContinue: () => void; canContinue: boolean;
}) {
  return (
    <div className="step-animate">
      <h2 className="text-[clamp(18px,4vw,22px)] font-bold leading-snug mb-5" style={{ color: "hsl(var(--ss-card-fg))" }}>{title}</h2>
      <div className="space-y-3 mb-6">
        {options.map((opt) => (
          <div key={opt} className="fade-up">
            <OptionCard label={opt} selected={selected === opt} onClick={() => onSelect(opt)} />
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={onContinue} disabled={!canContinue}>
        Continue
        <svg className="ml-2" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function StepChallenge({ value, onChange, onContinue }: { value: string; onChange: (v: string) => void; onContinue: () => void; }) {
  return (
    <div className="step-animate">
      <h2 className="text-[clamp(18px,4vw,22px)] font-bold leading-snug mb-2" style={{ color: "hsl(var(--ss-card-fg))" }}>
        What is the biggest challenge you're running into that our team can help solve?
      </h2>
      <p className="text-[13px] mb-5" style={{ color: "hsl(var(--ss-muted-fg))" }}>Be as specific as possible — it helps us prepare for your call.</p>
      <textarea className="form-input resize-none mb-6" rows={5} placeholder="Enter your answer…" value={value} onChange={(e) => onChange(e.target.value)} />
      <button className="btn-primary" onClick={onContinue} disabled={!value.trim()}>
        Continue
        <svg className="ml-2" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ---- Phone input with +1 prefix ----
function PhoneInput({ value, onChange, hasError }: {
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Strip non-digits and reformat
    const digits = digitsOnly(raw);
    // Cap at 10 local digits
    const local = digits.startsWith("1") ? digits.slice(1) : digits;
    const capped = local.slice(0, 10);
    onChange(formatUSPhone(capped));
  };

  return (
    <div className={`flex items-stretch rounded-[10px] overflow-hidden${hasError ? " error-outline" : ""}`}
      style={{ border: `1.5px solid ${hasError ? "hsl(var(--ss-destructive))" : "hsl(var(--ss-border))"}`, background: "hsl(var(--ss-card))" }}>
      {/* +1 prefix badge */}
      <div
        className="flex items-center px-3 text-[15px] font-medium select-none flex-shrink-0"
        style={{
          background: "hsl(220 14% 95%)",
          borderRight: "1.5px solid hsl(var(--ss-border))",
          color: "hsl(var(--ss-card-fg))",
          minWidth: "44px",
        }}
      >
        +1
      </div>
      <input
        type="tel"
        inputMode="numeric"
        className="flex-1 px-3 py-[13px] text-[15px] outline-none bg-transparent"
        style={{ color: "hsl(var(--ss-card-fg))", fontFamily: "inherit" }}
        placeholder="(555) 000-0000"
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

function StepContact({ data, onChange, onSubmit }: {
  data: FormData;
  onChange: (field: keyof FormData, val: string) => void;
  onSubmit: () => void;
}) {
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleSubmit = () => {
    const errs = validateContact(data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setTouched({ full_name: true, phone: true, email: true });
      return;
    }
    onSubmit();
  };

  const handleBlur = (field: string) => {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors(validateContact(data));
  };

  return (
    <div className="step-animate">
      <h2 className="text-[clamp(18px,4vw,22px)] font-bold leading-snug mb-1" style={{ color: "hsl(var(--ss-card-fg))" }}>
        Contact information
      </h2>
      <p className="text-[13px] mb-5" style={{ color: "hsl(var(--ss-muted-fg))" }}>Please answer the questions below</p>

      <div className="space-y-4 mb-6">
        {/* Full Name */}
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "hsl(var(--ss-card-fg))" }}>
            Full name <span style={{ color: "hsl(var(--ss-destructive))" }}>*</span>
          </label>
          <input
            type="text"
            className={`form-input${touched.full_name && errors.full_name ? " error" : ""}`}
            placeholder="Jane Smith"
            value={data.full_name}
            onChange={(e) => onChange("full_name", e.target.value)}
            onBlur={() => handleBlur("full_name")}
          />
          {touched.full_name && errors.full_name && (
            <p className="text-[12px] mt-1" style={{ color: "hsl(var(--ss-destructive))" }}>{errors.full_name}</p>
          )}
        </div>

        {/* Phone with +1 */}
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "hsl(var(--ss-card-fg))" }}>
            Phone number <span style={{ color: "hsl(var(--ss-destructive))" }}>*</span>
          </label>
          <PhoneInput
            value={data.phone}
            onChange={(v) => onChange("phone", v)}
            hasError={!!(touched.phone && errors.phone)}
          />
          {touched.phone && errors.phone && (
            <p className="text-[12px] mt-1" style={{ color: "hsl(var(--ss-destructive))" }}>{errors.phone}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "hsl(var(--ss-card-fg))" }}>
            Email <span style={{ color: "hsl(var(--ss-destructive))" }}>*</span>
          </label>
          <input
            type="email"
            className={`form-input${touched.email && errors.email ? " error" : ""}`}
            placeholder="you@company.com"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
          />
          {touched.email && errors.email && (
            <p className="text-[12px] mt-1" style={{ color: "hsl(var(--ss-destructive))" }}>{errors.email}</p>
          )}
        </div>
      </div>

      <button className="btn-primary" onClick={handleSubmit}>
        Continue
        <svg className="ml-2" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ---- Main Page ----
const initialForm: FormData = {
  monthly_ad_spend: "", business_vertical: "", biggest_challenge: "",
  full_name: "", phone: "", email: "",
};

const ScalingStackApply: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);

  useEffect(() => {
    initMetaPixel();
    storeUTMParams();
  }, []);

  const updateForm = (field: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [field]: val }));
  const goNext = () => setStep((s) => s + 1);

  const handleContactSubmit = async () => {
    // Save name for thanks page
    sessionStorage.setItem("afm_applicant_name", form.full_name);

    const utmParams = getUTMParams();
    const phoneE164 = `+1${digitsOnly(form.phone).replace(/^1/, "")}`;

    const webhookPayload = {
      full_name: form.full_name,
      email: form.email,
      phone: phoneE164,
      ad_spend: form.monthly_ad_spend,
      vertical: form.business_vertical,
      challenge: form.biggest_challenge,
      source: "AFM Scaling Stack Leadform",
      created_at: new Date().toISOString(),
      utm_source: utmParams.utm_source || "",
      utm_medium: utmParams.utm_medium || "",
      utm_campaign: utmParams.utm_campaign || "",
      utm_content: utmParams.utm_content || "",
      utm_term: utmParams.utm_term || "",
      fbclid: utmParams.fbclid || "",
      gclid: utmParams.gclid || "",
      landing_page: typeof window !== "undefined" ? window.location.href : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
    };

    fetch("https://services.leadconnectorhq.com/hooks/UpO90XLZCi7tScgazNP6/webhook-trigger/b2d729be-bed0-420b-8be5-3428e909f223", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    }).catch((err) => console.warn("[AFM GHL Webhook] fetch error:", err));

    // Navigate to thanks page — Lead pixel fires there
    navigate("/scaling-stack/apply/thanks");
  };

  const showProgress = step > 1;
  const displayStep = Math.min(step - 1, TOTAL_STEPS - 1);

  const renderStep = () => {
    switch (step) {
      case 1: return <StepHero onContinue={goNext} />;
      case 2: return <StepSingleChoice title="What is your monthly ad spend?" options={SPEND_OPTIONS} selected={form.monthly_ad_spend} onSelect={(v) => updateForm("monthly_ad_spend", v)} onContinue={goNext} canContinue={!!form.monthly_ad_spend} />;
      case 3: return <StepSingleChoice title="What's your business or vertical?" options={VERTICAL_OPTIONS} selected={form.business_vertical} onSelect={(v) => updateForm("business_vertical", v)} onContinue={goNext} canContinue={!!form.business_vertical} />;
      case 4: return <StepChallenge value={form.biggest_challenge} onChange={(v) => updateForm("biggest_challenge", v)} onContinue={goNext} />;
      case 5: return <StepContact data={form} onChange={updateForm} onSubmit={handleContactSubmit} />;
      default: return null;
    }
  };

  return (
    <div
      className="ss-root min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 relative"
      style={{ backgroundImage: `url(${ssBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      {/* Meta Pixel noscript fallback */}
      <noscript>
        <img height="1" width="1" style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=1566413911316887&ev=PageView&noscript=1" alt="" />
      </noscript>
      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 20%, rgba(5,8,18,0.72) 100%)" }} />
      {/* Ambient orbs */}
      <div className="ss-bg-scene pointer-events-none">
        <div className="ss-bg-orb" style={{ width: "min(400px,80vw)", height: "min(400px,80vw)", background: "hsl(220, 60%, 20%)", top: "5%", left: "-10%" }} />
        <div className="ss-bg-orb" style={{ width: "min(350px,70vw)", height: "min(350px,70vw)", background: "hsl(230, 50%, 18%)", bottom: "5%", right: "-10%" }} />
      </div>
      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[460px] rounded-[20px] overflow-hidden"
        style={{ background: "hsl(var(--ss-card))", boxShadow: "0 25px 60px -10px rgba(0,0,0,0.35), 0 10px 25px -5px rgba(0,0,0,0.2)" }}
      >
        <div className="h-1 w-full" style={{ background: "hsl(var(--ss-primary))" }} />
        <div className="p-5 sm:p-7 md:p-8">
          {step > 1 && (
            <div className="flex items-center gap-2 mb-5">
              <img src={ssLogo} alt="AFM Digital Agency" className="h-7 w-auto" />
              <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--ss-muted-fg))" }}>AFM Agency</span>
            </div>
          )}
          {renderStep()}
        </div>
        {showProgress && <ProgressBar current={displayStep} total={TOTAL_STEPS - 1} />}
        <div className="px-5 pb-4 text-center">
          <p className="text-[11px]" style={{ color: "hsl(var(--ss-muted-fg))" }}>© 2025 AFM Digital Agency · All rights reserved</p>
        </div>
      </div>
    </div>
  );
};

export default ScalingStackApply;
