import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Building2, Plus, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Client {
  id: string;
  name: string;
  status: string;
  currency: string;
  timezone: string;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  active: 'bg-success/15 text-success border-success/20',
  paused: 'bg-warning/15 text-warning border-warning/20',
  inactive: 'bg-muted text-muted-foreground border-border',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

// Demo clients for display when no DB data
const demoClients: Client[] = [
  { id: 'demo-1', name: 'TechStart Inc.', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-01-15' },
  { id: 'demo-2', name: 'FashionBrand Pro', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-02-01' },
  { id: 'demo-3', name: 'HealthPlus Medical', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-01-20' },
  { id: 'demo-4', name: 'AutoDeal Motors', status: 'paused', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2024-11-10' },
  { id: 'demo-5', name: 'EduLearn Academy', status: 'active', currency: 'USD', timezone: 'Europe/Moscow', created_at: '2025-03-05' },
];

export default function ClientsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, status, currency, timezone, created_at')
      .order('name');
    
    if (error || !data || data.length === 0) {
      setClients(demoClients);
    } else {
      setClients(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('clients.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} {t('clients.title').toLowerCase()}
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('clients.addClient')}
        </Button>
      </motion.div>

      <motion.div variants={item}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search') + '...'}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                    <TableHead>Timezone</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {t('common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {t('common.noData')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((client) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-accent/30 transition-colors"
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium text-foreground">{client.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyles[client.status] || ''}>
                            {t(`common.${client.status}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{client.timezone}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{client.currency}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
