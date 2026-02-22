import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/i18n/LanguageContext';
import { HelpCircle, ExternalLink } from 'lucide-react';

interface MetricDef {
  term: string;
  shortDef: { en: string; ru: string };
  glossaryKey?: string;
}

const METRIC_DEFS: Record<string, MetricDef> = {
  spend: { term: 'Spend', shortDef: { en: 'Total amount of money spent on advertising.', ru: 'Общая сумма потраченных денег на рекламу.' } },
  cpl: { term: 'CPL', shortDef: { en: 'Cost Per Lead — average spend to acquire one lead.', ru: 'Стоимость лида — средние затраты на привлечение одного лида.' } },
  ctr: { term: 'CTR', shortDef: { en: 'Click-Through Rate — % of impressions that resulted in a click.', ru: 'Кликабельность — % показов, которые привели к клику.' } },
  cpc: { term: 'CPC', shortDef: { en: 'Cost Per Click — average amount paid per ad click.', ru: 'Стоимость клика — средняя стоимость одного клика по рекламе.' } },
  cpm: { term: 'CPM', shortDef: { en: 'Cost Per Mille — cost per 1,000 ad impressions.', ru: 'Стоимость 1000 показов рекламного объявления.' } },
  roas: { term: 'ROAS', shortDef: { en: 'Return On Ad Spend — revenue generated per dollar spent.', ru: 'Возврат на рекламные расходы — выручка на каждый доллар затрат.' } },
  leads: { term: 'Leads', shortDef: { en: 'Potential customers who showed interest via a form or action.', ru: 'Потенциальные клиенты, оставившие заявку или совершившие целевое действие.' } },
  impressions: { term: 'Impressions', shortDef: { en: 'Total number of times your ad was displayed.', ru: 'Общее количество раз, когда ваша реклама была показана.' } },
  clicks: { term: 'Clicks', shortDef: { en: 'Number of clicks on your ad link.', ru: 'Количество кликов по ссылке в вашей рекламе.' } },
  revenue: { term: 'Revenue', shortDef: { en: 'Total income generated from purchases.', ru: 'Общий доход от совершённых покупок.' } },
  purchases: { term: 'Purchases', shortDef: { en: 'Number of completed purchase transactions.', ru: 'Количество завершённых покупок.' } },
  reach: { term: 'Reach', shortDef: { en: 'Number of unique users who saw your ad.', ru: 'Количество уникальных пользователей, увидевших рекламу.' } },
  addToCart: { term: 'Add to Cart', shortDef: { en: 'Number of times users added product to shopping cart.', ru: 'Количество добавлений товара в корзину.' } },
  checkouts: { term: 'Checkouts', shortDef: { en: 'Number of users who started the checkout process.', ru: 'Количество начатых оформлений заказа.' } },
  costPerPurchase: { term: 'Cost/Purchase', shortDef: { en: 'Average ad spend to generate one purchase.', ru: 'Средние рекламные затраты на одну покупку.' } },
};

interface Props {
  metricKey: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  className?: string;
}

export function MetricTooltip({ metricKey, children, showIcon = false, className }: Props) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const def = METRIC_DEFS[metricKey];

  if (!def) return <>{children}</>;

  const isRu = language === 'ru';
  const shortDef = isRu ? def.shortDef.ru : def.shortDef.en;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 cursor-help ${className || ''}`}>
            {children}
            {showIcon && <HelpCircle className="h-3 w-3 text-muted-foreground/50 inline" />}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={8}
          className="max-w-[220px] p-0 overflow-hidden border border-border/50 bg-popover shadow-lg z-50"
        >
          <div className="px-3 py-2 space-y-1.5">
            <p className="text-xs font-semibold text-primary">{def.term}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{shortDef}</p>
            <button
              onClick={() => navigate('/glossary')}
              className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors mt-1"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {isRu ? 'Открыть в глоссарии' : 'View in glossary'}
            </button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
