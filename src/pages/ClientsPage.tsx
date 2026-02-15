import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Building2, Plus, Search, MoreHorizontal, Pencil, Trash2, Power } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useAdminApproval } from '@/hooks/useAdminApproval';
import type { TranslationKey } from '@/i18n/translations';

interface Client {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
  notes: string | null;
  created_at: string;
  category: string;
}

import { CATEGORY_OPTIONS, CATEGORY_DEFAULTS } from '@/components/dashboard/categoryMetrics';

export const CLIENT_CATEGORIES = CATEGORY_OPTIONS.map(o => ({ value: o.value, label: o.labelKey }));

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const categoryStyles: Record<string, string> = {
  ecom: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  info_product: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  online_business: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  local_business: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  real_estate: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  saas: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  other: 'bg-muted text-muted-foreground border-border',
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const timezones = ['Europe/Moscow', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Tokyo'];

export default function ClientsPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const { agencyRole } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState('');
  const [formTimezone, setFormTimezone] = useState('Europe/Moscow');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState<string>('other');
  const [saving, setSaving] = useState(false);

  const isAdmin = agencyRole === 'AgencyAdmin';
  const { requestApproval } = useAdminApproval();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status, currency, timezone, notes, created_at, category')
      .order('name');

    if (error || !data || data.length === 0) {
      setClients([]);
    } else {
      setClients(data as Client[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openCreate = () => {
    setEditingClient(null);
    setFormName('');
    setFormTimezone('Europe/Moscow');
    setFormCurrency('USD');
    setFormNotes('');
    setFormCategory('other');
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setFormName(client.name);
    setFormTimezone(client.timezone);
    setFormCurrency(client.currency);
    setFormNotes(client.notes || '');
    setFormCategory(client.category || 'other');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error(t('auth.allFieldsRequired')); return; }
    setSaving(true);
    const defaultCols = CATEGORY_DEFAULTS[formCategory as keyof typeof CATEGORY_DEFAULTS] || CATEGORY_DEFAULTS.other;
    if (editingClient) {
      const { error } = await supabase.from('clients').update({
        name: formName.trim(),
        timezone: formTimezone,
        currency: formCurrency,
        notes: formNotes.trim() || null,
        category: formCategory,
      } as any).eq('id', editingClient.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success(t('clients.clientUpdated'));
    } else {
      const { error } = await supabase.from('clients').insert({
        name: formName.trim(),
        timezone: formTimezone,
        currency: formCurrency,
        notes: formNotes.trim() || null,
        status: 'active',
        category: formCategory,
        visible_columns: defaultCols,
      } as any);
      if (error) { toast.error(t('clients.clientCreateError')); setSaving(false); return; }
      toast.success(t('clients.clientCreated'));
    }
    setSaving(false);
    setDialogOpen(false);
    fetchClients();
  };

  const handleStatusChange = async (client: Client, newStatus: string) => {
    await supabase.from('clients').update({ status: newStatus as any }).eq('id', client.id);
    toast.success(t('clients.statusChanged'));
    fetchClients();
  };

  const handleDelete = async (client: Client) => {
    setClientToDelete(client);
    setConfirmDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!clientToDelete) return;
    // Request dual-admin approval for critical action
    const canProceed = await requestApproval({
      action_type: 'delete_client',
      entity_type: 'client',
      entity_id: clientToDelete.id,
      entity_name: clientToDelete.name,
    });
    if (!canProceed) { setConfirmDeleteOpen(false); setClientToDelete(null); return; }
    
    const { error } = await supabase.from('clients').delete().eq('id', clientToDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('clients.clientDeleted'));
    setConfirmDeleteOpen(false);
    setClientToDelete(null);
    fetchClients();
  };

  const filtered = clients
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const statusButtons = ['all', 'active', 'paused', 'inactive'] as const;
  const getCategoryLabel = (cat: string) => {
    const found = CLIENT_CATEGORIES.find(c => c.value === cat);
    return found ? t(found.label as TranslationKey) : cat;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('clients.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} {t('clients.title').toLowerCase()}</p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('clients.addClient')}
          </Button>
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
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('common.timezone')}</TableHead>
                    <TableHead>{t('common.currency')}</TableHead>
                    {isAdmin && <TableHead className="text-right">{t('common.actions')}</TableHead>}
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
                        <Badge variant="outline" className={categoryStyles[client.category] || categoryStyles.other}>
                          {getCategoryLabel(client.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[client.status] || ''}>{t(`common.${client.status}` as TranslationKey)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{client.timezone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{client.currency}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(client)}>
                                <Pencil className="h-4 w-4 mr-2" />{t('clients.editClient')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusChange(client, 'active')} disabled={client.status === 'active'}>
                                <Power className="h-4 w-4 mr-2" />{t('common.active')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(client, 'paused')} disabled={client.status === 'paused'}>
                                <Power className="h-4 w-4 mr-2" />{t('common.paused')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(client, 'inactive')} disabled={client.status === 'inactive'}>
                                <Power className="h-4 w-4 mr-2" />{t('common.inactive')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(client)}>
                                <Trash2 className="h-4 w-4 mr-2" />{t('clients.deleteClient')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClient ? t('clients.editClient') : t('clients.createClient')}</DialogTitle>
            <DialogDescription>{editingClient ? t('clients.editClientDesc') : t('clients.createClientDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('common.name')} *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Client name" />
            </div>
            <div className="space-y-2">
              <Label>{t('common.type')}</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CLIENT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{t(c.label as TranslationKey)}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formCategory === 'ecom' && 'Tracks: Add to Cart, Purchases, Revenue, ROAS, etc.'}
                {formCategory === 'info_product' && 'Tracks: Registrations, Webinar Visits, Sales, etc.'}
                {formCategory === 'online_business' && 'Tracks: Leads, CPL, Lead Conversion, etc.'}
                {formCategory === 'other' && 'Basic metrics. Customize columns after creation.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('common.timezone')}</Label>
              <Select value={formTimezone} onValueChange={setFormTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.currency')}</Label>
              <Select value={formCurrency} onValueChange={setFormCurrency}>
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
              <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('common.creating') : editingClient ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Удалить клиента "${clientToDelete?.name}"?`}
        description="Это действие необратимо. Все данные клиента будут удалены. Если есть другие администраторы, потребуется их подтверждение."
        confirmLabel="Удалить"
        cancelLabel={t('common.cancel')}
        onConfirm={executeDelete}
      />
    </motion.div>
  );
}
