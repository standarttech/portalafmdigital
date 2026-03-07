import { motion } from 'framer-motion';
import { Shield, Award, CheckCircle, Star, Clock, Users } from 'lucide-react';
import { useWebsiteLang } from '@/i18n/WebsiteLangContext';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const testimonials = [
  {
    quote: "AFM Digital transformed our ad performance. We went from struggling with bans to scaling consistently with their whitelisted accounts.",
    author: "E-commerce Brand Owner",
    result: "+343% monthly revenue"
  },
  {
    quote: "The level of transparency through their portal is unlike any agency we've worked with. Real data, real results, no BS.",
    author: "Info Product Creator",
    result: "$1.3M revenue generated"
  },
  {
    quote: "We've tried 4 agencies before AFM. They're the first to actually deliver on their promises with data to back it up.",
    author: "SaaS Founder",
    result: "4.8x ROAS achieved"
  },
];

export default function TrustSection() {
  const { t } = useWebsiteLang();

  const trustPoints = [
    { icon: Shield, title: t('trust.partners'), desc: t('trust.partnersDesc') },
    { icon: Award, title: t('trust.experience'), desc: t('trust.experienceDesc') },
    { icon: CheckCircle, title: t('trust.revenue'), desc: t('trust.revenueDesc') },
    { icon: Star, title: t('trust.growthProjects'), desc: t('trust.growthProjectsDesc') },
    { icon: Clock, title: t('trust.reporting'), desc: t('trust.reportingDesc') },
    { icon: Users, title: t('trust.team'), desc: t('trust.teamDesc') },
  ];

  return (
    <>
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-8 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              {t('trust.title1')} <span className="text-[hsl(42,87%,55%)]">{t('trust.title2')}</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">{t('trust.desc')}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {trustPoints.map((tp, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 sm:p-6 hover:border-[hsl(42,87%,55%)]/20 transition-colors group">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[hsl(42,87%,55%)]/10 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-[hsl(42,87%,55%)]/20 transition-colors">
                  <tp.icon className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(42,87%,55%)]" />
                </div>
                <h3 className="font-bold text-sm sm:text-base mb-1 sm:mb-1.5">{tp.title}</h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{tp.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-14">
            {t('trust.testimonials').split(' ')[0]} <span className="text-[hsl(42,87%,55%)]">{t('trust.testimonials').split(' ').slice(1).join(' ')}</span>
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((tm, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 sm:p-7 flex flex-col">
                <div className="flex gap-1 mb-3 sm:mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-[hsl(42,87%,55%)] text-[hsl(42,87%,55%)]" />
                  ))}
                </div>
                <blockquote className="text-white/70 text-sm leading-relaxed flex-1 mb-3 sm:mb-4">"{tm.quote}"</blockquote>
                <div className="border-t border-white/5 pt-3 sm:pt-4">
                  <p className="text-white font-medium text-sm">{tm.author}</p>
                  <p className="text-[hsl(42,87%,55%)] text-xs font-semibold mt-0.5">{tm.result}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
