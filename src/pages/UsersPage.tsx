import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Shield, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

const demoUsers = [
  { id: '1', email: 'admin@afmdigital.com', displayName: 'Admin', role: 'AgencyAdmin', clients: 'All', permissions: 9 },
  { id: '2', email: 'buyer1@afmdigital.com', displayName: 'Ivan Petrov', role: 'MediaBuyer', clients: '3', permissions: 5 },
  { id: '3', email: 'buyer2@afmdigital.com', displayName: 'Anna Smirnova', role: 'MediaBuyer', clients: '4', permissions: 6 },
  { id: '4', email: 'client@techstart.com', displayName: 'TechStart User', role: 'Client', clients: '1', permissions: 0 },
];

const roleStyles: Record<string, string> = {
  AgencyAdmin: 'bg-primary/15 text-primary border-primary/20',
  MediaBuyer: 'bg-success/15 text-success border-success/20',
  Client: 'bg-muted text-muted-foreground border-border',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function UsersPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  const filtered = demoUsers.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('users.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} users</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t('users.addUser')}
        </Button>
      </motion.div>

      <motion.div variants={item}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('common.search') + '...'} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">User</TableHead>
                    <TableHead>{t('users.role')}</TableHead>
                    <TableHead>{t('nav.clients')}</TableHead>
                    <TableHead>{t('users.permissions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id} className="cursor-pointer hover:bg-accent/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            {u.role === 'AgencyAdmin' ? <Shield className="h-4 w-4 text-primary" /> : <UserCheck className="h-4 w-4 text-primary" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{u.displayName}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleStyles[u.role]}>
                          {u.role === 'AgencyAdmin' ? t('role.agencyAdmin') : u.role === 'MediaBuyer' ? t('role.mediaBuyer') : t('role.client')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.clients}</TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">{u.permissions}/9</TableCell>
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
