/**
 * Category-based metric column definitions for client dashboards.
 * Each category has default visible columns and all available columns.
 * Admins can override visible columns per client (saved in clients.visible_columns).
 */

export type ClientCategory = 'ecom' | 'info_product' | 'online_business' | 'local_business' | 'real_estate' | 'saas' | 'other';

export interface MetricColumn {
  key: string;
  labelKey: string; // i18n key
  group: 'core' | 'engagement' | 'conversion' | 'revenue' | 'calculated';
  right?: boolean;
  format: 'currency' | 'number' | 'percent' | 'text';
  /** field name in daily_metrics table (null = calculated) */
  dbField?: string;
}

// All possible metric columns across all categories
export const ALL_METRIC_COLUMNS: MetricColumn[] = [
  // Core
  { key: 'date', labelKey: 'metric.date', group: 'core', format: 'text' },
  { key: 'spend', labelKey: 'metric.spend', group: 'core', right: true, format: 'currency', dbField: 'spend' },
  { key: 'impressions', labelKey: 'metric.impressions', group: 'core', right: true, format: 'number', dbField: 'impressions' },
  { key: 'reach', labelKey: 'metric.reach', group: 'core', right: true, format: 'number' },
  { key: 'clicks', labelKey: 'metric.clicks', group: 'engagement', right: true, format: 'number', dbField: 'link_clicks' },

  // Calculated engagement
  { key: 'cpc', labelKey: 'metric.cpc', group: 'calculated', right: true, format: 'currency' },
  { key: 'cpm', labelKey: 'metric.cpm', group: 'calculated', right: true, format: 'currency' },
  { key: 'ctr', labelKey: 'metric.ctr', group: 'calculated', right: true, format: 'percent' },

  // Lead generation
  { key: 'leads', labelKey: 'metric.leads', group: 'conversion', right: true, format: 'number', dbField: 'leads' },
  { key: 'cpl', labelKey: 'metric.cpl', group: 'calculated', right: true, format: 'currency' },
  { key: 'leadCv', labelKey: 'metric.leadCv', group: 'calculated', right: true, format: 'percent' },

  // E-com specific
  { key: 'addToCart', labelKey: 'metric.addToCart', group: 'conversion', right: true, format: 'number', dbField: 'add_to_cart' },
  { key: 'checkouts', labelKey: 'metric.checkouts', group: 'conversion', right: true, format: 'number', dbField: 'checkouts' },
  { key: 'purchases', labelKey: 'metric.purchases', group: 'conversion', right: true, format: 'number', dbField: 'purchases' },
  { key: 'revenue', labelKey: 'metric.revenue', group: 'revenue', right: true, format: 'currency', dbField: 'revenue' },
  { key: 'roas', labelKey: 'metric.roas', group: 'calculated', right: true, format: 'number' },
  { key: 'costPerPurchase', labelKey: 'metric.costPerPurchase', group: 'calculated', right: true, format: 'currency' },
  { key: 'costPerAtc', labelKey: 'metric.costPerAtc', group: 'calculated', right: true, format: 'currency' },
  { key: 'costPerCheckout', labelKey: 'metric.costPerCheckout', group: 'calculated', right: true, format: 'currency' },
  { key: 'cartToCheckout', labelKey: 'metric.cartToCheckout', group: 'calculated', right: true, format: 'percent' },
  { key: 'checkoutToPurchase', labelKey: 'metric.checkoutToPurchase', group: 'calculated', right: true, format: 'percent' },
];

// Default visible columns per category
export const CATEGORY_DEFAULTS: Record<ClientCategory, string[]> = {
  ecom: ['date', 'spend', 'impressions', 'clicks', 'ctr', 'addToCart', 'checkouts', 'purchases', 'revenue', 'roas', 'costPerPurchase'],
  info_product: ['date', 'spend', 'impressions', 'clicks', 'ctr', 'leads', 'cpl', 'leadCv', 'purchases', 'revenue', 'roas'],
  online_business: ['date', 'spend', 'impressions', 'clicks', 'ctr', 'leads', 'cpl', 'leadCv'],
  local_business: ['date', 'spend', 'impressions', 'clicks', 'ctr', 'leads', 'cpl'],
  real_estate: ['date', 'spend', 'impressions', 'clicks', 'ctr', 'leads', 'cpl', 'leadCv'],
  saas: ['date', 'spend', 'impressions', 'clicks', 'ctr', 'leads', 'cpl', 'purchases', 'revenue', 'roas'],
  other: ['date', 'spend', 'impressions', 'clicks', 'ctr', 'leads', 'cpl'],
};

// KPI cards per category
export const CATEGORY_KPIS: Record<ClientCategory, string[]> = {
  ecom: ['spend', 'revenue', 'roas', 'purchases', 'costPerPurchase', 'addToCart'],
  info_product: ['spend', 'leads', 'cpl', 'purchases', 'revenue', 'roas'],
  online_business: ['spend', 'leads', 'cpl', 'clicks', 'ctr', 'impressions'],
  local_business: ['spend', 'leads', 'cpl', 'clicks', 'ctr', 'impressions'],
  real_estate: ['spend', 'leads', 'cpl', 'clicks', 'ctr', 'impressions'],
  saas: ['spend', 'leads', 'cpl', 'revenue', 'roas', 'purchases'],
  other: ['spend', 'leads', 'cpl', 'clicks', 'ctr', 'impressions'],
};

// Chart metrics per category (what lines to show)
export const CATEGORY_CHART_METRICS: Record<ClientCategory, { key: string; color: string; gradientId: string }[]> = {
  ecom: [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG' },
    { key: 'revenue', color: 'hsl(160, 84%, 39%)', gradientId: 'revenueG' },
    { key: 'purchases', color: 'hsl(217, 91%, 60%)', gradientId: 'purchasesG' },
  ],
  info_product: [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG' },
    { key: 'leads', color: 'hsl(160, 84%, 39%)', gradientId: 'leadsG' },
    { key: 'revenue', color: 'hsl(217, 91%, 60%)', gradientId: 'revenueG' },
  ],
  online_business: [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG' },
    { key: 'leads', color: 'hsl(160, 84%, 39%)', gradientId: 'leadsG' },
    { key: 'cpl', color: 'hsl(217, 91%, 60%)', gradientId: 'cplG' },
  ],
  local_business: [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG' },
    { key: 'leads', color: 'hsl(160, 84%, 39%)', gradientId: 'leadsG' },
    { key: 'cpl', color: 'hsl(217, 91%, 60%)', gradientId: 'cplG' },
  ],
  real_estate: [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG' },
    { key: 'leads', color: 'hsl(160, 84%, 39%)', gradientId: 'leadsG' },
    { key: 'cpl', color: 'hsl(217, 91%, 60%)', gradientId: 'cplG' },
  ],
  saas: [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG' },
    { key: 'leads', color: 'hsl(160, 84%, 39%)', gradientId: 'leadsG' },
    { key: 'revenue', color: 'hsl(217, 91%, 60%)', gradientId: 'revenueG' },
  ],
  other: [
    { key: 'spend', color: 'hsl(42, 87%, 55%)', gradientId: 'spendG' },
    { key: 'leads', color: 'hsl(160, 84%, 39%)', gradientId: 'leadsG' },
    { key: 'cpl', color: 'hsl(217, 91%, 60%)', gradientId: 'cplG' },
  ],
};

/** Map DB category string to ClientCategory */
export function toClientCategory(cat?: string | null): ClientCategory {
  const map: Record<string, ClientCategory> = {
    ecom: 'ecom', 'e-com': 'ecom', 'e-commerce': 'ecom', ecommerce: 'ecom',
    info_product: 'info_product', infoproduct: 'info_product', 'info product': 'info_product',
    online_business: 'online_business', 'online business': 'online_business', onlinebusiness: 'online_business',
    local_business: 'local_business', 'local business': 'local_business',
    real_estate: 'real_estate', 'real estate': 'real_estate',
    saas: 'saas',
    other: 'other',
  };
  return map[(cat || '').toLowerCase()] || 'other';
}

/** Category label keys for the selector */
export const CATEGORY_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'ecom', labelKey: 'clients.ecom' },
  { value: 'info_product', labelKey: 'clients.infoProduct' },
  { value: 'online_business', labelKey: 'clients.onlineBusiness' },
  { value: 'local_business', labelKey: 'clients.localBusiness' },
  { value: 'real_estate', labelKey: 'clients.realEstate' },
  { value: 'saas', labelKey: 'clients.saas' },
  { value: 'other', labelKey: 'clients.other' },
];

/** Compute a daily row from raw metrics */
export function computeDailyRow(raw: {
  date: string; spend: number; impressions: number; clicks: number; leads: number;
  add_to_cart?: number; checkouts?: number; purchases?: number; revenue?: number;
}) {
  const { spend, impressions, clicks, leads } = raw;
  const atc = raw.add_to_cart || 0;
  const co = raw.checkouts || 0;
  const pur = raw.purchases || 0;
  const rev = raw.revenue || 0;
  return {
    date: raw.date,
    spend: Math.round(spend * 100) / 100,
    impressions,
    reach: Math.round(impressions * 0.85),
    clicks,
    cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
    cpm: impressions > 0 ? Math.round((spend / (impressions / 1000)) * 100) / 100 : 0,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
    leads,
    cpl: leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0,
    leadCv: clicks > 0 ? Math.round((leads / clicks) * 10000) / 100 : 0,
    addToCart: atc,
    checkouts: co,
    purchases: pur,
    revenue: Math.round(rev * 100) / 100,
    roas: spend > 0 ? Math.round((rev / spend) * 100) / 100 : 0,
    costPerPurchase: pur > 0 ? Math.round((spend / pur) * 100) / 100 : 0,
    costPerAtc: atc > 0 ? Math.round((spend / atc) * 100) / 100 : 0,
    costPerCheckout: co > 0 ? Math.round((spend / co) * 100) / 100 : 0,
    cartToCheckout: atc > 0 ? Math.round((co / atc) * 10000) / 100 : 0,
    checkoutToPurchase: co > 0 ? Math.round((pur / co) * 10000) / 100 : 0,
  };
}

/** Format a metric value */
export function formatMetricValue(key: string, value: number, fc: (n: number) => string, fn: (n: number) => string): string {
  const col = ALL_METRIC_COLUMNS.find(c => c.key === key);
  if (!col) return String(value);
  switch (col.format) {
    case 'currency': return fc(value);
    case 'number': return fn(value);
    case 'percent': return `${value.toFixed(2)}%`;
    default: return String(value);
  }
}

/** Get icon name for a metric */
export function getMetricIcon(key: string): string {
  const map: Record<string, string> = {
    spend: 'DollarSign', revenue: 'DollarSign', roas: 'TrendingUp',
    leads: 'Users', purchases: 'ShoppingBag', addToCart: 'ShoppingCart',
    checkouts: 'CreditCard', clicks: 'MousePointerClick', impressions: 'Eye',
    cpl: 'TrendingUp', ctr: 'BarChart3', cpc: 'DollarSign', cpm: 'DollarSign',
    costPerPurchase: 'TrendingUp', costPerAtc: 'TrendingUp', costPerCheckout: 'TrendingUp',
    leadCv: 'BarChart3', reach: 'Eye',
  };
  return map[key] || 'BarChart3';
}
