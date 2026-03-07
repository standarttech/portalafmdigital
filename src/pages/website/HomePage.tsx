import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Headphones, Clock, Lock, TrendingUp } from 'lucide-react';
import denisImg from '@/assets/denis.png';
import danilImg from '@/assets/danil.jpg';
import RoasCalculator from '@/components/website/RoasCalculator';
import PlatformDemo from '@/components/website/PlatformDemo';
import TrustSection from '@/components/website/TrustSection';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

const stats = [
  { value: '$42M+', label: 'Client Revenue Generated' },
  { value: '$12M+', label: 'Ad Spend Managed' },
  { value: '80+', label: 'Growth Projects' },
];

const platformBenefits = [
  { icon: Shield, label: 'No More Bans' },
  { icon: Zap, label: 'Access to New Features' },
  { icon: Headphones, label: 'Private Support' },
  { icon: Clock, label: 'Fastest Moderation' },
  { icon: Lock, label: 'High Security' },
  { icon: TrendingUp, label: 'No Spending Limits' },
];

const caseStudies = [
  { name: 'Lapin Group', metric: '29,871', desc: 'Webinar registrations in one week' },
  { name: 'Kelner Homes', metric: '$2.5M+', desc: 'Revenue generated in 3 months' },
  { name: 'Hyper Cyber', metric: '+343%', desc: 'Increase in monthly Shopify revenue' },
  { name: 'Market Guru', metric: '$1.3M', desc: 'Revenue with evergreen webinar' },
  { name: 'Thomas Kralow', metric: '$171K', desc: 'Revenue with VSL funnel in 2 months' },
  { name: 'Eurosport', metric: '22,272', desc: 'Broadcast subscriptions in 3 weeks' },
];

const verticals = [
  { title: 'Coaches & Info Products', desc: 'Paid ads optimized for lower CPL and higher quality. We analyze your funnel performance to improve conversion at every stage.' },
  { title: 'E-commerce', desc: 'Performance-driven ad campaigns focused on ROAS, AOV growth, and consistent scaling across the entire customer journey.' },
  { title: 'Local Business', desc: 'Hyper-targeted campaigns to lower CPA and generate steady appointment flow with predictable ROI.' },
];

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(42,87%,55%)]/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[hsl(42,87%,55%)]/5 rounded-full blur-[120px]" />
        <motion.div initial="hidden" animate="visible" className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-[hsl(42,87%,55%)] text-sm font-semibold tracking-[0.3em] uppercase mb-6">
            Authorized Partners of Meta, Google & TikTok
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
            Welcome to the{' '}
            <span className="bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent">
              New Era
            </span>{' '}
            of Paid Advertising
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            We operate through exclusive whitelisted agency ad accounts — giving our clients privileges unavailable to regular advertisers
          </motion.p>
          <motion.div variants={fadeUp} custom={3}>
            <Link to="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold text-base hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
              Book a Free Ads Audit <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {stats.map((s, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="text-center">
              <p className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent">
                {s.value}
              </p>
              <p className="text-white/50 text-sm mt-2">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Platform Partners ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl sm:text-4xl font-bold mb-4">
            Partnered With <span className="text-[hsl(42,87%,55%)]">Top Ad Platforms</span>
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-white/50 max-w-2xl mx-auto mb-12">
            Meta, TikTok & Google trust us with exclusive whitelisted accounts — giving you stability, scale, and direct support
          </motion.p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {platformBenefits.map((b, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-[hsl(42,87%,55%)]/20 transition-colors">
                <b.icon className="h-6 w-6 text-[hsl(42,87%,55%)]" />
                <span className="text-xs font-medium text-white/70 text-center">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Demo ── */}
      <PlatformDemo />

      {/* ── ROAS Calculator ── */}
      <RoasCalculator />

      {/* ── Verticals ── */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl sm:text-4xl font-bold text-center mb-14">
            Profitable Paid Ads <span className="text-[hsl(42,87%,55%)]">For</span>
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {verticals.map((v, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 hover:border-[hsl(42,87%,55%)]/20 transition-all group">
                <h3 className="text-lg font-bold mb-3 group-hover:text-[hsl(42,87%,55%)] transition-colors">{v.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Studies Preview ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl sm:text-4xl font-bold text-center mb-14">
            Paid Ads <span className="text-[hsl(42,87%,55%)]">Case Studies</span>
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {caseStudies.map((c, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-7 hover:border-[hsl(42,87%,55%)]/20 transition-all">
                <p className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-3">{c.name}</p>
                <p className="text-3xl font-extrabold bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent mb-2">
                  {c.metric}
                </p>
                <p className="text-white/50 text-sm">{c.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/case-studies" className="text-[hsl(42,87%,55%)] text-sm font-semibold hover:underline inline-flex items-center gap-2">
              View All Case Studies <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust & Testimonials ── */}
      <TrustSection />

      {/* ── Founders ── */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl sm:text-4xl font-bold text-center mb-14">
            A Message From Our <span className="text-[hsl(42,87%,55%)]">Founders</span>
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 sm:p-12">
            <div className="flex gap-4 mb-8">
              <img src={denisImg} alt="Denis Ishimov" className="h-16 w-16 rounded-full object-cover object-[center_20%] border-2 border-[hsl(42,87%,55%)]/30" />
              <img src={danilImg} alt="Danil Yussupov" className="h-16 w-16 rounded-full object-cover border-2 border-[hsl(42,87%,55%)]/30" />
            </div>
            <blockquote className="text-white/70 leading-relaxed space-y-4 text-sm sm:text-base">
              <p>After 11 years in marketing, paid traffic, and funnel optimization, we've seen how most agencies really operate. They scale their client list, not their clients' results — and everyone gets the same copy-paste strategy.</p>
              <p>That's why we built a different model. We create custom, tailored systems instead of "cookie-cutter" approaches. Every decision is driven by data — CPL, CPA, ROAS, and the full customer journey.</p>
              <p>What truly sets us apart is our direct partnership with Meta, Google, and TikTok. These relationships give our clients advantages that 99% of agencies simply can't offer.</p>
              <p className="text-white font-semibold">This is how we work. Focused. Precise. Quality over quantity. We win only when you do.</p>
            </blockquote>
            <p className="mt-6 text-[hsl(42,87%,55%)] font-semibold text-sm">— Denis Ishimov & Danil Yussupov</p>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to <span className="text-[hsl(42,87%,55%)]">Scale?</span>
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-white/50 mb-10 max-w-xl mx-auto">
            Unlock hidden profits in your traffic. Get a 100% free diagnostic from our team of growth experts.
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
            <Link to="/contact"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold text-base hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
              Book a Free Ads Audit <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
