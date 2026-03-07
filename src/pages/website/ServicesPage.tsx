import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, ShoppingCart, MapPin, BarChart3, Target, Layers } from 'lucide-react';
import { useWebsiteLang } from '@/i18n/WebsiteLangContext';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function ServicesPage() {
  const { t } = useWebsiteLang();

  const services = [
    {
      icon: TrendingUp,
      title: t('vert.coaches'),
      desc: t('vert.coachesDesc'),
      features: ['Webinar & VSL funnel optimization', 'Lead quality scoring', 'Multi-platform campaigns', 'Custom audience building'],
    },
    {
      icon: ShoppingCart,
      title: t('vert.ecom'),
      desc: t('vert.ecomDesc'),
      features: ['ROAS-focused campaigns', 'Product feed optimization', 'Dynamic retargeting', 'Catalog sales scaling'],
    },
    {
      icon: MapPin,
      title: t('vert.local'),
      desc: t('vert.localDesc'),
      features: ['Geo-targeted campaigns', 'Appointment booking funnels', 'Google Local + Meta', 'Review & reputation ads'],
    },
  ];

  const approach = [
    { icon: Target, title: t('services.audit'), desc: t('services.auditDesc') },
    { icon: Layers, title: t('services.build'), desc: t('services.buildDesc') },
    { icon: BarChart3, title: t('services.scale'), desc: t('services.scaleDesc') },
  ];

  return (
    <div>
      <section className="py-24 sm:py-32 px-4 sm:px-6 text-center">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="text-[hsl(42,87%,55%)] text-xs sm:text-sm font-semibold tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-3 sm:mb-4">{t('services.badge')}</motion.p>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold max-w-3xl mx-auto leading-tight">
          {t('services.title1')} <span className="text-[hsl(42,87%,55%)]">{t('services.title2')}</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mt-4 sm:mt-6">
          {t('services.desc')}
        </motion.p>
      </section>

      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          {services.map((s, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 lg:p-10 hover:border-[hsl(42,87%,55%)]/20 transition-colors">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[hsl(42,87%,55%)]/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-5 w-5 sm:h-6 sm:w-6 text-[hsl(42,87%,55%)]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-4 sm:mb-5">{s.desc}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {s.features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-white/60 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-[hsl(42,87%,55%)] flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-14">{t('services.approach').split(' ')[0]} <span className="text-[hsl(42,87%,55%)]">{t('services.approach').split(' ').slice(1).join(' ')}</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {approach.map((a, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="text-center bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-[hsl(42,87%,55%)]/10 flex items-center justify-center mx-auto mb-4 sm:mb-5">
                  <a.icon className="h-6 w-6 sm:h-7 sm:w-7 text-[hsl(42,87%,55%)]" />
                </div>
                <h3 className="font-bold mb-2">{a.title}</h3>
                <p className="text-white/50 text-sm">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 text-center">
        <Link to="/contact"
          className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold text-sm sm:text-base hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
          {t('services.getCta')} <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Link>
      </section>
    </div>
  );
}
