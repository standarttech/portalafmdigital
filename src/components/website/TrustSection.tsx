import { motion } from 'framer-motion';
import { Shield, Award, CheckCircle, Star, Clock, Users } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const trustPoints = [
  { icon: Shield, title: 'Official Platform Partners', desc: 'Authorized agency partners of Meta, Google & TikTok with whitelisted ad accounts' },
  { icon: Award, title: '11+ Years of Experience', desc: 'Combined founder expertise in paid traffic, funnels, and performance marketing' },
  { icon: CheckCircle, title: '$42M+ Revenue Generated', desc: 'Proven track record of generating measurable results for clients worldwide' },
  { icon: Star, title: '80+ Growth Projects', desc: 'Successful campaigns across e-commerce, info products, and local businesses' },
  { icon: Clock, title: 'Real-Time Reporting', desc: 'Proprietary client portal with live dashboards, CRM, and automated reports' },
  { icon: Users, title: 'Dedicated Team', desc: 'Small client roster ensures every account gets elite-level strategic attention' },
];

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
  return (
    <>
      {/* Trust grid */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why Clients <span className="text-[hsl(42,87%,55%)]">Trust Us</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              We don't just run ads — we build growth systems backed by data, partnerships, and years of expertise.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trustPoints.map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-[hsl(42,87%,55%)]/20 transition-colors group">
                <div className="h-10 w-10 rounded-xl bg-[hsl(42,87%,55%)]/10 flex items-center justify-center mb-4 group-hover:bg-[hsl(42,87%,55%)]/20 transition-colors">
                  <t.icon className="h-5 w-5 text-[hsl(42,87%,55%)]" />
                </div>
                <h3 className="font-bold mb-1.5">{t.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{t.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl sm:text-4xl font-bold text-center mb-14">
            Client <span className="text-[hsl(42,87%,55%)]">Testimonials</span>
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white/[0.03] border border-white/5 rounded-2xl p-7 flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-[hsl(42,87%,55%)] text-[hsl(42,87%,55%)]" />
                  ))}
                </div>
                <blockquote className="text-white/70 text-sm leading-relaxed flex-1 mb-4">"{t.quote}"</blockquote>
                <div className="border-t border-white/5 pt-4">
                  <p className="text-white font-medium text-sm">{t.author}</p>
                  <p className="text-[hsl(42,87%,55%)] text-xs font-semibold mt-0.5">{t.result}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
