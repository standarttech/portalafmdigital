import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Target, Users, BarChart3, Award } from 'lucide-react';
import denisImg from '@/assets/denis.png';
import danilImg from '@/assets/danil.jpg';
import { useWebsiteLang } from '@/i18n/WebsiteLangContext';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function AboutPage() {
  const { t } = useWebsiteLang();

  const values = [
    { icon: Target, title: t('about.dataDriven'), desc: t('about.dataDrivenDesc') },
    { icon: Users, title: t('about.quality'), desc: t('about.qualityDesc') },
    { icon: BarChart3, title: t('about.customSystems'), desc: t('about.customSystemsDesc') },
    { icon: Award, title: t('about.platformPartners'), desc: t('about.platformPartnersDesc') },
  ];

  return (
    <div>
      <section className="py-24 sm:py-32 px-4 sm:px-6 text-center">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="text-[hsl(42,87%,55%)] text-xs sm:text-sm font-semibold tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-3 sm:mb-4">{t('about.badge')}</motion.p>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold max-w-3xl mx-auto leading-tight">
          {t('about.title1')} <span className="text-[hsl(42,87%,55%)]">{t('about.title2')}</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mt-4 sm:mt-6 leading-relaxed px-2">
          {t('about.desc')}
        </motion.p>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {values.map((v, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-[hsl(42,87%,55%)]/20 transition-colors">
              <v.icon className="h-7 w-7 sm:h-8 sm:w-8 text-[hsl(42,87%,55%)] mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-bold mb-2">{v.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-14">{t('about.ourFounders').split(' ')[0]} <span className="text-[hsl(42,87%,55%)]">{t('about.ourFounders').split(' ').slice(1).join(' ')}</span></motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            {[
              { img: denisImg, name: 'Denis Ishimov', role: 'Co-Founder & CEO', bio: t('founders.p3') },
              { img: danilImg, name: 'Danil Yussupov', role: 'Co-Founder & COO', bio: t('founders.p4') },
            ].map((f, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 sm:p-8 text-center">
                <img src={f.img} alt={f.name} className={`h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover mx-auto mb-4 sm:mb-5 border-2 border-[hsl(42,87%,55%)]/30 ${f.name === 'Denis Ishimov' ? 'object-[center_20%]' : ''}`} />
                <h3 className="text-lg sm:text-xl font-bold">{f.name}</h3>
                <p className="text-[hsl(42,87%,55%)] text-sm font-medium mb-3 sm:mb-4">{f.role}</p>
                <p className="text-white/50 text-sm leading-relaxed">{f.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 text-center">
        <Link to="/contact"
          className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold text-sm sm:text-base hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
          {t('about.workWithUs')} <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Link>
      </section>
    </div>
  );
}
