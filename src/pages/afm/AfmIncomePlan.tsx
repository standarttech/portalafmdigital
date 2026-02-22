import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import FinanceSheetSync from '@/components/afm/FinanceSheetSync';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

export default function AfmIncomePlan() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-3 h-full flex flex-col overflow-hidden">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            План по доходу на год
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Подключите Google таблицу для работы с данными</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex-1">
        <FinanceSheetSync tabKey="income_plan" />
      </motion.div>
    </motion.div>
  );
}
