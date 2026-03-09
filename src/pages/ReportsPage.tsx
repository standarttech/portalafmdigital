import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getAfmCampaignIds } from '@/lib/afmCampaignFilter';
import { motion } from 'framer-motion';
import { FileText, Plus, Clock, Calendar, Send, Download, Trash2, Loader2, Eye } from 'lucide-react';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import type { DateRange, Comparison } from '@/components/dashboard/dashboardData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import ReportPreviewDialog from '@/components/reports/ReportPreviewDialog';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface Client { id: string; name: string; category: string; }
interface Report {
  id: string; title: string; client_id: string; status: string;
  date_from: string; date_to: string; created_at: string; content: any;
}

const reportSections = [
  { key: 'kpi_summary', label: 'KPI Summary' },
  { key: 'performance_chart', label: 'Performance Chart' },
  { key: 'platform_breakdown', label: 'Platform Breakdown' },
  { key: 'daily_table', label: 'Daily Table' },
  { key: 'campaigns_list', label: 'Campaigns List' },
  { key: 'notes', label: 'Notes / Annotations' },
];

export default function ReportsPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { user, effectiveRole, simulatedUser } = useAuth();
  const isAdmin = effectiveRole === 'AgencyAdmin';
  const targetUserId = simulatedUser ? simulatedUser.userId : user?.id;
  const [wizardOpen, setWizardOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedScope, setSelectedScope] = useState('client');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(['kpi_summary', 'daily_table', 'campaigns_list']);
  const [creating, setCreating] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewReport, setPreviewReport] = useState<Report | null>(null);

  const fetchClients = useCallback(async () => {
    if (isAdmin) {
      const { data } = await supabase.from('clients').select('id, name, category').order('name');
      setClients(data || []);
      return;
    }

    if (!targetUserId) {
      setClients([]);
      return;
    }

    const { data: assignments } = await supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', targetUserId);

    const scopedClientIds = (assignments || []).map((a) => a.client_id);
    if (scopedClientIds.length === 0) {
      setClients([]);
      return;
    }

    const { data } = await supabase
      .from('clients')
      .select('id, name, category')
      .in('id', scopedClientIds)
      .order('name');

    setClients(data || []);
  }, [isAdmin, targetUserId]);

  const fetchReports = useCallback(async () => {
    if (isAdmin) {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setReports(data || []);
      setLoading(false);
      return;
    }

    if (!targetUserId) {
      setReports([]);
      setLoading(false);
      return;
    }

    const { data: assignments } = await supabase
      .from('client_users')
      .select('client_id')
      .eq('user_id', targetUserId);

    const scopedClientIds = (assignments || []).map((a) => a.client_id);
    if (scopedClientIds.length === 0) {
      setReports([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('reports')
      .select('*')
      .in('client_id', scopedClientIds)
      .order('created_at', { ascending: false })
      .limit(50);

    setReports(data || []);
    setLoading(false);
  }, [isAdmin, targetUserId]);

  useEffect(() => { fetchClients(); fetchReports(); }, [fetchClients, fetchReports]);

  const toggleSection = (key: string) => {
    setSelectedSections(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const resetWizard = () => {
    setWizardStep(1); setSelectedScope('client'); setSelectedClientId(''); setDateFrom(''); setDateTo('');
    setReportTitle(''); setSelectedSections(['kpi_summary', 'daily_table', 'campaigns_list']);
  };

  const handleCreateReport = async () => {
    if (!selectedClientId || !dateFrom || !dateTo) { toast.error(t('auth.allFieldsRequired')); return; }
    setCreating(true);

    const client = clients.find(c => c.id === selectedClientId);
    const clientCategory = client?.category || 'other';

    // AFM FILTER: only AFM campaigns
    const afmIds = await getAfmCampaignIds(selectedClientId);

    // Fetch metrics with category-aware fields
    const isEcom = ['ecom', 'e-commerce', 'ecommerce'].includes(clientCategory.toLowerCase());
    const selectFields = isEcom
      ? 'date, spend, impressions, link_clicks, leads, add_to_cart, checkouts, purchases, revenue, campaign_id'
      : 'date, spend, impressions, link_clicks, leads, campaign_id';

    const { data: metrics } = afmIds.length > 0
      ? await supabase
          .from('daily_metrics')
          .select(selectFields)
          .eq('client_id', selectedClientId)
          .in('campaign_id', afmIds)
          .gte('date', dateFrom)
          .lte('date', dateTo)
          .order('date')
      : { data: [] };

    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, campaign_name, status')
      .eq('client_id', selectedClientId)
      .ilike('campaign_name', '%AFM%');

    const rawMetrics = metrics || [];
    const totals = rawMetrics.reduce((acc, m: any) => ({
      spend: acc.spend + Number(m.spend), impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.link_clicks, leads: acc.leads + m.leads,
      purchases: acc.purchases + Number(m.purchases || 0),
      revenue: acc.revenue + Number(m.revenue || 0),
      addToCart: acc.addToCart + Number(m.add_to_cart || 0),
      checkouts: acc.checkouts + Number(m.checkouts || 0),
    }), { spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0, addToCart: 0, checkouts: 0 });

    const content = {
      sections: selectedSections,
      totals,
      daily: rawMetrics,
      campaigns: campaigns || [],
      clientName: client?.name || '',
      category: clientCategory,
    };

    const title = reportTitle || `${client?.name} — ${dateFrom} to ${dateTo}`;

    const { error } = await supabase.from('reports').insert({
      client_id: selectedClientId,
      title,
      date_from: dateFrom,
      date_to: dateTo,
      status: 'draft',
      content,
      created_by: user?.id,
    });

    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('reports.reportCreated'));
    setWizardOpen(false); resetWizard(); fetchReports();
  };

  const handleDeleteReport = async (id: string) => {
    await supabase.from('reports').delete().eq('id', id);
    toast.success(t('reports.reportDeleted'));
    fetchReports();
  };

  const handlePublish = async (id: string) => {
    await supabase.from('reports').update({ status: 'published' }).eq('id', id);
    toast.success(t('reports.published'));
    fetchReports();
  };

  const handleDownloadCsv = (report: Report) => {
    const content = report.content as any;
    if (!content?.daily?.length) { toast.error(t('common.noData')); return; }

    const isEcom = ['ecom', 'e-commerce', 'ecommerce'].includes((content.category || '').toLowerCase());
    const headers = isEcom
      ? ['Date', 'Spend', 'Impressions', 'Clicks', 'Leads', 'Add to Cart', 'Checkouts', 'Purchases', 'Revenue']
      : ['Date', 'Spend', 'Impressions', 'Clicks', 'Leads'];
    const rows = content.daily.map((r: any) => {
      const base = [r.date, r.spend, r.impressions, r.link_clicks, r.leads];
      if (isEcom) base.push(r.add_to_cart || 0, r.checkouts || 0, r.purchases || 0, r.revenue || 0);
      return base.join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = (report: Report) => {
    const content = report.content as any;
    const isEcom = ['ecom', 'e-commerce', 'ecommerce'].includes((content?.category || '').toLowerCase());
    const totals = content?.totals;
    const daily = content?.daily || [];
    const campaigns = content?.campaigns || [];
    const clientName = content?.clientName || '';
    const categoryLabel = isEcom ? 'E-Commerce' : (content?.category || 'Online Business');

    const cpl = totals && totals.leads > 0 ? (totals.spend / totals.leads).toFixed(2) : '—';
    const ctr = totals && totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0';
    const roas = isEcom && totals && totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : null;

    const ecomKpis = isEcom ? `
      <div class="kpi"><div class="value">${totals?.purchases || 0}</div><div class="label">Purchases</div></div>
      <div class="kpi"><div class="value">$${(totals?.revenue || 0).toFixed(0)}</div><div class="label">Revenue</div></div>
      <div class="kpi"><div class="value">${roas}x</div><div class="label">ROAS</div></div>
    ` : '';

    const dailyRows = daily.slice(0, 30).map((r: any) => {
      const rowCpl = r.leads > 0 ? (r.spend / r.leads).toFixed(2) : '—';
      const ecomCols = isEcom ? `<td>${r.purchases || 0}</td><td>$${Number(r.revenue || 0).toFixed(0)}</td>` : '';
      return `<tr><td>${r.date}</td><td>$${Number(r.spend).toFixed(0)}</td><td>${r.impressions}</td><td>${r.link_clicks}</td><td>${r.leads}</td><td>$${rowCpl}</td>${ecomCols}</tr>`;
    }).join('');

    const ecomHeaders = isEcom ? '<th>Purchases</th><th>Revenue</th>' : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Report — ${clientName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e;background:#fff;padding:40px;max-width:850px;margin:0 auto}
.header{border-bottom:3px solid #D4A843;padding-bottom:20px;margin-bottom:30px}.header h1{font-size:24px;font-weight:700}.header .meta{font-size:12px;color:#666;margin-top:6px}
.section{margin-bottom:28px}.section h2{font-size:16px;font-weight:600;margin-bottom:12px;border-left:4px solid #D4A843;padding-left:10px}
.kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px}.kpi{text-align:center;background:#f8f8fa;border-radius:8px;padding:16px 8px}
.kpi .value{font-size:22px;font-weight:700}.kpi .label{font-size:11px;color:#666;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;padding:8px 6px;border-bottom:2px solid #e0e0e0;color:#666;font-weight:600}
td{padding:7px 6px;border-bottom:1px solid #f0f0f0}.category-badge{display:inline-block;background:#D4A843;color:#fff;padding:2px 8px;border-radius:4px;font-size:10px;margin-left:8px}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e0e0e0;font-size:10px;color:#999;text-align:center}
@media print{body{padding:20px}}
</style></head><body>
<div class="header">
<h1>${report.title}</h1>
<div class="meta">${clientName} · ${report.date_from} → ${report.date_to} · <span class="category-badge">${categoryLabel}</span></div>
</div>
<div class="section"><h2>Key Performance Indicators</h2>
<div class="kpi-grid">
<div class="kpi"><div class="value">$${(totals?.spend || 0).toFixed(0)}</div><div class="label">Total Spend</div></div>
<div class="kpi"><div class="value">${(totals?.impressions || 0).toLocaleString()}</div><div class="label">Impressions</div></div>
<div class="kpi"><div class="value">${(totals?.clicks || 0).toLocaleString()}</div><div class="label">Clicks</div></div>
<div class="kpi"><div class="value">${totals?.leads || 0}</div><div class="label">Leads</div></div>
<div class="kpi"><div class="value">$${cpl}</div><div class="label">CPL</div></div>
<div class="kpi"><div class="value">${ctr}%</div><div class="label">CTR</div></div>
${ecomKpis}
</div></div>
${daily.length > 0 ? `<div class="section"><h2>Daily Breakdown</h2>
<table><tr><th>Date</th><th>Spend</th><th>Impr.</th><th>Clicks</th><th>Leads</th><th>CPL</th>${ecomHeaders}</tr>${dailyRows}</table></div>` : ''}
${campaigns.length > 0 ? `<div class="section"><h2>Campaigns (${campaigns.length})</h2>
<table><tr><th>Campaign</th><th>Status</th></tr>${campaigns.map((c: any) => `<tr><td>${c.campaign_name}</td><td>${c.status}</td></tr>`).join('')}</table></div>` : ''}
<div class="footer">Generated automatically · AFM Digital Platform</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.addEventListener('load', () => { setTimeout(() => w.print(), 500); });
    } else {
      // Fallback: download as HTML
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/[^a-z0-9]/gi, '_')}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.name || clientId.slice(0, 8);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.reports')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('reports.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            comparison={comparison}
            onComparisonChange={setComparison}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
            compareEnabled={compareEnabled}
            onCompareEnabledChange={setCompareEnabled}
          />
        <Dialog open={wizardOpen} onOpenChange={(o) => { setWizardOpen(o); if (!o) resetWizard(); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />{t('reports.createReport')}</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('reports.createReport')}</DialogTitle>
              <DialogDescription>{t('reports.wizardDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`flex items-center gap-1 ${wizardStep >= s ? 'text-primary' : ''}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{s}</div>
                    {s < 3 && <div className={`w-8 h-0.5 ${wizardStep > s ? 'bg-primary' : 'bg-secondary'}`} />}
                  </div>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t('reports.selectClient')}</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                      <SelectTrigger><SelectValue placeholder={t('reports.selectClient')} /></SelectTrigger>
                      <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>{t('common.from')}</Label>
                      <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('common.to')}</Label>
                      <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('common.title')} ({t('auth.messageOptional').split('(')[1]?.replace(')', '') || 'optional'})</Label>
                    <Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="Auto-generated if empty" />
                  </div>
                  <Button onClick={() => setWizardStep(2)} className="w-full" disabled={!selectedClientId || !dateFrom || !dateTo}>
                    {t('reports.next')}
                  </Button>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('reports.selectSections')}</Label>
                  <div className="space-y-2">
                    {reportSections.map(sec => (
                      <label key={sec.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={selectedSections.includes(sec.key)} onCheckedChange={() => toggleSection(sec.key)} />
                        {sec.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">{t('common.back')}</Button>
                    <Button onClick={() => setWizardStep(3)} className="flex-1">{t('reports.next')}</Button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-secondary/50 p-4 text-sm space-y-2">
                    <p><strong>{t('reports.selectClient')}:</strong> {getClientName(selectedClientId)}</p>
                    <p><strong>{t('reports.selectPeriod')}:</strong> {dateFrom} → {dateTo}</p>
                    <p><strong>{t('reports.sections')}:</strong> {selectedSections.length} selected</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">{t('common.back')}</Button>
                    <Button onClick={handleCreateReport} disabled={creating} className="flex-1 gap-2">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      {t('reports.createReport')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </motion.div>

      <motion.div variants={item}>
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"><FileText className="h-8 w-8 text-primary" /></div>
            <h2 className="text-lg font-semibold text-foreground mb-2">{t('common.noData')}</h2>
            <p className="text-muted-foreground text-sm max-w-md">{t('reports.wizardDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const content = report.content as any;
              const totals = content?.totals;
              return (
                <Card key={report.id} className="glass-card">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm truncate">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.date_from} → {report.date_to} · {getClientName(report.client_id)}
                            {content?.category && <span className="ml-1.5 text-primary">({content.category})</span>}
                          </p>
                          {totals && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Spend: {formatCurrency(totals.spend)} · Leads: {formatNumber(totals.leads)} · Clicks: {formatNumber(totals.clicks)}
                              {totals.purchases > 0 && ` · Purchases: ${formatNumber(totals.purchases)}`}
                              {totals.revenue > 0 && ` · Revenue: ${formatCurrency(totals.revenue)}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={report.status === 'published' ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'}>
                          {report.status === 'published' ? t('reports.published') : t('reports.draft')}
                        </Badge>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setPreviewReport(report)}>
                          <Eye className="h-3.5 w-3.5" />{t('reports.preview' as any)}
                        </Button>
                        {report.status === 'draft' && (
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handlePublish(report.id)}>
                            <Send className="h-3.5 w-3.5" />{t('reports.published')}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => handleDownloadCsv(report)}>
                          <Download className="h-3.5 w-3.5" />CSV
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteReport(report.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      <ReportPreviewDialog
        open={!!previewReport}
        onOpenChange={(open) => !open && setPreviewReport(null)}
        report={previewReport}
      />
    </motion.div>
  );
}
