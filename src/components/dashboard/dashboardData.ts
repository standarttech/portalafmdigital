export type DateRange = 'today' | '7d' | '14d' | '30d' | '90d' | 'custom';
export type Comparison = 'none' | 'previous_period' | 'previous_month';
export type PlatformFilter = 'all' | 'meta' | 'google' | 'tiktok';

export interface DashboardFilters {
  dateRange: DateRange;
  comparison: Comparison;
  platform: PlatformFilter;
}

const rangeMultipliers: Record<DateRange, number> = {
  today: 0.033,
  '7d': 0.233,
  '14d': 0.467,
  '30d': 1,
  '90d': 2.8,
  custom: 1,
};

const platformMultipliers: Record<PlatformFilter, number> = {
  all: 1,
  meta: 0.464,
  google: 0.315,
  tiktok: 0.221,
};

export function getScaledValue(base: number, filters: DashboardFilters): number {
  return base * rangeMultipliers[filters.dateRange] * platformMultipliers[filters.platform];
}

const comparisonChanges = {
  previous_period: {
    spend: { value: '+12.3%', positive: false },
    leads: { value: '+18.2%', positive: true },
    clicks: { value: '+8.7%', positive: true },
    cpl: { value: '-4.8%', positive: true },
    ctr: { value: '+0.2%', positive: true },
    clients: { value: '+2', positive: true },
    campaigns: { value: '+5', positive: true },
  },
  previous_month: {
    spend: { value: '+8.1%', positive: false },
    leads: { value: '+14.6%', positive: true },
    clicks: { value: '+6.2%', positive: true },
    cpl: { value: '-6.1%', positive: true },
    ctr: { value: '+0.1%', positive: true },
    clients: { value: '+1', positive: true },
    campaigns: { value: '+3', positive: true },
  },
};

export function getChanges(comparison: Comparison) {
  return comparisonChanges[comparison];
}

interface ChartPoint {
  date: string;
  spend: number;
  leads: number;
  cpl: number;
}

const chartDataByRange: Record<DateRange, ChartPoint[]> = {
  today: [
    { date: '08:00', spend: 850, leads: 12, cpl: 70.83 },
    { date: '10:00', spend: 1200, leads: 28, cpl: 42.86 },
    { date: '12:00', spend: 1450, leads: 35, cpl: 41.43 },
    { date: '14:00', spend: 1100, leads: 22, cpl: 50.00 },
    { date: '16:00', spend: 1350, leads: 31, cpl: 43.55 },
    { date: '18:00', spend: 980, leads: 18, cpl: 54.44 },
    { date: '20:00', spend: 720, leads: 14, cpl: 51.43 },
    { date: '22:00', spend: 450, leads: 8, cpl: 56.25 },
  ],
  '7d': [
    { date: 'Mon', spend: 3200, leads: 67, cpl: 47.76 },
    { date: 'Tue', spend: 3800, leads: 82, cpl: 46.34 },
    { date: 'Wed', spend: 4100, leads: 91, cpl: 45.05 },
    { date: 'Thu', spend: 3500, leads: 73, cpl: 47.95 },
    { date: 'Fri', spend: 4500, leads: 98, cpl: 45.92 },
    { date: 'Sat', spend: 2800, leads: 54, cpl: 51.85 },
    { date: 'Sun', spend: 2600, leads: 48, cpl: 54.17 },
  ],
  '14d': [
    { date: '1', spend: 3100, leads: 65, cpl: 47.69 },
    { date: '2', spend: 3400, leads: 72, cpl: 47.22 },
    { date: '3', spend: 3800, leads: 82, cpl: 46.34 },
    { date: '4', spend: 3200, leads: 68, cpl: 47.06 },
    { date: '5', spend: 4000, leads: 87, cpl: 45.98 },
    { date: '6', spend: 4200, leads: 91, cpl: 46.15 },
    { date: '7', spend: 3600, leads: 75, cpl: 48.00 },
    { date: '8', spend: 3300, leads: 70, cpl: 47.14 },
    { date: '9', spend: 3900, leads: 84, cpl: 46.43 },
    { date: '10', spend: 4100, leads: 89, cpl: 46.07 },
    { date: '11', spend: 3700, leads: 78, cpl: 47.44 },
    { date: '12', spend: 3500, leads: 73, cpl: 47.95 },
    { date: '13', spend: 4300, leads: 93, cpl: 46.24 },
    { date: '14', spend: 3000, leads: 62, cpl: 48.39 },
  ],
  '30d': [
    { date: 'Jan', spend: 12400, leads: 310, cpl: 40.00 },
    { date: 'Feb', spend: 15600, leads: 390, cpl: 40.00 },
    { date: 'Mar', spend: 18200, leads: 478, cpl: 38.08 },
    { date: 'Apr', spend: 16800, leads: 420, cpl: 40.00 },
    { date: 'May', spend: 21000, leads: 525, cpl: 40.00 },
    { date: 'Jun', spend: 24500, leads: 612, cpl: 40.03 },
  ],
  '90d': [
    { date: 'W1', spend: 18500, leads: 400, cpl: 46.25 },
    { date: 'W2', spend: 19200, leads: 415, cpl: 46.27 },
    { date: 'W3', spend: 20100, leads: 435, cpl: 46.21 },
    { date: 'W4', spend: 17800, leads: 385, cpl: 46.23 },
    { date: 'W5', spend: 21500, leads: 465, cpl: 46.24 },
    { date: 'W6', spend: 22300, leads: 480, cpl: 46.46 },
    { date: 'W7', spend: 19800, leads: 428, cpl: 46.26 },
    { date: 'W8', spend: 23100, leads: 500, cpl: 46.20 },
    { date: 'W9', spend: 21800, leads: 472, cpl: 46.19 },
    { date: 'W10', spend: 24200, leads: 520, cpl: 46.54 },
    { date: 'W11', spend: 22600, leads: 488, cpl: 46.31 },
    { date: 'W12', spend: 25000, leads: 540, cpl: 46.30 },
  ],
  custom: [],
};
chartDataByRange.custom = chartDataByRange['30d'];

export function getChartData(filters: DashboardFilters): ChartPoint[] {
  const pm = platformMultipliers[filters.platform];
  const base = chartDataByRange[filters.dateRange] || chartDataByRange['30d'];
  return base.map(d => {
    const spend = Math.round(d.spend * pm);
    const leads = Math.round(d.leads * pm);
    return { date: d.date, spend, leads, cpl: leads > 0 ? Math.round(spend / leads * 100) / 100 : 0 };
  });
}

export interface PlatformData {
  name: string;
  key: string;
  spend: number;
  leads: number;
  color: string;
}

export function getPlatformData(filters: DashboardFilters): PlatformData[] {
  const rm = rangeMultipliers[filters.dateRange];
  const all = [
    { name: 'Meta Ads', key: 'meta', spend: Math.round(108500 * rm), leads: Math.round(2240 * rm), color: 'hsl(42, 87%, 55%)' },
    { name: 'Google Ads', key: 'google', spend: Math.round(73600 * rm), leads: Math.round(1520 * rm), color: 'hsl(160, 84%, 39%)' },
    { name: 'TikTok Ads', key: 'tiktok', spend: Math.round(51800 * rm), leads: Math.round(1061 * rm), color: 'hsl(217, 91%, 60%)' },
  ];
  if (filters.platform !== 'all') return all.filter(p => p.key === filters.platform);
  return all;
}

export interface ClientPerformance {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpl: number;
  ctr: number;
  deltaCpl: number;
  status: 'active' | 'inactive' | 'paused';
}

export function getClientPerformanceData(filters: DashboardFilters): ClientPerformance[] {
  const rm = rangeMultipliers[filters.dateRange];
  const pm = platformMultipliers[filters.platform];
  const scale = rm * pm;
  return [
    { id: '1', name: 'TechVision Inc.', spend: Math.round(42500 * scale), leads: Math.round(890 * scale), cpl: 47.75, ctr: 1.32, deltaCpl: -8.2, status: 'active' },
    { id: '2', name: 'GreenLeaf Organic', spend: Math.round(31200 * scale), leads: Math.round(520 * scale), cpl: 60.00, ctr: 0.98, deltaCpl: 12.5, status: 'active' },
    { id: '3', name: 'UrbanStyle Fashion', spend: Math.round(28900 * scale), leads: Math.round(410 * scale), cpl: 70.49, ctr: 0.87, deltaCpl: 18.3, status: 'active' },
    { id: '4', name: 'CloudNet Solutions', spend: Math.round(35600 * scale), leads: Math.round(750 * scale), cpl: 47.47, ctr: 1.45, deltaCpl: -3.1, status: 'active' },
    { id: '5', name: 'FitLife Wellness', spend: Math.round(18700 * scale), leads: Math.round(320 * scale), cpl: 58.44, ctr: 1.12, deltaCpl: 5.7, status: 'active' },
    { id: '6', name: 'Nova Realty', spend: Math.round(15400 * scale), leads: 0, cpl: 0, ctr: 0.65, deltaCpl: 0, status: 'active' },
    { id: '7', name: 'Apex Motors', spend: Math.round(22800 * scale), leads: Math.round(380 * scale), cpl: 60.00, ctr: 1.08, deltaCpl: -1.5, status: 'active' },
    { id: '8', name: 'BrightPath Education', spend: Math.round(12300 * scale), leads: Math.round(290 * scale), cpl: 42.41, ctr: 1.67, deltaCpl: -12.4, status: 'active' },
    { id: '9', name: 'Luxe Interiors', spend: Math.round(8900 * scale), leads: Math.round(140 * scale), cpl: 63.57, ctr: 0.92, deltaCpl: 8.9, status: 'paused' },
    { id: '10', name: 'DataStream Analytics', spend: Math.round(5200 * scale), leads: Math.round(95 * scale), cpl: 54.74, ctr: 1.23, deltaCpl: 2.1, status: 'active' },
    { id: '11', name: 'EcoHome Builders', spend: Math.round(7600 * scale), leads: Math.round(160 * scale), cpl: 47.50, ctr: 1.38, deltaCpl: -5.6, status: 'active' },
    { id: '12', name: 'Swift Logistics', spend: Math.round(4800 * scale), leads: 0, cpl: 0, ctr: 0.45, deltaCpl: 0, status: 'inactive' },
  ];
}

export interface AlertItem {
  id: string;
  type: 'no_leads' | 'high_cpl' | 'sync_delay';
  clientId?: string;
  clientName?: string;
  platform?: string;
  message: string;
}

export function getAlerts(filters: DashboardFilters): AlertItem[] {
  const clients = getClientPerformanceData(filters);
  const alerts: AlertItem[] = [];

  clients.filter(c => c.spend > 0 && c.leads === 0).forEach(c => {
    alerts.push({
      id: `no-leads-${c.id}`,
      type: 'no_leads',
      clientId: c.id,
      clientName: c.name,
      message: `${c.name}: $${c.spend.toLocaleString()} spent, 0 leads`,
    });
  });

  const withCpl = clients.filter(c => c.cpl > 0);
  const avgCpl = withCpl.length > 0 ? withCpl.reduce((s, c) => s + c.cpl, 0) / withCpl.length : 0;
  clients.filter(c => c.cpl > avgCpl * 1.2 && c.cpl > 0).forEach(c => {
    alerts.push({
      id: `high-cpl-${c.id}`,
      type: 'high_cpl',
      clientId: c.id,
      clientName: c.name,
      message: `${c.name}: CPL $${c.cpl.toFixed(2)} (avg $${avgCpl.toFixed(2)})`,
    });
  });

  alerts.push({
    id: 'sync-tiktok',
    type: 'sync_delay',
    platform: 'TikTok Ads',
    message: 'TikTok Ads sync delayed (last: 14h ago)',
  });

  return alerts;
}

export interface SyncStatusItem {
  platform: string;
  lastSync: string;
  status: 'ok' | 'delayed' | 'error';
}

export function getSyncStatusData(): SyncStatusItem[] {
  return [
    { platform: 'Meta Ads', lastSync: '2026-02-06T10:30:00Z', status: 'ok' },
    { platform: 'Google Ads', lastSync: '2026-02-06T09:15:00Z', status: 'ok' },
    { platform: 'TikTok Ads', lastSync: '2026-02-05T20:00:00Z', status: 'delayed' },
  ];
}
