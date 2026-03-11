import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2, DollarSign, Eye, MousePointerClick, Users, TrendingUp, ShoppingBag, FileDown } from 'lucide-react';
import { generateCSV, downloadCSV } from '@/lib/portalExport';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useCallback, useRef } from 'react';

function fmt$(v: number) { return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtN(v: number) { return v.toLocaleString('en-US'); }

export default function PublicReportPage() {
  const { id } = useParams<{ id: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['public-report', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('id, title, date_from, date_to, status, content, created_at')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Report not found');
      return data;
    },
    enabled: !!id,
  });

  const content = report?.content as any;
  const totals = content?.totals;
  const daily = (content?.daily as any[] | undefined) || [];
  const campaigns = (content?.campaigns as any[] | undefined) || [];
  const sections = content?.sections || ['kpi_summary', 'daily_table', 'campaigns_list'];
  const isEcom = ['ecom', 'e-commerce', 'ecommerce'].includes((content?.category || '').toLowerCase());

  const cpl = totals && totals.leads > 0 ? totals.spend / totals.leads : 0;
  const ctr = totals && totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const roas = isEcom && totals && totals.spend > 0 ? (totals.revenue || 0) / totals.spend : 0;

  const kpis = totals ? [
    { label: 'Spend', value: fmt$(totals.spend), icon: DollarSign, color: 'text-primary' },
    { label: 'Impressions', value: fmtN(totals.impressions), icon: Eye, color: 'text-blue-400' },
    { label: 'Clicks', value: fmtN(totals.clicks), icon: MousePointerClick, color: 'text-amber-400' },
    { label: 'Leads', value: fmtN(totals.leads), icon: Users, color: 'text-emerald-400' },
    { label: 'CPL', value: cpl > 0 ? fmt$(cpl) : '—', icon: TrendingUp, color: 'text-purple-400' },
    { label: 'CTR', value: `${ctr.toFixed(2)}%`, icon: TrendingUp, color: 'text-rose-400' },
    ...(isEcom ? [
      { label: 'Purchases', value: fmtN(totals.purchases || 0), icon: ShoppingBag, color: 'text-orange-400' },
      { label: 'Revenue', value: fmt$(totals.revenue || 0), icon: DollarSign, color: 'text-emerald-500' },
      { label: 'ROAS', value: `${roas.toFixed(2)}x`, icon: TrendingUp, color: 'text-yellow-500' },
    ] : []),
  ] : [];

  const categoryLabel = isEcom ? 'E-Commerce' : (content?.category || 'Online Business');

  const handleDownloadCSV = useCallback(() => {
    if (!daily.length || !report) return;
    const headers = ['Date', 'Spend', 'Impressions', 'Clicks', 'Leads', 'CPL', ...(isEcom ? ['Purchases', 'Revenue'] : [])];
    const keys = ['date', 'spend', 'impressions', 'link_clicks', 'leads', 'cpl', ...(isEcom ? ['purchases', 'revenue'] : [])];
    const rows = daily.map((d: any) => {
      const rowCpl = d.leads > 0 ? (Number(d.spend || 0) / d.leads).toFixed(2) : '—';
      return {
        date: d.date,
        spend: Number(d.spend || 0).toFixed(2),
        impressions: d.impressions || 0,
        link_clicks: d.link_clicks || 0,
        leads: d.leads || 0,
        cpl: rowCpl,
        purchases: d.purchases || 0,
        revenue: Number(d.revenue || 0).toFixed(2),
      };
    });
    const csv = generateCSV(headers, rows, keys);
    downloadCSV(csv, `report-${report.date_from}-${report.date_to}.csv`);
  }, [daily, report, isEcom]);

  const handleDownloadPDF = useCallback(() => {
    window.print();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-3">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Report not found</h1>
          <p className="text-muted-foreground text-sm">This report link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12" ref={printRef}>
          {/* Header */}
          <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{content?.clientName || report.title}</h1>
              <Badge variant="outline" className="text-[10px]">
                {report.date_from} → {report.date_to}
              </Badge>
              <Badge variant="outline" className={report.status === 'published' ? 'border-emerald-500/30 text-emerald-500' : 'border-amber-500/30 text-amber-500'}>
                {report.status}
              </Badge>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                {categoryLabel}
              </Badge>
            </div>
            <div className="flex gap-2 no-print">
              <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2">
                <FileDown className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* KPI Summary */}
            {sections.includes('kpi_summary') && totals && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print-break">
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
            {daily.length > 0 && (
              <Card className="glass-card print-break">
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
              <Card className="glass-card print-break">
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
                        {daily.map((row: any, i: number) => {
                          const rowCpl = row.leads > 0 ? Number(row.spend || 0) / row.leads : 0;
                          return (
                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                              <td className="py-1.5 px-2 text-foreground">{row.date}</td>
                              <td className="py-1.5 px-2 text-right text-foreground">{fmt$(Number(row.spend || 0))}</td>
                              <td className="py-1.5 px-2 text-right text-muted-foreground">{fmtN(row.impressions || 0)}</td>
                              <td className="py-1.5 px-2 text-right text-muted-foreground">{fmtN(row.link_clicks || 0)}</td>
                              <td className="py-1.5 px-2 text-right font-medium text-foreground">{row.leads || 0}</td>
                              <td className="py-1.5 px-2 text-right text-muted-foreground">{rowCpl > 0 ? fmt$(rowCpl) : '—'}</td>
                              {isEcom && <>
                                <td className="py-1.5 px-2 text-right text-foreground">{row.purchases || 0}</td>
                                <td className="py-1.5 px-2 text-right text-foreground">{fmt$(Number(row.revenue || 0))}</td>
                              </>}
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-semibold">
                          <td className="py-2 px-2 text-foreground">Total</td>
                          <td className="py-2 px-2 text-right text-foreground">{fmt$(totals?.spend || 0)}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{fmtN(totals?.impressions || 0)}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{fmtN(totals?.clicks || 0)}</td>
                          <td className="py-2 px-2 text-right font-bold text-foreground">{totals?.leads || 0}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{cpl > 0 ? fmt$(cpl) : '—'}</td>
                          {isEcom && <>
                            <td className="py-2 px-2 text-right font-bold text-foreground">{totals?.purchases || 0}</td>
                            <td className="py-2 px-2 text-right font-bold text-foreground">{fmt$(totals?.revenue || 0)}</td>
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
              <Card className="glass-card print-break">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3 text-foreground">Campaigns ({campaigns.length})</p>
                  <div className="space-y-1.5">
                    {campaigns.map((c: any, i: number) => (
                      <div key={c.id || i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
                        <span className="text-sm text-foreground truncate">{c.campaign_name}</span>
                        <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-12 text-center text-muted-foreground text-xs print-break">
            Powered by AFM Digital
          </div>
        </div>
      </div>
    </>
  );
}
