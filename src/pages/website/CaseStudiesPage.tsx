import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const cases = [
  { name: 'Lapin Group', category: 'Info Products', metric: '29,871', desc: 'Webinar registrations in one week', detail: 'Scaled a webinar launch campaign to nearly 30K registrations in a single week through strategic audience targeting and creative testing across Meta platforms.' },
  { name: 'Kelner Homes', category: 'Local Business', metric: '$2,500,000+', desc: 'Revenue generated in 3 months', detail: 'Built a hyper-targeted lead generation system for a real estate company, driving over $2.5M in revenue within the first quarter of partnership.' },
  { name: 'Hyper Cyber', category: 'E-commerce', metric: '+343%', desc: 'Increase in monthly Shopify revenue', detail: 'Transformed an underperforming Shopify store into a high-growth e-commerce brand through ROAS-optimized campaigns and full-funnel retargeting.' },
  { name: 'Market Guru', category: 'Info Products', metric: '$1,317,000', desc: 'Revenue with evergreen webinar', detail: 'Developed and scaled an evergreen webinar funnel that consistently generates seven-figure revenue with stable CPL and high conversion rates.' },
  { name: 'Thomas Kralow', category: 'Info Products', metric: '$171,000', desc: 'Revenue with VSL funnel in 2 months', detail: 'Launched a VSL (Video Sales Letter) funnel campaign that generated $171K in revenue within just two months of operation.' },
  { name: 'Multifamily Expert', category: 'Coaches', metric: '1300%', desc: 'Live webinar ROAS', detail: 'Achieved an extraordinary 1300% ROAS on live webinar campaigns through precise audience segmentation and optimized ad creative.' },
  { name: 'Eurosport', category: 'Media', metric: '22,272', desc: 'Live broadcast subscriptions in 3 weeks', detail: 'Drove over 22K subscriptions for live championship broadcasts in just three weeks through cross-platform campaign optimization.' },
  { name: 'RICHE', category: 'E-commerce', metric: '512%', desc: 'Average ROAS for cosmetic brand', detail: 'Maintained a 512% average ROAS for a cosmetic e-commerce brand through dynamic product ads and advanced audience strategies.' },
  { name: 'Australian Open', category: 'Media', metric: '25,000,000+', desc: 'Impressions for live broadcasts', detail: 'Generated over 25 million impressions for live championship broadcast campaigns through large-scale awareness and engagement strategies.' },
];

export default function CaseStudiesPage() {
  return (
    <div>
      <section className="py-24 sm:py-32 px-4 sm:px-6 text-center">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="text-[hsl(42,87%,55%)] text-xs sm:text-sm font-semibold tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-3 sm:mb-4">Results</motion.p>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold max-w-3xl mx-auto">
          Paid Ads <span className="text-[hsl(42,87%,55%)]">Case Studies</span>
        </motion.h1>
      </section>

      <section className="pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {cases.map((c, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i % 3}
              className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 sm:p-7 hover:border-[hsl(42,87%,55%)]/20 transition-all group">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-white/30 text-xs font-semibold tracking-wider uppercase">{c.name}</span>
                <span className="text-[hsl(42,87%,55%)]/60 text-[10px] font-semibold tracking-wider uppercase bg-[hsl(42,87%,55%)]/10 px-2 py-0.5 rounded-full">{c.category}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent mb-1 sm:mb-2">
                {c.metric}
              </p>
              <p className="text-white/70 text-sm font-medium mb-2 sm:mb-3">{c.desc}</p>
              <p className="text-white/40 text-xs leading-relaxed">{c.detail}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 text-center border-t border-white/5">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Want Results Like These?</h2>
        <p className="text-white/50 mb-6 sm:mb-8 max-w-lg mx-auto text-sm">Book a free ads audit and discover untapped growth opportunities in your traffic.</p>
        <Link to="/contact"
          className="inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold text-sm sm:text-base hover:bg-[hsl(42,87%,65%)] transition-all hover:shadow-[0_0_40px_rgba(217,170,58,0.3)]">
          Book a Free Audit <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </Link>
      </section>
    </div>
  );
}
