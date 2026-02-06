import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { FileText, Plus, Clock, Calendar, Send, CheckCircle2, Download, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const demoReports = [
  { id: '1', title: 'Monthly Agency Report — January 2026', scope: 'agency', status: 'published', createdAt: '2026-02-01', dateRange: 'Jan 1–31, 2026' },
  { id: '2', title: 'TechVision Inc. — Weekly Report', scope: 'client', status: 'published', createdAt: '2026-02-03', dateRange: 'Jan 27 – Feb 2, 2026' },
  { id: '3', title: 'GreenLeaf Organic — Monthly', scope: 'client', status: 'draft', createdAt: '2026-02-05', dateRange: 'Jan 1–31, 2026' },
];

const demoTemplates = [
  { id: '1', name: 'Agency Overview', description: 'Full agency performance report', sections: ['KPI Summary', 'Performance Chart', 'Platform Breakdown', 'Clients Table', 'Daily Table'] },
  { id: '2', name: 'Client Report', description: 'Individual client performance', sections: ['KPI Summary', 'Performance Chart', 'Platform Breakdown', 'Daily Table', 'Notes'] },
  { id: '3', name: 'Executive Summary', description: 'High-level KPI summary', sections: ['KPI Summary', 'Platform Breakdown'] },
];

const demoScheduled = [
  { id: '1', name: 'Weekly Agency Report', scope: 'agency', frequency: 'Weekly (Monday)', enabled: true, lastSent: '2026-02-03' },
  { id: '2', name: 'TechVision Monthly', scope: 'client', frequency: 'Monthly (1st)', enabled: true, lastSent: '2026-02-01' },
  { id: '3', name: 'GreenLeaf Weekly', scope: 'client', frequency: 'Weekly (Monday)', enabled: false, lastSent: null },
];

const reportSections = [
  { key: 'kpi_summary', label: 'KPI Summary' },
  { key: 'performance_chart', label: 'Performance Chart' },
  { key: 'platform_breakdown', label: 'Platform Breakdown' },
  { key: 'clients_table', label: 'Clients Table' },
  { key: 'daily_table', label: 'Daily Table' },
  { key: 'notes', label: 'Notes / Annotations' },
];

export default function ReportsPage() {
  const { t } = useLanguage();
  const { agencyRole } = useAuth();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedScope, setSelectedScope] = useState('agency');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>(['kpi_summary', 'performance_chart', 'platform_breakdown', 'daily_table']);
  const isAdmin = agencyRole === 'AgencyAdmin';

  const toggleSection = (key: string) => {
    setSelectedSections(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const resetWizard = () => {
    setWizardStep(1);
    setSelectedScope('agency');
    setSelectedTemplate('');
    setSelectedSections(['kpi_summary', 'performance_chart', 'platform_breakdown', 'daily_table']);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('nav.reports')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('reports.subtitle')}</p>
        </div>
        <Dialog open={wizardOpen} onOpenChange={(o) => { setWizardOpen(o); if (!o) resetWizard(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('reports.createReport')}
            </Button>
          </DialogTrigger>
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
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${wizardStep >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {s}
                    </div>
                    {s < 3 && <div className={`w-8 h-0.5 ${wizardStep > s ? 'bg-primary' : 'bg-secondary'}`} />}
                  </div>
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">{t('reports.selectScope')}</Label>
                  <Select value={selectedScope} onValueChange={setSelectedScope}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agency">{t('reports.agencyWide')}</SelectItem>
                      <SelectItem value="client">{t('reports.singleClient')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-sm font-medium">{t('reports.selectTemplate')}</Label>
                  <Select value={selectedTemplate} onValueChange={(v) => {
                    setSelectedTemplate(v);
                    const tmpl = demoTemplates.find(t => t.id === v);
                    if (tmpl) {
                      setSelectedSections(tmpl.sections.map(s => s.toLowerCase().replace(/ /g, '_')));
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('reports.selectTemplate')} />
                    </SelectTrigger>
                    <SelectContent>
                      {demoTemplates.map(tmpl => (
                        <SelectItem key={tmpl.id} value={tmpl.id}>{tmpl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setWizardStep(2)} className="w-full mt-2">
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
                        <Checkbox
                          checked={selectedSections.includes(sec.key)}
                          onCheckedChange={() => toggleSection(sec.key)}
                        />
                        {sec.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(1)} className="flex-1">
                      {t('common.back')}
                    </Button>
                    <Button onClick={() => setWizardStep(3)} className="flex-1">
                      {t('reports.next')}
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-secondary/50 p-4 text-sm space-y-2">
                    <p><strong>{t('reports.scope')}:</strong> {selectedScope === 'agency' ? t('reports.agencyWide') : t('reports.singleClient')}</p>
                    <p><strong>{t('reports.sections')}:</strong> {selectedSections.length} selected</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setWizardStep(2)} className="flex-1">
                      {t('common.back')}
                    </Button>
                    <Button onClick={() => setWizardOpen(false)} className="flex-1 gap-2">
                      <Download className="h-4 w-4" />
                      {t('reports.generatePdf')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('reports.history')}
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Settings className="h-4 w-4" />
              {t('reports.templates')}
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="gap-2">
              <Calendar className="h-4 w-4" />
              {t('reports.scheduled')}
            </TabsTrigger>
          </TabsList>

          {/* Reports History */}
          <TabsContent value="reports" className="space-y-3">
            {demoReports.map(report => (
              <Card key={report.id} className="glass-card">
                <CardContent className="py-4 px-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{report.title}</p>
                      <p className="text-xs text-muted-foreground">{report.dateRange}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={report.status === 'published' ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'}>
                      {report.status === 'published' ? t('reports.published') : t('reports.draft')}
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                      <Send className="h-3.5 w-3.5" />
                      {t('reports.send')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-3">
            {demoTemplates.map(tmpl => (
              <Card key={tmpl.id} className="glass-card">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{tmpl.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {tmpl.sections.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Scheduled Reports */}
          <TabsContent value="scheduled" className="space-y-3">
            {demoScheduled.map(sched => (
              <Card key={sched.id} className="glass-card">
                <CardContent className="py-4 px-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${sched.enabled ? 'bg-success/10' : 'bg-muted'}`}>
                      {sched.enabled ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{sched.name}</p>
                      <p className="text-xs text-muted-foreground">{sched.frequency} · {sched.scope}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sched.lastSent && (
                      <span className="text-xs text-muted-foreground">
                        {t('reports.lastSent')}: {sched.lastSent}
                      </span>
                    )}
                    <Badge variant="outline" className={sched.enabled ? 'bg-success/15 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}>
                      {sched.enabled ? t('common.active') : t('common.paused')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
