import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Target, Users, BarChart3, Award } from 'lucide-react';
import denisImg from '@/assets/denis.png';
import danilImg from '@/assets/danil.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const values = [
  { icon: Target, title: 'Data-Driven', desc: 'Every decision backed by CPL, CPA, ROAS and full customer journey analysis.' },
  { icon: Users, title: 'Quality Over Quantity', desc: 'We keep our client list small so every account gets elite-level attention.' },
  { icon: BarChart3, title: 'Custom Systems', desc: 'No cookie-cutter strategies. Tailored systems built for your specific goals.' },
  { icon: Award, title: 'Platform Partners', desc: 'Direct partnerships with Meta, Google & TikTok give our clients unfair advantages.' },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-32 px-6 text-center">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="text-[hsl(42,87%,55%)] text-sm font-semibold tracking-[0.3em] uppercase mb-4">About Us</motion.p>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold max-w-3xl mx-auto leading-tight">
          We Built a <span className="text-[hsl(42,87%,55%)]">Different Model</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="text-white/50 text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
          After 11 years in marketing, paid traffic, and funnel optimization, we've seen how most agencies really operate. That's why AFM Digital exists.
        </motion.p>
      </section>

      {/* Values */}
      <section className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {values.map((v, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 hover:border-[hsl(42,87%,55%)]/20 transition-colors">
              <v.icon className="h-8 w-8 text-[hsl(42,87%,55%)] mb-4" />
              <h3 className="text-lg font-bold mb-2">{v.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Founders */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl font-bold text-center mb-14">Our <span className="text-[hsl(42,87%,55%)]">Founders</span></motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { img: denisImg, name: 'Denis Ishimov', role: 'Co-Founder & CEO', bio: 'Expert in paid traffic strategy, funnel architecture, and scaling digital businesses. Over a decade of hands-on experience managing millions in ad spend across Meta, Google, and TikTok platforms.' },
              { img: danilImg, name: 'Danil Yussupov', role: 'Co-Founder & COO', bio: 'Specialist in performance marketing operations, team leadership, and client growth strategy. Drives the operational excellence that ensures every campaign delivers measurable results.' },
            ].map((f, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 text-center">
                <img src={f.img} alt={f.name} className={`h-24 w-24 rounded-full object-cover mx-auto mb-5 border-2 border-[hsl(42,87%,55%)]/30 ${f.name === 'Denis Ishimov' ? 'object-[center_20%]' : ''}`} />
                <h3 className="text-xl font-bold">{f.name}</h3>
                <p className="text-[hsl(42,87%,55%)] text-sm font-medium mb-4">{f.role}</p>
                <p className="text-white/50 text-sm leading-relaxed">{f.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <Link to="/contact"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
          Work With Us <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </div>
  );
}
