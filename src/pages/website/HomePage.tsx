import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Headphones, Clock, Lock, TrendingUp } from 'lucide-react';
import denisImg from '@/assets/denis.png';
import danilImg from '@/assets/danil.jpg';
import RoasCalculator from '@/components/website/RoasCalculator';
import TrustSection from '@/components/website/TrustSection';
import { useWebsiteLang } from '@/i18n/WebsiteLangContext';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

export default function HomePage() {
  const { t } = useWebsiteLang();

  const stats = [
    { value: '$42M+', label: t('stats.revenue') },
    { value: '$12M+', label: t('stats.spend') },
    { value: '80+', label: t('stats.projects') },
  ];

  const platformBenefits = [
    { icon: Shield, label: t('benefit.noBans') },
    { icon: Zap, label: t('benefit.features') },
    { icon: Headphones, label: t('benefit.support') },
    { icon: Clock, label: t('benefit.moderation') },
    { icon: Lock, label: t('benefit.security') },
    { icon: TrendingUp, label: t('benefit.noLimits') },
  ];

  const verticals = [
    { title: t('vert.coaches'), desc: t('vert.coachesDesc') },
    { title: t('vert.ecom'), desc: t('vert.ecomDesc') },
    { title: t('vert.local'), desc: t('vert.localDesc') },
  ];

  const caseStudies = [
    { name: 'Lapin Group', metric: '29,871', desc: 'Webinar registrations in one week' },
    { name: 'Kelner Homes', metric: '$2.5M+', desc: 'Revenue generated in 3 months' },
    { name: 'Hyper Cyber', metric: '+343%', desc: 'Increase in monthly Shopify revenue' },
    { name: 'Market Guru', metric: '$1.3M', desc: 'Revenue with evergreen webinar' },
    { name: 'Thomas Kralow', metric: '$171K', desc: 'Revenue with VSL funnel in 2 months' },
    { name: 'Eurosport', metric: '22,272', desc: 'Broadcast subscriptions in 3 weeks' },
  ];

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center justify-center px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(42,87%,55%)]/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] bg-[hsl(42,87%,55%)]/5 rounded-full blur-[120px]" />
        <motion.div initial="hidden" animate="visible" className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.p variants={fadeUp} custom={0} className="text-[hsl(42,87%,55%)] text-xs sm:text-sm font-semibold tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-4 sm:mb-6">
            {t('hero.badge')}
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-3xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-4 sm:mb-6">
            {t('hero.title1')}{' '}
            <span className="bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent">
              {t('hero.title2')}
            </span>{' '}
            {t('hero.title3')}
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-white/60 text-base sm:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            {t('hero.desc')}
          </motion.p>
          <motion.div variants={fadeUp} custom={3}>
            <Link to="/contact"
              className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold text-sm sm:text-base hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
              {t('hero.cta')} <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-14 sm:py-20 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-3 gap-4 sm:gap-8">
          {stats.map((s, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="text-center">
              <p className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent">{s.value}</p>
              <p className="text-white/50 text-[10px] sm:text-sm mt-1 sm:mt-2">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Platform Partners */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            {t('partners.title1')} <span className="text-[hsl(42,87%,55%)]">{t('partners.title2')}</span>
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-white/50 max-w-2xl mx-auto mb-8 sm:mb-12 text-sm sm:text-base">
            {t('partners.desc')}
          </motion.p>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {platformBenefits.map((b, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-xl p-3 sm:p-5 flex flex-col items-center gap-2 sm:gap-3 hover:border-[hsl(42,87%,55%)]/20 transition-colors">
                <b.icon className="h-5 w-5 sm:h-6 sm:w-6 text-[hsl(42,87%,55%)]" />
                <span className="text-[10px] sm:text-xs font-medium text-white/70 text-center leading-tight">{b.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROAS Calculator */}
      <RoasCalculator />

      {/* Verticals */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-14">
            {t('verticals.title1')} <span className="text-[hsl(42,87%,55%)]">{t('verticals.title2')}</span>
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {verticals.map((v, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-[hsl(42,87%,55%)]/20 transition-all group">
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 group-hover:text-[hsl(42,87%,55%)] transition-colors">{v.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Preview */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-14">
            {t('cases.title1')} <span className="text-[hsl(42,87%,55%)]">{t('cases.title2')}</span>
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {caseStudies.map((c, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 sm:p-7 hover:border-[hsl(42,87%,55%)]/20 transition-all">
                <p className="text-white/40 text-xs font-semibold tracking-wider uppercase mb-2 sm:mb-3">{c.name}</p>
                <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent mb-1 sm:mb-2">{c.metric}</p>
                <p className="text-white/50 text-sm">{c.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8 sm:mt-10">
            <Link to="/case-studies" className="text-[hsl(42,87%,55%)] text-sm font-semibold hover:underline inline-flex items-center gap-2">
              {t('cases.viewAll')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Testimonials */}
      <TrustSection />

      {/* Founders */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-14">
            {t('founders.title1')} <span className="text-[hsl(42,87%,55%)]">{t('founders.title2')}</span>
          </motion.h2>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 lg:p-12">
            <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-8">
              <img src={denisImg} alt="Denis Ishimov" className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover object-[center_20%] border-2 border-[hsl(42,87%,55%)]/30" />
              <img src={danilImg} alt="Danil Yussupov" className="h-14 w-14 sm:h-16 sm:w-16 rounded-full object-cover border-2 border-[hsl(42,87%,55%)]/30" />
            </div>
            <blockquote className="text-white/70 leading-relaxed space-y-3 sm:space-y-4 text-sm sm:text-base">
              <p>{t('founders.p1')}</p>
              <p>{t('founders.p2')}</p>
              <p>{t('founders.p3')}</p>
              <p className="text-white font-semibold">{t('founders.p4')}</p>
            </blockquote>
            <p className="mt-4 sm:mt-6 text-[hsl(42,87%,55%)] font-semibold text-sm">— Denis Ishimov & Danil Yussupov</p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
            {t('cta.title1')} <span className="text-[hsl(42,87%,55%)]">{t('cta.title2')}</span>
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="text-white/50 mb-8 sm:mb-10 max-w-xl mx-auto text-sm sm:text-base">
            {t('cta.desc')}
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}>
            <Link to="/contact"
              className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold text-sm sm:text-base hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
              {t('hero.cta')} <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
