import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, BarChart3, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import demoDashboard from '@/assets/demo-dashboard.jpg';
import demoCrm from '@/assets/demo-crm.jpg';
import demoReports from '@/assets/demo-reports.jpg';

const slides = [
  { img: demoDashboard, title: 'Analytics Dashboard', desc: 'Real-time KPIs — CPL, ROAS, Leads, Spend — all in one premium interface with interactive charts.', icon: Monitor },
  { img: demoCrm, title: 'CRM & Lead Management', desc: 'Built-in CRM with kanban boards, lead scoring, and automated pipeline tracking for every campaign.', icon: Users },
  { img: demoReports, title: 'Performance Reports', desc: 'Detailed campaign breakdowns, custom date ranges, and exportable PDF reports for stakeholders.', icon: BarChart3 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function PlatformDemo() {
  const [active, setActive] = useState(0);

  const prev = () => setActive(i => (i === 0 ? slides.length - 1 : i - 1));
  const next = () => setActive(i => (i === slides.length - 1 ? 0 : i + 1));

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 bg-white/[0.01]">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-center mb-8 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(42,87%,55%)]/10 border border-[hsl(42,87%,55%)]/20 mb-4 sm:mb-6">
            <Monitor className="h-4 w-4 text-[hsl(42,87%,55%)]" />
            <span className="text-[hsl(42,87%,55%)] text-xs font-semibold tracking-wider uppercase">Platform Preview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Your <span className="text-[hsl(42,87%,55%)]">Client Portal</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            Every client gets access to a premium analytics dashboard — real-time data, reports, and campaign management in one place.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8">
          {slides.map((s, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                active === i
                  ? 'bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)]'
                  : 'bg-white/[0.05] text-white/50 hover:text-white hover:bg-white/[0.08]'
              }`}>
              <s.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Screenshot */}
        <div className="relative">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            {/* Browser bar */}
            <div className="h-8 sm:h-10 bg-white/[0.05] border-b border-white/5 flex items-center px-3 sm:px-4 gap-1.5 sm:gap-2">
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-white/10" />
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-white/10" />
              <div className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-white/10" />
              <div className="flex-1 mx-2 sm:mx-4">
                <div className="bg-white/[0.05] rounded-md h-5 sm:h-6 max-w-sm mx-auto flex items-center justify-center">
                  <span className="text-white/30 text-[9px] sm:text-[10px]">app.afmdigital.com</span>
                </div>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={slides[active].img}
                alt={slides[active].title}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="w-full aspect-video object-cover"
                loading="lazy"
              />
            </AnimatePresence>
          </div>

          {/* Nav arrows */}
          <button onClick={prev} aria-label="Previous slide"
            className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button onClick={next} aria-label="Next slide"
            className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/70 hover:text-white transition-colors">
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Caption */}
        <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mt-4 sm:mt-6">
          <h3 className="text-base sm:text-lg font-bold text-white">{slides[active].title}</h3>
          <p className="text-white/50 text-xs sm:text-sm mt-1 max-w-lg mx-auto">{slides[active].desc}</p>
        </motion.div>
      </div>
    </section>
  );
}
