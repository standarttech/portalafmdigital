import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, ShoppingCart, MapPin, BarChart3, Target, Layers } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const services = [
  {
    icon: TrendingUp,
    title: 'Coaches & Info Products',
    desc: 'We run paid ads optimized for lower CPL and higher quality. Our team analyzes your funnel performance to improve conversion at every stage and scale your ads profitably.',
    features: ['Webinar & VSL funnel optimization', 'Lead quality scoring', 'Multi-platform campaigns', 'Custom audience building'],
  },
  {
    icon: ShoppingCart,
    title: 'E-commerce',
    desc: 'We manage performance-driven ad campaigns focused on ROAS, AOV growth, and consistent scaling. We analyze your entire customer journey to reduce CPA and increase LTV.',
    features: ['ROAS-focused campaigns', 'Product feed optimization', 'Dynamic retargeting', 'Catalog sales scaling'],
  },
  {
    icon: MapPin,
    title: 'Local Business',
    desc: 'We build hyper-targeted paid ad campaigns designed to lower CPA and generate steady appointment flow. We analyze your offer, booking flow, and conversion metrics to drive predictable ROI.',
    features: ['Geo-targeted campaigns', 'Appointment booking funnels', 'Google Local + Meta', 'Review & reputation ads'],
  },
];

const approach = [
  { icon: Target, title: 'Strategic Audit', desc: 'Deep-dive analysis of your current ad performance, funnel, and competitive landscape.' },
  { icon: Layers, title: 'Custom System Build', desc: 'Tailored campaign architecture designed specifically for your business goals and KPIs.' },
  { icon: BarChart3, title: 'Scale & Optimize', desc: 'Data-driven optimization cycles to maximize ROAS while scaling spend profitably.' },
];

export default function ServicesPage() {
  return (
    <div>
      <section className="py-32 px-6 text-center">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="text-[hsl(42,87%,55%)] text-sm font-semibold tracking-[0.3em] uppercase mb-4">Our Services</motion.p>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold max-w-3xl mx-auto leading-tight">
          Unlock a Profitable <span className="text-[hsl(42,87%,55%)]">Traffic Flow</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="text-white/50 text-lg max-w-2xl mx-auto mt-6">
          Aligned with your KPIs and high ROI — powered by exclusive platform partnerships
        </motion.p>
      </section>

      {/* Services */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {services.map((s, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 sm:p-10 hover:border-[hsl(42,87%,55%)]/20 transition-colors">
              <div className="flex items-start gap-5">
                <div className="h-12 w-12 rounded-xl bg-[hsl(42,87%,55%)]/10 flex items-center justify-center flex-shrink-0">
                  <s.icon className="h-6 w-6 text-[hsl(42,87%,55%)]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed mb-5">{s.desc}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {s.features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-white/60 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-[hsl(42,87%,55%)]" />
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

      {/* Approach */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-14">Our <span className="text-[hsl(42,87%,55%)]">Approach</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approach.map((a, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="text-center bg-white/[0.03] border border-white/5 rounded-2xl p-8">
                <div className="h-14 w-14 rounded-2xl bg-[hsl(42,87%,55%)]/10 flex items-center justify-center mx-auto mb-5">
                  <a.icon className="h-7 w-7 text-[hsl(42,87%,55%)]" />
                </div>
                <h3 className="font-bold mb-2">{a.title}</h3>
                <p className="text-white/50 text-sm">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 text-center">
        <Link to="/contact"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
          Get a Free Ads Audit <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}
