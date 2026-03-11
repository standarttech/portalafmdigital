import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, FileText, Loader2 } from 'lucide-react';
import { generateCSV, downloadCSV } from '@/lib/portalExport';

export default function PublicReportPage() {
  const { id } = useParams<{ id: string }>();

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
  const daily = content?.daily as any[] | undefined;
  const campaigns = content?.campaigns as any[] | undefined;

  const handleDownloadCSV = () => {
    if (!daily || !report) return;
    const headers = ['Date', 'Spend', 'Impressions', 'Clicks', 'Leads', 'Purchases', 'Revenue'];
    const keys = ['date', 'spend', 'impressions', 'link_clicks', 'leads', 'purchases', 'revenue'];
    const rows = daily.map((d: any) => ({
      date: d.date,
      spend: Number(d.spend || 0).toFixed(2),
      impressions: d.impressions || 0,
      link_clicks: d.link_clicks || 0,
      leads: d.leads || 0,
      purchases: d.purchases || 0,
      revenue: Number(d.revenue || 0).toFixed(2),
    }));
    const csv = generateCSV(headers, rows, keys);
    downloadCSV(csv, `report-${report.date_from}-${report.date_to}.csv`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="text-center space-y-3">
          <FileText className="h-12 w-12 mx-auto text-zinc-500" />
          <h1 className="text-xl font-semibold">Report not found</h1>
          <p className="text-zinc-400 text-sm">This report link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {report.date_from} — {report.date_to}
            </p>
          </div>
          <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-300 hover:text-white">
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        </div>

        {/* KPI Summary */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Spend', value: `$${Number(totals.spend).toFixed(0)}` },
              { label: 'Impressions', value: Number(totals.impressions).toLocaleString() },
              { label: 'Clicks', value: Number(totals.clicks).toLocaleString() },
              { label: 'Leads', value: totals.leads },
              { label: 'CPL', value: totals.leads > 0 ? `$${(totals.spend / totals.leads).toFixed(2)}` : '—' },
              { label: 'CTR', value: totals.impressions > 0 ? `${((totals.clicks / totals.impressions) * 100).toFixed(2)}%` : '0%' },
              ...(totals.purchases > 0 ? [
                { label: 'Purchases', value: totals.purchases },
                { label: 'Revenue', value: `$${Number(totals.revenue).toFixed(0)}` },
                { label: 'ROAS', value: totals.spend > 0 ? `${(totals.revenue / totals.spend).toFixed(2)}x` : '—' },
              ] : []),
            ].map((kpi) => (
              <Card key={kpi.label} className="bg-zinc-900 border-zinc-800 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{kpi.label}</p>
                <p className="text-xl font-bold mt-1">{kpi.value}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Daily Table */}
        {daily && daily.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Daily Breakdown</h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 text-zinc-400">
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Spend</th>
                    <th className="px-3 py-2 text-right">Clicks</th>
                    <th className="px-3 py-2 text-right">Leads</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d: any, i: number) => (
                    <tr key={i} className="border-t border-zinc-800/50 hover:bg-zinc-900/50">
                      <td className="px-3 py-2">{d.date}</td>
                      <td className="px-3 py-2 text-right">${Number(d.spend || 0).toFixed(0)}</td>
                      <td className="px-3 py-2 text-right">{d.link_clicks || 0}</td>
                      <td className="px-3 py-2 text-right">{d.leads || 0}</td>
                      <td className="px-3 py-2 text-right">${Number(d.revenue || 0).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Campaigns */}
        {campaigns && campaigns.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Campaigns</h2>
            <div className="space-y-2">
              {campaigns.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800">
                  <span className="text-sm truncate mr-4">{c.campaign_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 text-center text-zinc-600 text-xs">
          Powered by AFM Digital
        </div>
      </div>
    </div>
  );
}
