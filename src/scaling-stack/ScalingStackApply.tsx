import React, { useState, useRef } from "react";
import ssLogo from "@/assets/ss-logo-afm.png";
import ssBg from "@/assets/ss-bg-gradient.jpg";
import ProgressBar from "./ProgressBar";
import OptionCard from "./OptionCard";
import "./ss.css";

// ---- Types ----
interface FormData {
  monthly_ad_spend: string;
  business_vertical: string;
  biggest_challenge: string;
  full_name: string;
  phone: string;
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

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateContact(data: FormData): ContactErrors {
  const errors: ContactErrors = {};
  if (!data.full_name.trim()) errors.full_name = "Full name is required.";
  if (!data.phone.trim()) errors.phone = "Phone number is required.";
  if (!data.email.trim()) { errors.email = "Email is required."; }
  else if (!validateEmail(data.email)) { errors.email = "Please enter a valid email."; }
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

function TestimonialsBlock() {
  return (
    <div className="mt-5 space-y-2.5">
      {TESTIMONIALS.map((t, i) => (
        <div key={i} className="ss-testimonial-badge">
          <div className="flex-shrink-0 mt-0.5"><StarRow /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug italic" style={{ color: "hsl(var(--ss-muted-fg))" }}>"{t.quote}"</p>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "hsl(var(--ss-muted))", border: "1px solid hsl(var(--ss-border))" }}>
                <span className="text-[8px] font-bold" style={{ color: "rgba(0,0,0,0.5)" }}>{t.initials}</span>
              </div>
              <p className="text-[12px] font-semibold" style={{ color: "hsl(var(--ss-card-fg))" }}>
                {t.name} <span className="font-normal" style={{ color: "hsl(var(--ss-muted-fg))" }}>— {t.role}</span>
              </p>
            </div>
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
        We help e-commerce and info-product brands scale profitably across Meta &amp; TikTok with disciplined testing, tracking, and creative systems.
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
        What is the biggest challenge you&apos;re running into that our team can help solve?
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

function StepContact({ data, onChange, onSubmit }: { data: FormData; onChange: (field: keyof FormData, val: string) => void; onSubmit: () => void; }) {
  const [errors, setErrors] = useState<ContactErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleSubmit = () => {
    const errs = validateContact(data);
    if (Object.keys(errs).length > 0) { setErrors(errs); setTouched({ full_name: true, phone: true, email: true }); return; }
    onSubmit();
  };
  const handleBlur = (field: string) => { setTouched((p) => ({ ...p, [field]: true })); setErrors(validateContact(data)); };

  return (
    <div className="step-animate">
      <h2 className="text-[clamp(18px,4vw,22px)] font-bold leading-snug mb-1" style={{ color: "hsl(var(--ss-card-fg))" }}>Contact information</h2>
      <p className="text-[13px] mb-5" style={{ color: "hsl(var(--ss-muted-fg))" }}>Please answer the questions below</p>
      <div className="space-y-4 mb-6">
        {/* Full Name */}
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "hsl(var(--ss-card-fg))" }}>
            Full name <span style={{ color: "hsl(var(--ss-destructive))" }}>*</span>
          </label>
          <input type="text" className={`form-input${touched.full_name && errors.full_name ? " error" : ""}`}
            placeholder="Jane Smith" value={data.full_name}
            onChange={(e) => onChange("full_name", e.target.value)} onBlur={() => handleBlur("full_name")} />
          {touched.full_name && errors.full_name && <p className="text-[12px] mt-1" style={{ color: "hsl(var(--ss-destructive))" }}>{errors.full_name}</p>}
        </div>
        {/* Phone */}
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "hsl(var(--ss-card-fg))" }}>
            Phone number <span style={{ color: "hsl(var(--ss-destructive))" }}>*</span>
          </label>
          <input type="tel" className={`form-input${touched.phone && errors.phone ? " error" : ""}`}
            placeholder="+1 (555) 000-0000" value={data.phone}
            onChange={(e) => onChange("phone", e.target.value)} onBlur={() => handleBlur("phone")} />
          {touched.phone && errors.phone && <p className="text-[12px] mt-1" style={{ color: "hsl(var(--ss-destructive))" }}>{errors.phone}</p>}
        </div>
        {/* Email */}
        <div>
          <label className="block text-[13px] font-medium mb-1.5" style={{ color: "hsl(var(--ss-card-fg))" }}>
            Email <span style={{ color: "hsl(var(--ss-destructive))" }}>*</span>
          </label>
          <input type="email" className={`form-input${touched.email && errors.email ? " error" : ""}`}
            placeholder="you@company.com" value={data.email}
            onChange={(e) => onChange("email", e.target.value)} onBlur={() => handleBlur("email")} />
          {touched.email && errors.email && <p className="text-[12px] mt-1" style={{ color: "hsl(var(--ss-destructive))" }}>{errors.email}</p>}
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

function StepConfirmation({ name }: { name: string }) {
  const firstName = name.split(" ")[0] || "there";
  return (
    <div className="step-animate text-center">
      <div className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "hsl(142 71% 45%)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-[clamp(20px,4.5vw,26px)] font-extrabold leading-tight mb-3" style={{ color: "hsl(var(--ss-card-fg))" }}>
        Your application is in, {firstName} — we&apos;ll reach out shortly.
      </h2>
      <p className="text-[14px] leading-relaxed mb-2" style={{ color: "hsl(var(--ss-muted-fg))" }}>
        If you don&apos;t want to wait and keep losing money, book a call with us right now.
      </p>
      <p className="text-[14px] leading-relaxed mb-6" style={{ color: "hsl(var(--ss-muted-fg))" }}>
        On the call, we&apos;ll walk you through our{" "}
        <span className="font-semibold" style={{ color: "hsl(var(--ss-card-fg))" }}>Meta-Scaling Framework</span>{" "}
        — a system built to improve your traffic setup and performance.
      </p>
      <div className="rounded-xl border p-4 mb-6" style={{ borderColor: "hsl(var(--ss-border))", background: "hsl(220 14% 97%)" }}>
        <p className="text-[13px]" style={{ color: "hsl(var(--ss-muted-fg))" }}>✅ You successfully submitted your responses.</p>
      </div>
      <a href="https://api.leadconnectorhq.com/widget/booking/sHuAQKywl3pBzolErWda" target="_self" className="btn-book block no-underline">
        📅 Book a Meeting Now
      </a>
      <p className="text-[12px] mt-3" style={{ color: "hsl(var(--ss-muted-fg))" }}>Free strategy call · No commitment required</p>
    </div>
  );
}

// ---- Main Page ----
const initialForm: FormData = { monthly_ad_spend: "", business_vertical: "", biggest_challenge: "", full_name: "", phone: "", email: "" };

const ScalingStackApply: React.FC = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [isConfirmation, setIsConfirmation] = useState(false);
  const leadFiredRef = useRef(false);

  const updateForm = (field: keyof FormData, val: string) => setForm((prev) => ({ ...prev, [field]: val }));
  const goNext = () => setStep((s) => s + 1);

  const handleContactSubmit = async () => {
    setIsConfirmation(true);
    if (!leadFiredRef.current) {
      if (typeof window !== "undefined" && (window as any).fbq) (window as any).fbq("track", "Lead");
      leadFiredRef.current = true;
    }
    const webhookPayload = {
      full_name: form.full_name, email: form.email, phone: form.phone,
      ad_spend: form.monthly_ad_spend, vertical: form.business_vertical,
      challenge: form.biggest_challenge, source: "AFM Scaling Stack Leadform",
      created_at: new Date().toISOString(),
    };
    fetch("https://services.leadconnectorhq.com/hooks/UpO90XLZCi7tScgazNP6/webhook-trigger/b2d729be-bed0-420b-8be5-3428e909f223", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookPayload),
    }).catch((err) => console.warn("[AFM GHL Webhook] fetch error:", err));
  };

  const renderStep = () => {
    if (isConfirmation) return <StepConfirmation name={form.full_name} />;
    switch (step) {
      case 1: return <StepHero onContinue={goNext} />;
      case 2: return <StepSingleChoice title="What is your monthly ad spend?" options={SPEND_OPTIONS} selected={form.monthly_ad_spend} onSelect={(v) => updateForm("monthly_ad_spend", v)} onContinue={goNext} canContinue={!!form.monthly_ad_spend} />;
      case 3: return <StepSingleChoice title="What's your business or vertical?" options={VERTICAL_OPTIONS} selected={form.business_vertical} onSelect={(v) => updateForm("business_vertical", v)} onContinue={goNext} canContinue={!!form.business_vertical} />;
      case 4: return <StepChallenge value={form.biggest_challenge} onChange={(v) => updateForm("biggest_challenge", v)} onContinue={goNext} />;
      case 5: return <StepContact data={form} onChange={updateForm} onSubmit={handleContactSubmit} />;
      default: return null;
    }
  };

  const showProgress = !isConfirmation && step > 1;
  const displayStep = Math.min(step - 1, TOTAL_STEPS - 1);

  return (
    <div className="ss-root min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 relative"
      style={{ backgroundImage: `url(${ssBg})`, backgroundSize: "cover", backgroundPosition: "center" }}>
      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 20%, rgba(5,8,18,0.72) 100%)" }} />
      {/* Ambient orbs */}
      <div className="ss-bg-scene pointer-events-none">
        <div className="ss-bg-orb" style={{ width: "min(400px,80vw)", height: "min(400px,80vw)", background: "hsl(220, 60%, 20%)", top: "5%", left: "-10%" }} />
        <div className="ss-bg-orb" style={{ width: "min(350px,70vw)", height: "min(350px,70vw)", background: "hsl(230, 50%, 18%)", bottom: "5%", right: "-10%" }} />
      </div>
      {/* Card */}
      <div className="relative z-10 w-full max-w-[460px] rounded-[20px] overflow-hidden"
        style={{ background: "hsl(var(--ss-card))", boxShadow: "0 25px 60px -10px rgba(0,0,0,0.35), 0 10px 25px -5px rgba(0,0,0,0.2)" }}>
        <div className="h-1 w-full" style={{ background: "hsl(var(--ss-primary))" }} />
        <div className="p-5 sm:p-7 md:p-8">
          {step > 1 && !isConfirmation && (
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
