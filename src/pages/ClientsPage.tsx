import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Building2, Plus, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { TranslationKey } from '@/i18n/translations';

interface Client {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
  created_at: string;
  spend: number;
  leads: number;
  cpl: number;
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const demoClients: Client[] = [
  { id: 'demo-1', name: 'TechStart Inc.', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-01-15', spend: 42500, leads: 890, cpl: 47.75 },
  { id: 'demo-2', name: 'FashionBrand Pro', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-02-01', spend: 31200, leads: 520, cpl: 60.00 },
  { id: 'demo-3', name: 'HealthPlus Medical', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-01-20', spend: 28900, leads: 410, cpl: 70.49 },
  { id: 'demo-4', name: 'AutoDeal Motors', status: 'paused', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2024-11-10', spend: 8900, leads: 140, cpl: 63.57 },
  { id: 'demo-5', name: 'EduLearn Academy', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-03-05', spend: 12300, leads: 290, cpl: 42.41 },
];

const timezones = ['Europe/Moscow', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Tokyo'];

export default function ClientsPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { agencyRole } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Create client dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTimezone, setNewTimezone] = useState('Europe/Moscow');
  const [newCurrency, setNewCurrency] = useState('USD');
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status, currency, timezone, created_at')
      .order('name');
    
    if (error || !data || data.length === 0) {
      setClients(demoClients);
    } else {
      setClients(data.map(c => ({ ...c, spend: 0, leads: 0, cpl: 0 })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleCreateClient = async () => {
    if (!newName.trim()) {
      toast.error(t('auth.allFieldsRequired'));
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('clients').insert({
      name: newName.trim(),
      timezone: newTimezone,
      currency: newCurrency,
      notes: newNotes.trim() || null,
      status: 'active',
    });
    setCreating(false);
    if (error) {
      toast.error(t('clients.clientCreateError'));
      return;
    }
    toast.success(t('clients.clientCreated'));
    setCreateOpen(false);
    setNewName('');
    setNewNotes('');
    fetchClients();
  };

  const filtered = clients
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const statusButtons = ['all', 'active', 'paused', 'inactive'] as const;
  const canAddClients = agencyRole === 'AgencyAdmin';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('clients.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} {t('clients.title').toLowerCase()}</p>
        </div>
        {canAddClients && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('clients.addClient')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('clients.createClient')}</DialogTitle>
                <DialogDescription>{t('clients.createClientDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t('common.name')} *</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Client name" />
                </div>
                <div className="space-y-2">
                  <Label>{t('common.timezone')}</Label>
                  <Select value={newTimezone} onValueChange={setNewTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('common.currency')}</Label>
                  <Select value={newCurrency} onValueChange={setNewCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="RUB">RUB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('clients.notes')}</Label>
                  <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes" />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
                <Button onClick={handleCreateClient} disabled={creating}>
                  {creating ? t('common.creating') : t('common.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      <motion.div variants={item} className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.search') + '...'} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5">
          {statusButtons.map(s => (
            <Button key={s} variant="ghost" size="sm" onClick={() => setStatusFilter(s)}
              className={cn('h-7 px-2.5 text-xs rounded-md', statusFilter === s && 'bg-primary text-primary-foreground')}>
              {s === 'all' ? t('dashboard.allStatuses') : t(`common.${s}` as TranslationKey)}
            </Button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t('clients.clientName')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="text-right">{t('clients.spend')}</TableHead>
                    <TableHead className="text-right">{t('clients.leads')}</TableHead>
                    <TableHead className="text-right">{t('clients.cpl')}</TableHead>
                    <TableHead>{t('common.timezone')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
                  ) : filtered.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => navigate(`/clients/${client.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[client.status] || ''}>{t(`common.${client.status}` as TranslationKey)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{client.spend > 0 ? formatCurrency(client.spend) : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{client.leads > 0 ? formatNumber(client.leads) : '—'}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{client.cpl > 0 ? formatCurrency(client.cpl) : '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{client.timezone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
