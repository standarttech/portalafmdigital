import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, Users, TrendingUp, Plus, Phone, Mail, Calendar, ChevronRight, Circle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

type LeadStatus = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: LeadStatus;
  value: number;
  source: string;
  createdAt: string;
  notes: string;
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string }> = {
  new:         { label: 'Новый',        color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  contacted:   { label: 'Контакт',      color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  proposal:    { label: 'Предложение',  color: 'text-purple-400', bg: 'bg-purple-400/10' },
  negotiation: { label: 'Переговоры',   color: 'text-orange-400', bg: 'bg-orange-400/10' },
  won:         { label: 'Закрыт ✓',    color: 'text-green-400',  bg: 'bg-green-400/10' },
  lost:        { label: 'Потерян',      color: 'text-red-400',    bg: 'bg-red-400/10' },
};

const SAMPLE_LEADS: Lead[] = [
  { id: '1', name: 'Алексей Смирнов', company: 'TechStart LLC', email: 'alex@techstart.com', phone: '+7 999 123-4567', status: 'negotiation', value: 3500, source: 'Referral', createdAt: '2026-02-01', notes: 'Интересует SEO + Meta Ads' },
  { id: '2', name: 'Мария Петрова', company: 'Bloom Beauty', email: 'm.petrova@bloom.ru', phone: '+7 912 987-6543', status: 'proposal', value: 1800, source: 'Instagram', createdAt: '2026-02-05', notes: 'Малый бизнес, нужен SMM' },
  { id: '3', name: 'Дмитрий Козлов', company: 'BuildPro', email: 'dk@buildpro.com', phone: '+7 905 555-0011', status: 'contacted', value: 5000, source: 'Cold outreach', createdAt: '2026-02-10', notes: 'Застройщик, большой бюджет' },
  { id: '4', name: 'Elena Vance', company: 'Vance Fashion', email: 'elena@vance.io', phone: '+7 900 001-2233', status: 'new', value: 2200, source: 'Website', createdAt: '2026-02-15', notes: 'eCommerce, Google + Meta' },
  { id: '5', name: 'Олег Иванов', company: 'FoodDelivery Pro', email: 'o.ivanov@fdpro.ru', phone: '+7 916 777-8899', status: 'won', value: 4000, source: 'Referral', createdAt: '2026-01-20', notes: 'Закрыт на 3 месяца' },
];

export default function AfmSales() {
  const { t } = useLanguage();
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const filtered = leads.filter(l => {
    const matchStatus = filterStatus === 'all' || l.status === filterStatus;
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const totalPipeline = leads.filter(l => !['won', 'lost'].includes(l.status)).reduce((s, l) => s + l.value, 0);
  const wonDeals = leads.filter(l => l.status === 'won');
  const wonRevenue = wonDeals.reduce((s, l) => s + l.value, 0);
  const convRate = leads.length > 0 ? Math.round((wonDeals.length / leads.length) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.sales')} & CRM</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Управление сделками и лидами</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Воронка ($)', value: `$${totalPipeline.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Закрыто ($)', value: `$${wonRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
          { label: 'Лидов', value: leads.length, icon: Users, color: 'text-primary' },
          { label: 'Конверсия', value: `${convRate}%`, icon: CheckCircle2, color: 'text-yellow-400' },
        ].map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Pipeline Kanban summary */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Circle className="h-3.5 w-3.5 text-primary" />Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {(Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(([status, cfg]) => {
                const count = leads.filter(l => l.status === status).length;
                const val = leads.filter(l => l.status === status).reduce((s, l) => s + l.value, 0);
                return (
                  <div key={status} className={`flex-1 min-w-[80px] rounded-lg px-2 py-2 ${cfg.bg} border border-border/30`}>
                    <p className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <p className="text-[10px] text-muted-foreground">${val.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leads Table */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <CardTitle className="text-sm">Лиды</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Поиск..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 text-xs w-full sm:w-40"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {filtered.map(lead => {
                const cfg = STATUS_CONFIG[lead.status];
                return (
                  <div
                    key={lead.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedLead(lead === selectedLead ? null : lead)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      ${lead.value.toLocaleString()}
                    </div>
                    <Badge className={`text-[10px] px-2 py-0.5 ${cfg.bg} ${cfg.color} border-0`}>
                      {cfg.label}
                    </Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">Нет лидов</div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Lead detail panel */}
      {selectedLead && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} variants={item}>
          <Card className="glass-card border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{selectedLead.name}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedLead(null)}>✕</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Компания</p>
                  <p className="font-medium">{selectedLead.company}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Стоимость</p>
                  <p className="font-medium text-green-400">${selectedLead.value.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /><span className="text-xs">{selectedLead.email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /><span className="text-xs">{selectedLead.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /><span className="text-xs">{selectedLead.createdAt}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /><span className="text-xs">{selectedLead.source}</span>
                </div>
              </div>
              {selectedLead.notes && (
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{selectedLead.notes}</div>
              )}
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(([status, cfg]) => (
                  <button
                    key={status}
                    onClick={() => {
                      setLeads(leads.map(l => l.id === selectedLead.id ? { ...l, status } : l));
                      setSelectedLead({ ...selectedLead, status });
                    }}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-md border transition-colors font-medium',
                      selectedLead.status === status
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'border-border/40 text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function cn(...args: (string | boolean | undefined)[]) {
  return args.filter(Boolean).join(' ');
}
