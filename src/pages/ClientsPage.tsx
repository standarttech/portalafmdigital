import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Building2, MoreHorizontal, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Demo client data
const demoClients = [
  {
    id: '1',
    name: 'TechStart Inc.',
    status: 'active' as const,
    platforms: ['meta', 'google'],
    spend: 42500,
    leads: 890,
    cpl: 47.75,
    lastSync: '2 hours ago',
  },
  {
    id: '2',
    name: 'FashionBrand Pro',
    status: 'active' as const,
    platforms: ['meta', 'tiktok'],
    spend: 31200,
    leads: 1240,
    cpl: 25.16,
    lastSync: '1 hour ago',
  },
  {
    id: '3',
    name: 'HealthPlus Medical',
    status: 'active' as const,
    platforms: ['google'],
    spend: 28900,
    leads: 420,
    cpl: 68.81,
    lastSync: '3 hours ago',
  },
  {
    id: '4',
    name: 'AutoDeal Motors',
    status: 'paused' as const,
    platforms: ['meta', 'google', 'tiktok'],
    spend: 55600,
    leads: 680,
    cpl: 81.76,
    lastSync: '12 hours ago',
  },
  {
    id: '5',
    name: 'EduLearn Academy',
    status: 'active' as const,
    platforms: ['meta'],
    spend: 18400,
    leads: 560,
    cpl: 32.86,
    lastSync: '30 min ago',
  },
  {
    id: '6',
    name: 'FoodDelivery Express',
    status: 'inactive' as const,
    platforms: ['tiktok'],
    spend: 0,
    leads: 0,
    cpl: 0,
    lastSync: 'Never',
  },
];

const platformColors: Record<string, string> = {
  meta: 'bg-primary/15 text-primary border-primary/20',
  google: 'bg-success/15 text-success border-success/20',
  tiktok: 'bg-chart-4/15 text-chart-4 border-chart-4/20',
};

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

export default function ClientsPage() {
  const { t, formatCurrency, formatNumber } = useLanguage();
  const [search, setSearch] = useState('');

  const filtered = demoClients.filter((c) =>
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
                    <TableHead>{t('clients.platforms')}</TableHead>
                    <TableHead className="text-right">{t('clients.spend')}</TableHead>
                    <TableHead className="text-right">{t('clients.leads')}</TableHead>
                    <TableHead className="text-right">{t('clients.cpl')}</TableHead>
                    <TableHead>{t('clients.lastSync')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">{client.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[client.status]}>
                          {t(`common.${client.status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {client.platforms.map((p) => (
                            <Badge key={p} variant="outline" className={`text-xs ${platformColors[p]}`}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(client.spend)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNumber(client.leads)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {client.cpl > 0 ? formatCurrency(client.cpl) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {client.lastSync}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
