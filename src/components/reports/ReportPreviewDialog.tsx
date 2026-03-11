import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, MousePointerClick, Users, Eye, TrendingUp, ShoppingBag, ShoppingCart } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface ReportContent {
  sections?: string[];
  totals?: { spend: number; impressions: number; clicks: number; leads: number; purchases?: number; revenue?: number; addToCart?: number; checkouts?: number };
  daily?: Array<{ date: string; spend: number; impressions: number; link_clicks: number; leads: number; purchases?: number; revenue?: number; add_to_cart?: number; checkouts?: number }>;
  campaigns?: Array<{ id: string; campaign_name: string; status: string }>;
  clientName?: string;
  category?: string;
}

interface ReportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: {
    title: string;
    date_from: string;
    date_to: string;
    status: string;
    content: any;
  } | null;
}

export default function ReportPreviewDialog({ open, onOpenChange, report }: ReportPreviewDialogProps) {
  const { formatCurrency, formatNumber } = useLanguage();

  if (!report) return null;

  const content = report.content as ReportContent;
  const totals = content?.totals;
  const daily = content?.daily || [];
  const campaigns = content?.campaigns || [];
  const sections = content?.sections || [];
  const isEcom = ['ecom', 'e-commerce', 'ecommerce'].includes((content?.category || '').toLowerCase());

  const cpl = totals && totals.leads > 0 ? totals.spend / totals.leads : 0;
  const ctr = totals && totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals && totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const roas = isEcom && totals && totals.spend > 0 ? (totals.revenue || 0) / totals.spend : 0;

  const kpis = [
    { label: 'Spend', value: formatCurrency(totals?.spend || 0), icon: DollarSign, color: 'text-primary' },
    { label: 'Impressions', value: formatNumber(totals?.impressions || 0), icon: Eye, color: 'text-blue-400' },
    { label: 'Clicks', value: formatNumber(totals?.clicks || 0), icon: MousePointerClick, color: 'text-amber-400' },
    { label: 'Leads', value: formatNumber(totals?.leads || 0), icon: Users, color: 'text-emerald-400' },
    { label: 'CPL', value: formatCurrency(cpl), icon: TrendingUp, color: 'text-purple-400' },
    { label: 'CTR', value: `${ctr.toFixed(2)}%`, icon: TrendingUp, color: 'text-rose-400' },
    ...(isEcom ? [
      { label: 'Purchases', value: formatNumber(totals?.purchases || 0), icon: ShoppingBag, color: 'text-orange-400' },
      { label: 'Revenue', value: formatCurrency(totals?.revenue || 0), icon: DollarSign, color: 'text-emerald-500' },
      { label: 'ROAS', value: `${roas.toFixed(2)}x`, icon: TrendingUp, color: 'text-yellow-500' },
    ] : []),
  ];

  const categoryLabel = isEcom ? 'E-Commerce' : (content?.category || 'Online Business');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {report.title}
            <Badge variant="outline" className={report.status === 'published' ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}>
              {report.status}
            </Badge>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              {categoryLabel}
            </Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{report.date_from} → {report.date_to} · {content?.clientName}</p>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* KPI Summary */}
          {sections.includes('kpi_summary') && totals && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {kpis.map(kpi => (
                <Card key={kpi.label} className="glass-card">
                  <CardContent className="p-3 text-center">
                    <kpi.icon className={`h-4 w-4 mx-auto mb-1 ${kpi.color}`} />
                    <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Performance Chart */}
          {sections.includes('performance_chart') && daily.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3 text-foreground">Performance Over Time</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis yAxisId="spend" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis yAxisId="leads" orientation="right" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area yAxisId="spend" type="monotone" dataKey="spend" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" name="Spend" />
                      <Area yAxisId="leads" type="monotone" dataKey="leads" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36% / 0.15)" name="Leads" strokeWidth={2} />
                      {isEcom && <Area yAxisId="spend" type="monotone" dataKey="revenue" stroke="hsl(120 60% 45%)" fill="hsl(120 60% 45% / 0.15)" name="Revenue" />}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Daily Table */}
          {sections.includes('daily_table') && daily.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3 text-foreground">Daily Breakdown</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium">Date</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Spend</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Impr.</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Clicks</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">Leads</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium">CPL</th>
                        {isEcom && <>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium">Purchases</th>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium">Revenue</th>
                        </>}
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map((row, i) => {
                        const rowCpl = row.leads > 0 ? row.spend / row.leads : 0;
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                            <td className="py-1.5 px-2 text-foreground">{row.date}</td>
                            <td className="py-1.5 px-2 text-right text-foreground">{formatCurrency(row.spend)}</td>
                            <td className="py-1.5 px-2 text-right text-muted-foreground">{formatNumber(row.impressions)}</td>
                            <td className="py-1.5 px-2 text-right text-muted-foreground">{formatNumber(row.link_clicks)}</td>
                            <td className="py-1.5 px-2 text-right font-medium text-foreground">{row.leads}</td>
                            <td className="py-1.5 px-2 text-right text-muted-foreground">{rowCpl > 0 ? formatCurrency(rowCpl) : '—'}</td>
                            {isEcom && <>
                              <td className="py-1.5 px-2 text-right text-foreground">{row.purchases || 0}</td>
                              <td className="py-1.5 px-2 text-right text-foreground">{formatCurrency(Number(row.revenue || 0))}</td>
                            </>}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold">
                        <td className="py-2 px-2 text-foreground">Total</td>
                        <td className="py-2 px-2 text-right text-foreground">{formatCurrency(totals?.spend || 0)}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{formatNumber(totals?.impressions || 0)}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{formatNumber(totals?.clicks || 0)}</td>
                        <td className="py-2 px-2 text-right font-bold text-foreground">{totals?.leads || 0}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{cpl > 0 ? formatCurrency(cpl) : '—'}</td>
                        {isEcom && <>
                          <td className="py-2 px-2 text-right font-bold text-foreground">{totals?.purchases || 0}</td>
                          <td className="py-2 px-2 text-right font-bold text-foreground">{formatCurrency(totals?.revenue || 0)}</td>
                        </>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaigns List */}
          {sections.includes('campaigns_list') && campaigns.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3 text-foreground">Campaigns ({campaigns.length})</p>
                <div className="space-y-1.5">
                  {campaigns.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
                      <span className="text-sm text-foreground truncate">{c.campaign_name}</span>
                      <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform Breakdown placeholder */}
          {sections.includes('platform_breakdown') && (
            <Card className="glass-card">
              <CardContent className="p-4 text-center text-sm text-muted-foreground py-8">
                Platform Breakdown — available with multi-platform data
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}