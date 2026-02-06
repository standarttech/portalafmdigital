import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Shield, UserCheck, Mail, Clock, CheckCircle2, XCircle, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const roleStyles: Record<string, string> = {
  AgencyAdmin: 'bg-primary/15 text-primary border-primary/20',
  MediaBuyer: 'bg-success/15 text-success border-success/20',
  Client: 'bg-muted text-muted-foreground border-border',
};

const requestStatusStyles: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/20',
  approved: 'bg-success/15 text-success border-success/20',
  denied: 'bg-destructive/15 text-destructive border-destructive/20',
};

const inviteStatusStyles: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/20',
  accepted: 'bg-success/15 text-success border-success/20',
  revoked: 'bg-muted text-muted-foreground border-border',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface AgencyUser {
  id: string;
  user_id: string;
  display_name: string | null;
  agency_role: string;
}

interface AccessRequest {
  id: string;
  full_name: string;
  email: string;
  message: string | null;
  status: string;
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface Client {
  id: string;
  name: string;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MediaBuyer');
  const [inviteClientId, setInviteClientId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Approve dialog state
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveRequest, setApproveRequest] = useState<AccessRequest | null>(null);
  const [approveRole, setApproveRole] = useState('MediaBuyer');
  const [approveClientId, setApproveClientId] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('agency_users')
      .select('id, user_id, display_name, agency_role')
      .order('created_at', { ascending: true });
    setUsers(data || []);
    setLoadingUsers(false);
  }, []);

  const fetchRequests = useCallback(async () => {
    const { data } = await supabase
      .from('access_requests')
      .select('id, full_name, email, message, status, created_at')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoadingRequests(false);
  }, []);

  const fetchInvitations = useCallback(async () => {
    const { data } = await supabase
      .from('invitations')
      .select('id, email, role, token, status, created_at, expires_at')
      .order('created_at', { ascending: false });
    setInvitations(data || []);
    setLoadingInvitations(false);
  }, []);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('status', 'active')
      .order('name');
    setClients(data || []);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRequests();
    fetchInvitations();
    fetchClients();
  }, [fetchUsers, fetchRequests, fetchInvitations, fetchClients]);

  const handleCreateInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error(t('auth.allFieldsRequired'));
      return;
    }
    if (inviteRole === 'Client' && !inviteClientId) {
      toast.error(t('users.selectClient'));
      return;
    }

    setInviteLoading(true);
    const { error } = await supabase.from('invitations').insert({
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      client_id: inviteRole === 'Client' ? inviteClientId : null,
    });
    setInviteLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t('invite.createInvite'));
    setInviteOpen(false);
    setInviteEmail('');
    setInviteRole('MediaBuyer');
    setInviteClientId('');
    fetchInvitations();
  };

  const handleApproveRequest = async () => {
    if (!approveRequest) return;
    if (approveRole === 'Client' && !approveClientId) {
      toast.error(t('users.selectClient'));
      return;
    }

    setApproveLoading(true);

    // Update request status
    await supabase
      .from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', approveRequest.id);

    // Create invitation for this user
    await supabase.from('invitations').insert({
      email: approveRequest.email,
      role: approveRole,
      client_id: approveRole === 'Client' ? approveClientId : null,
    });

    setApproveLoading(false);
    toast.success(t('common.approved'));
    setApproveOpen(false);
    setApproveRequest(null);
    fetchRequests();
    fetchInvitations();
  };

  const handleDenyRequest = async (id: string) => {
    await supabase
      .from('access_requests')
      .update({ status: 'denied', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    toast.success(t('common.denied'));
    fetchRequests();
  };

  const handleRevokeInvitation = async (id: string) => {
    await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', id);
    toast.success(t('common.revoked'));
    fetchInvitations();
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success(t('invite.linkCopied'));
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.display_name || '').toLowerCase().includes(search.toLowerCase()) ||
      u.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('users.title')}</h1>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('invite.inviteUser')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('invite.inviteUser')}</DialogTitle>
              <DialogDescription>{t('auth.requestAccessDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t('common.email')}</Label>
                <Input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MediaBuyer">{t('role.mediaBuyer')}</SelectItem>
                    <SelectItem value="Client">{t('role.client')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteRole === 'Client' && (
                <div className="space-y-2">
                  <Label>{t('users.selectClient')}</Label>
                  <Select value={inviteClientId} onValueChange={setInviteClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('users.selectClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DialogClose>
              <Button onClick={handleCreateInvite} disabled={inviteLoading}>
                {t('invite.createInvite')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              {t('users.tabUsers')}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative">
              <Clock className="h-4 w-4" />
              {t('users.tabRequests')}
              {pendingRequests.length > 0 && (
                <span className="ml-1 h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              {t('users.tabInvitations')}
            </TabsTrigger>
          </TabsList>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('common.search') + '...'} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">User</TableHead>
                        <TableHead>{t('users.role')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                            {t('common.loading')}
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                            {t('common.noData')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map((u) => (
                          <TableRow key={u.id} className="hover:bg-accent/30">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                  {u.agency_role === 'AgencyAdmin' ? (
                                    <Shield className="h-4 w-4 text-primary" />
                                  ) : (
                                    <UserCheck className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{u.display_name || 'No name'}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}...</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={roleStyles[u.agency_role] || ''}>
                                {u.agency_role === 'AgencyAdmin' ? t('role.agencyAdmin') : t('role.mediaBuyer')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACCESS REQUESTS TAB */}
          <TabsContent value="requests" className="space-y-4">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">{t('auth.fullName')}</TableHead>
                        <TableHead>{t('common.email')}</TableHead>
                        <TableHead>{t('auth.messageOptional')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingRequests ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {t('common.loading')}
                          </TableCell>
                        </TableRow>
                      ) : requests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {t('users.noRequests')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        requests.map((r) => (
                          <TableRow key={r.id} className="hover:bg-accent/30">
                            <TableCell className="font-medium text-foreground">{r.full_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {r.message || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={requestStatusStyles[r.status] || ''}>
                                {r.status === 'pending' ? t('common.pending') : r.status === 'approved' ? t('common.approved') : t('common.denied')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {r.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-success border-success/30 hover:bg-success/10"
                                    onClick={() => {
                                      setApproveRequest(r);
                                      setApproveOpen(true);
                                    }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {t('common.approve')}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={() => handleDenyRequest(r.id)}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    {t('common.deny')}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVITATIONS TAB */}
          <TabsContent value="invitations" className="space-y-4">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">{t('common.email')}</TableHead>
                        <TableHead>{t('users.role')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingInvitations ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t('common.loading')}
                          </TableCell>
                        </TableRow>
                      ) : invitations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t('users.noInvitations')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        invitations.map((inv) => (
                          <TableRow key={inv.id} className="hover:bg-accent/30">
                            <TableCell className="font-medium text-foreground">{inv.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={roleStyles[inv.role] || roleStyles.Client}>
                                {inv.role === 'MediaBuyer' ? t('role.mediaBuyer') : t('role.client')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={inviteStatusStyles[inv.status] || ''}>
                                {inv.status === 'pending' ? t('common.pending') : inv.status === 'accepted' ? t('common.accepted') : t('common.revoked')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {inv.status === 'pending' && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() => copyInviteLink(inv.token)}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      {t('invite.copyLink')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                      onClick={() => handleRevokeInvitation(inv.id)}
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      {t('invite.revoke')}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Approve Request Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.approve')}: {approveRequest?.full_name}</DialogTitle>
            <DialogDescription>{approveRequest?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('users.role')}</Label>
              <Select value={approveRole} onValueChange={setApproveRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MediaBuyer">{t('role.mediaBuyer')}</SelectItem>
                  <SelectItem value="Client">{t('role.client')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {approveRole === 'Client' && (
              <div className="space-y-2">
                <Label>{t('users.selectClient')}</Label>
                <Select value={approveClientId} onValueChange={setApproveClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('users.selectClient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('common.cancel')}</Button>
            </DialogClose>
            <Button onClick={handleApproveRequest} disabled={approveLoading}>
              {t('common.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
