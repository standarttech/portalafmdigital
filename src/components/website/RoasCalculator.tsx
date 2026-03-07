import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, DollarSign, Target } from 'lucide-react';
import { useWebsiteLang } from '@/i18n/WebsiteLangContext';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function RoasCalculator() {
  const { t } = useWebsiteLang();
  const [spend, setSpend] = useState(5000);
  const [avgOrder, setAvgOrder] = useState(150);
  const [convRate, setConvRate] = useState(3);

  const roasMultiplier = 4.2;
  const estimatedRevenue = spend * roasMultiplier;
  const estimatedProfit = estimatedRevenue - spend;
  const estimatedLeads = Math.round((spend / (avgOrder * 0.3)) * (convRate / 100) * 40);
  const estimatedRoas = ((estimatedRevenue / spend) * 100).toFixed(0);

  const sliderClass = "w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(42,87%,55%)] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(217,170,58,0.4)]";

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-center mb-8 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(42,87%,55%)]/10 border border-[hsl(42,87%,55%)]/20 mb-4 sm:mb-6">
            <Calculator className="h-4 w-4 text-[hsl(42,87%,55%)]" />
            <span className="text-[hsl(42,87%,55%)] text-xs font-semibold tracking-wider uppercase">{t('calc.badge')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            {t('calc.title1')} <span className="text-[hsl(42,87%,55%)]">{t('calc.title2')}</span>
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">{t('calc.desc')}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
            className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 sm:p-8 space-y-6 sm:space-y-8">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-[hsl(42,87%,55%)]" /> {t('calc.params')}
            </h3>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-white/70">{t('calc.spend')}</label>
                <span className="text-[hsl(42,87%,55%)] font-bold text-sm">${spend.toLocaleString()}</span>
              </div>
              <input type="range" min={1000} max={100000} step={1000} value={spend}
                onChange={e => setSpend(Number(e.target.value))} className={sliderClass} />
              <div className="flex justify-between text-xs text-white/30 mt-1"><span>$1K</span><span>$100K</span></div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-white/70">{t('calc.aov')}</label>
                <span className="text-[hsl(42,87%,55%)] font-bold text-sm">${avgOrder}</span>
              </div>
              <input type="range" min={20} max={2000} step={10} value={avgOrder}
                onChange={e => setAvgOrder(Number(e.target.value))} className={sliderClass} />
              <div className="flex justify-between text-xs text-white/30 mt-1"><span>$20</span><span>$2,000</span></div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-white/70">{t('calc.convRate')}</label>
                <span className="text-[hsl(42,87%,55%)] font-bold text-sm">{convRate}%</span>
              </div>
              <input type="range" min={1} max={15} step={0.5} value={convRate}
                onChange={e => setConvRate(Number(e.target.value))} className={sliderClass} />
              <div className="flex justify-between text-xs text-white/30 mt-1"><span>1%</span><span>15%</span></div>
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
            className="bg-gradient-to-br from-[hsl(42,87%,55%)]/10 to-transparent border border-[hsl(42,87%,55%)]/20 rounded-2xl p-5 sm:p-8 space-y-4 sm:space-y-6">
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[hsl(42,87%,55%)]" /> {t('calc.results')}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white/[0.05] rounded-xl p-4 sm:p-5">
                <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{t('calc.estRevenue')}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-[hsl(42,87%,55%)] to-[hsl(42,87%,70%)] bg-clip-text text-transparent">${estimatedRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-4 sm:p-5">
                <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{t('calc.estProfit')}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-400">${estimatedProfit.toLocaleString()}</p>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-4 sm:p-5">
                <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider mb-1">ROAS</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[hsl(42,87%,55%)]">{estimatedRoas}%</p>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-4 sm:p-5">
                <p className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider mb-1">{t('calc.estLeads')}</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white">{estimatedLeads}+</p>
              </div>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-[hsl(42,87%,55%)] shrink-0 mt-0.5" />
              <p className="text-white/50 text-[11px] sm:text-xs leading-relaxed">{t('calc.disclaimer')}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
