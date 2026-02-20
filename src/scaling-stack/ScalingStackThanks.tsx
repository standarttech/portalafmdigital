import React, { useEffect, useRef } from "react";
import ssLogo from "@/assets/ss-logo-afm.png";
import "./ss.css";

// ---- Meta Pixel: init + fire Lead ----
function fireLeadPixel() {
  if (typeof window === "undefined") return;
  const win = window as any;

  const fire = () => {
    if (typeof win.fbq === "function") {
      win.fbq("track", "Lead", {
        content_name: "AFM Scaling Stack Application",
        value: 0,
        currency: "USD",
      });
    }
  };

  if (win.fbq) {
    fire();
    return;
  }

  // Init pixel first, then fire
  const n: any = function () {
    n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
  };
  if (!win._fbq) win._fbq = n;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  win.fbq = n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  t.onload = () => {
    win.fbq("init", "1566413911316887");
    win.fbq("track", "PageView");
    fire();
  };
  const s = document.getElementsByTagName("script")[0];
  s.parentNode?.insertBefore(t, s);
}

const ScalingStackThanks: React.FC = () => {
  const firedRef = useRef(false);
  const name = typeof window !== "undefined"
    ? (sessionStorage.getItem("afm_applicant_name") || "")
    : "";
  const firstName = name.split(" ")[0] || "there";

  useEffect(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      fireLeadPixel();
    }
  }, []);

  return (
    <div
      className="ss-root min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 relative"
      style={{ background: "hsl(var(--ss-bg))" }}
    >
      {/* Meta noscript fallback */}
      <noscript>
        <img
          height="1" width="1" style={{ display: "none" }}
          src="https://www.facebook.com/tr?id=1566413911316887&ev=Lead&noscript=1"
          alt=""
        />
      </noscript>

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
        <div className="h-1 w-full" style={{ background: "hsl(142 71% 45%)" }} />
        <div className="p-5 sm:p-7 md:p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <img src={ssLogo} alt="AFM Digital Agency" className="h-7 w-auto" />
            <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--ss-muted-fg))" }}>AFM Agency</span>
          </div>

          <div className="text-center step-animate">
            {/* Success icon */}
            <div
              className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "hsl(142 71% 45%)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2
              className="text-[clamp(20px,4.5vw,26px)] font-extrabold leading-tight mb-3"
              style={{ color: "hsl(var(--ss-card-fg))" }}
            >
              Your application is in, {firstName} — we'll reach out shortly.
            </h2>

            <p className="text-[14px] leading-relaxed mb-2" style={{ color: "hsl(var(--ss-muted-fg))" }}>
              If you don't want to wait and keep losing money, book a call with us right now.
            </p>

            <p className="text-[14px] leading-relaxed mb-6" style={{ color: "hsl(var(--ss-muted-fg))" }}>
              On the call, we'll walk you through our{" "}
              <span className="font-semibold" style={{ color: "hsl(var(--ss-card-fg))" }}>Meta-Scaling Framework</span>
              {" "}— a system built to improve your traffic setup and performance.
            </p>

            <div
              className="rounded-xl border p-4 mb-6"
              style={{ borderColor: "hsl(var(--ss-border))", background: "hsl(220 14% 97%)" }}
            >
              <p className="text-[13px]" style={{ color: "hsl(var(--ss-muted-fg))" }}>
                ✅ You successfully submitted your responses.
              </p>
            </div>

            <a
              href="https://api.leadconnectorhq.com/widget/booking/sHuAQKywl3pBzolErWda"
              target="_self"
              className="btn-book block no-underline"
            >
              📅 Book a Meeting Now
            </a>

            <p className="text-[12px] mt-3" style={{ color: "hsl(var(--ss-muted-fg))" }}>
              Free strategy call · No commitment required
            </p>
          </div>
        </div>

        <div className="px-5 pb-4 text-center">
          <p className="text-[11px]" style={{ color: "hsl(var(--ss-muted-fg))" }}>
            © 2025 AFM Digital Agency · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScalingStackThanks;
