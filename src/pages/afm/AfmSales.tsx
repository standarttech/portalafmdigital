import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Users, TrendingUp, Plus, Phone, Mail, Calendar,
  ChevronRight, Circle, CheckCircle2, Clock, Edit2, Trash2, X, Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const SOURCES = ['Referral', 'Instagram', 'Cold outreach', 'Website', 'LinkedIn', 'TikTok', 'Google Ads', 'Other'];

const EMPTY_LEAD: Omit<Lead, 'id'> = {
  name: '', company: '', email: '', phone: '', status: 'new',
  value: 0, source: 'Website', createdAt: new Date().toISOString().split('T')[0], notes: '',
};

const SAMPLE_LEADS: Lead[] = [
  { id: '1', name: 'Алексей Смирнов', company: 'TechStart LLC', email: 'alex@techstart.com', phone: '+7 999 123-4567', status: 'negotiation', value: 3500, source: 'Referral', createdAt: '2026-02-01', notes: 'Интересует SEO + Meta Ads' },
  { id: '2', name: 'Мария Петрова', company: 'Bloom Beauty', email: 'm.petrova@bloom.ru', phone: '+7 912 987-6543', status: 'proposal', value: 1800, source: 'Instagram', createdAt: '2026-02-05', notes: 'Малый бизнес, нужен SMM' },
  { id: '3', name: 'Дмитрий Козлов', company: 'BuildPro', email: 'dk@buildpro.com', phone: '+7 905 555-0011', status: 'contacted', value: 5000, source: 'Cold outreach', createdAt: '2026-02-10', notes: 'Застройщик, большой бюджет' },
  { id: '4', name: 'Elena Vance', company: 'Vance Fashion', email: 'elena@vance.io', phone: '+7 900 001-2233', status: 'new', value: 2200, source: 'Website', createdAt: '2026-02-15', notes: 'eCommerce, Google + Meta' },
  { id: '5', name: 'Олег Иванов', company: 'FoodDelivery Pro', email: 'o.ivanov@fdpro.ru', phone: '+7 916 777-8899', status: 'won', value: 4000, source: 'Referral', createdAt: '2026-01-20', notes: 'Закрыт на 3 месяца' },
];

interface LeadFormProps {
  initial?: Partial<Lead>;
  onSave: (lead: Omit<Lead, 'id'>) => void;
  onCancel: () => void;
  title: string;
}

function LeadForm({ initial, onSave, onCancel, title }: LeadFormProps) {
  const [form, setForm] = useState<Omit<Lead, 'id'>>({ ...EMPTY_LEAD, ...initial });
  const set = (k: keyof typeof form, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Введите имя'); return; }
    if (!form.company.trim()) { toast.error('Введите компанию'); return; }
    onSave(form);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
      <Card className="glass-card border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{title}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Имя *</Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} className="h-8 text-sm mt-1" placeholder="Иван Петров" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Компания *</Label>
              <Input value={form.company} onChange={e => set('company', e.target.value)} className="h-8 text-sm mt-1" placeholder="LLC Example" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="h-8 text-sm mt-1" placeholder="email@example.com" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Телефон</Label>
              <Input value={form.phone} onChange={e => set('phone', e.target.value)} className="h-8 text-sm mt-1" placeholder="+7 999 000-0000" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Стоимость ($)</Label>
              <Input type="number" value={form.value} onChange={e => set('value', Number(e.target.value))} className="h-8 text-sm mt-1" min={0} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Статус</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Источник</Label>
              <Select value={form.source} onValueChange={v => set('source', v)}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Дата</Label>
              <Input type="date" value={form.createdAt} onChange={e => set('createdAt', e.target.value)} className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Заметки</Label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Комментарии, договорённости..."
              className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="gap-1.5" onClick={handleSubmit}>
              <Save className="h-3.5 w-3.5" /> Сохранить
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>Отмена</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AfmSales() {
  const [leads, setLeads] = useState<Lead[]>(SAMPLE_LEADS);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleAdd = (data: Omit<Lead, 'id'>) => {
    const newLead = { ...data, id: Date.now().toString() };
    setLeads(prev => [newLead, ...prev]);
    setShowAddForm(false);
    toast.success('Лид добавлен');
  };

  const handleEdit = (data: Omit<Lead, 'id'>) => {
    if (!editingLead) return;
    setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...data, id: l.id } : l));
    if (selectedLead?.id === editingLead.id) setSelectedLead({ ...data, id: editingLead.id });
    setEditingLead(null);
    toast.success('Лид обновлён');
  };

  const handleDelete = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    if (selectedLead?.id === id) setSelectedLead(null);
    setDeleteConfirm(null);
    toast.success('Лид удалён');
  };

  const handleStatusChange = (lead: Lead, status: LeadStatus) => {
    const updated = { ...lead, status };
    setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
    setSelectedLead(updated);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">Sales & CRM</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Управление лидами и сделками</p>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Воронка', value: `$${totalPipeline.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-400' },
          { label: 'Закрыто', value: `$${wonRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400' },
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
                  <div
                    key={status}
                    onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
                    className={cn(
                      'flex-1 min-w-[80px] rounded-lg px-2 py-2 border cursor-pointer transition-all',
                      cfg.bg,
                      filterStatus === status ? 'border-current ring-1 ring-current' : 'border-border/30 hover:border-border/60'
                    )}
                  >
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

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div variants={item}>
            <LeadForm title="Добавить лид" onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
          </motion.div>
        )}
        {editingLead && (
          <motion.div variants={item}>
            <LeadForm title="Редактировать лид" initial={editingLead} onSave={handleEdit} onCancel={() => setEditingLead(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leads Table */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
              <CardTitle className="text-sm">Лиды ({filtered.length})</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Поиск..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 text-xs w-full sm:w-40"
                />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={() => { setShowAddForm(true); setEditingLead(null); }}>
                  <Plus className="h-3.5 w-3.5" /> Добавить
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {filtered.map(lead => {
                const cfg = STATUS_CONFIG[lead.status];
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <div key={lead.id}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'
                      )}
                      onClick={() => setSelectedLead(isSelected ? null : lead)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{lead.company} · {lead.source}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        ${lead.value.toLocaleString()}
                      </div>
                      <Badge className={`text-[10px] px-2 py-0.5 ${cfg.bg} ${cfg.color} border-0`}>
                        {cfg.label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={e => { e.stopPropagation(); setEditingLead(lead); setShowAddForm(false); setSelectedLead(null); }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={e => { e.stopPropagation(); setDeleteConfirm(lead.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', isSelected && 'rotate-90')} />
                      </div>
                    </div>

                    {/* Delete confirm */}
                    {deleteConfirm === lead.id && (
                      <div className="px-4 py-2 bg-destructive/5 border-t border-destructive/20 flex items-center gap-3">
                        <span className="text-xs text-destructive">Удалить «{lead.name}»?</span>
                        <Button size="sm" variant="destructive" className="h-6 text-xs px-2" onClick={() => handleDelete(lead.id)}>Удалить</Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
                      </div>
                    )}

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 pt-1 bg-muted/10 border-t border-border/30 space-y-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />{lead.email || '—'}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />{lead.phone || '—'}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />{lead.createdAt}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />{lead.source}
                              </div>
                            </div>
                            {lead.notes && (
                              <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1">{lead.notes}</p>
                            )}
                            <div className="flex gap-1 flex-wrap pt-1">
                              {(Object.entries(STATUS_CONFIG) as [LeadStatus, typeof STATUS_CONFIG[LeadStatus]][]).map(([status, cfg]) => (
                                <button
                                  key={status}
                                  onClick={() => handleStatusChange(lead, status)}
                                  className={cn(
                                    'text-[10px] px-2 py-1 rounded-md border transition-colors font-medium',
                                    lead.status === status
                                      ? `${cfg.bg} ${cfg.color} border-current`
                                      : 'border-border/40 text-muted-foreground hover:border-primary/40'
                                  )}
                                >
                                  {cfg.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Лидов не найдено
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
