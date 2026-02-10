import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Users, Plus, Search, Shield, UserCheck, Mail, Clock, CheckCircle2, XCircle, Copy, RefreshCw, Key, Trash2, Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PERM_KEYS = [
  'can_add_clients', 'can_edit_clients', 'can_assign_clients_to_users',
  'can_connect_integrations', 'can_run_manual_sync', 'can_edit_metrics_override',
  'can_manage_tasks', 'can_publish_reports', 'can_view_audit_log',
] as const;

interface AgencyUser {
  id: string; user_id: string; display_name: string | null; agency_role: string;
}
interface AccessRequest {
  id: string; full_name: string; email: string; message: string | null; status: string; created_at: string;
}
interface Invitation {
  id: string; email: string; role: string; token: string; status: string; created_at: string; expires_at: string;
}
interface Client { id: string; name: string; }
interface UserPermissions {
  user_id: string;
  can_add_clients: boolean; can_edit_clients: boolean; can_assign_clients_to_users: boolean;
  can_connect_integrations: boolean; can_run_manual_sync: boolean; can_edit_metrics_override: boolean;
  can_manage_tasks: boolean; can_publish_reports: boolean; can_view_audit_log: boolean;
}
interface ClientUser { id: string; client_id: string; user_id: string; role: string; }

export default function UsersPage() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AgencyUser[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MediaBuyer');
  const [inviteClientId, setInviteClientId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Approve dialog
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveRequest, setApproveRequest] = useState<AccessRequest | null>(null);
  const [approveRole, setApproveRole] = useState('MediaBuyer');
  const [approveClientId, setApproveClientId] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);

  // Delete user dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AgencyUser | null>(null);

  // Permissions dialog
  const [permOpen, setPermOpen] = useState(false);
  const [permUser, setPermUser] = useState<AgencyUser | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [savingPerms, setSavingPerms] = useState(false);

  // Client assignments dialog
  const [clientsDialogOpen, setClientsDialogOpen] = useState(false);
  const [clientsDialogUser, setClientsDialogUser] = useState<AgencyUser | null>(null);
  const [userClientAssigns, setUserClientAssigns] = useState<ClientUser[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Edit name dialog
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameUser, setEditNameUser] = useState<AgencyUser | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('agency_users').select('id, user_id, display_name, agency_role').order('created_at', { ascending: true });
    setUsers(data || []); setLoadingUsers(false);
  }, []);
  const fetchRequests = useCallback(async () => {
    const { data } = await supabase.from('access_requests').select('id, full_name, email, message, status, created_at').order('created_at', { ascending: false });
    setRequests(data || []); setLoadingRequests(false);
  }, []);
  const fetchInvitations = useCallback(async () => {
    const { data } = await supabase.from('invitations').select('id, email, role, token, status, created_at, expires_at').order('created_at', { ascending: false });
    setInvitations(data || []); setLoadingInvitations(false);
  }, []);
  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('status', 'active').order('name');
    setClients(data || []);
  }, []);

  useEffect(() => { fetchUsers(); fetchRequests(); fetchInvitations(); fetchClients(); }, [fetchUsers, fetchRequests, fetchInvitations, fetchClients]);

  // CRUD handlers
  const handleCreateInvite = async () => {
    if (!inviteEmail.trim()) { toast.error(t('auth.allFieldsRequired')); return; }
    if (inviteRole === 'Client' && !inviteClientId) { toast.error(t('users.selectClient')); return; }
    setInviteLoading(true);
    const { error } = await supabase.functions.invoke('approve-user', {
      body: { action: 'create_invite', email: inviteEmail.trim().toLowerCase(), full_name: inviteEmail.split('@')[0], role: inviteRole, client_id: inviteRole === 'Client' ? inviteClientId : null, permissions: {} },
    });
    setInviteLoading(false);
    if (error) { toast.error(error.message || 'Error'); return; }
    toast.success(t('users.approvedAndEmailSent'));
    setInviteOpen(false); setInviteEmail(''); setInviteRole('MediaBuyer'); setInviteClientId('');
    fetchInvitations(); fetchUsers();
  };

  const handleApproveRequest = async () => {
    if (!approveRequest) return;
    if (approveRole === 'Client' && !approveClientId) { toast.error(t('users.selectClient')); return; }
    setApproveLoading(true);
    const { data, error } = await supabase.functions.invoke('approve-user', {
      body: { action: 'approve', request_id: approveRequest.id, email: approveRequest.email, full_name: approveRequest.full_name, role: approveRole, client_id: approveRole === 'Client' ? approveClientId : null, permissions: {} },
    });
    setApproveLoading(false);
    if (error) { toast.error(error.message || 'Error'); return; }
    if (data?.temp_password) {
      toast.success(t('users.approvedAndEmailSent'), { description: `Temp password: ${data.temp_password}`, duration: 15000,
        action: { label: t('invite.copyLink'), onClick: () => { navigator.clipboard.writeText(data.temp_password); toast.success(t('profile.tempPasswordCopied')); } },
      });
    } else { toast.success(t('users.approvedAndEmailSent')); }
    setApproveOpen(false); setApproveRequest(null); fetchRequests(); fetchInvitations(); fetchUsers();
  };

  const handleDenyRequest = async (request: AccessRequest) => {
    await supabase.functions.invoke('approve-user', { body: { action: 'deny', request_id: request.id, email: request.email } });
    toast.success(t('common.denied')); fetchRequests();
  };

  const handleRevokeInvitation = async (id: string) => {
    await supabase.from('invitations').update({ status: 'revoked' }).eq('id', id);
    toast.success(t('common.revoked')); fetchInvitations();
  };

  const handleResendTempPassword = async (emailOrUserId: string, isUserId = false) => {
    const body: Record<string, string> = { action: 'resend_temp_password' };
    if (isUserId) body.user_id = emailOrUserId; else body.email = emailOrUserId;
    const { data, error } = await supabase.functions.invoke('approve-user', { body });
    if (error) { toast.error(error.message); return; }
    if (data?.temp_password) {
      toast.success(t('users.tempPasswordGenerated'), { description: `Temp password: ${data.temp_password}`, duration: 15000,
        action: { label: t('invite.copyLink'), onClick: () => { navigator.clipboard.writeText(data.temp_password); toast.success(t('profile.tempPasswordCopied')); } },
      });
    }
  };

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite?token=${token}`);
    toast.success(t('invite.linkCopied'));
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    // Delete from agency_users, user_permissions, client_users
    await Promise.all([
      supabase.from('agency_users').delete().eq('user_id', deleteUser.user_id),
      supabase.from('user_permissions').delete().eq('user_id', deleteUser.user_id),
      supabase.from('client_users').delete().eq('user_id', deleteUser.user_id),
      supabase.from('user_settings').delete().eq('user_id', deleteUser.user_id),
    ]);
    toast.success(t('users.userDeleted'));
    setDeleteOpen(false); setDeleteUser(null); fetchUsers();
  };

  // Change role
  const handleChangeRole = async (u: AgencyUser, newRole: string) => {
    await supabase.from('agency_users').update({ agency_role: newRole as any }).eq('user_id', u.user_id);
    toast.success(t('users.roleChanged')); fetchUsers();
  };

  // Permissions
  const openPermissions = async (u: AgencyUser) => {
    setPermUser(u);
    const { data } = await supabase.from('user_permissions').select('*').eq('user_id', u.user_id).maybeSingle();
    const p: Record<string, boolean> = {};
    PERM_KEYS.forEach(k => { p[k] = data ? (data as any)[k] ?? false : false; });
    setPerms(p);
    setPermOpen(true);
  };

  const handleSavePerms = async () => {
    if (!permUser) return;
    setSavingPerms(true);
    const { data: existing } = await supabase.from('user_permissions').select('id').eq('user_id', permUser.user_id).maybeSingle();
    if (existing) {
      await supabase.from('user_permissions').update(perms).eq('user_id', permUser.user_id);
    } else {
      await supabase.from('user_permissions').insert({ user_id: permUser.user_id, ...perms });
    }
    setSavingPerms(false);
    toast.success(t('users.permissionsSaved'));
    setPermOpen(false);
  };

  // Client assignments
  const openClientAssignments = async (u: AgencyUser) => {
    setClientsDialogUser(u);
    const { data } = await supabase.from('client_users').select('id, client_id, user_id, role').eq('user_id', u.user_id);
    setUserClientAssigns(data || []);
    setClientsDialogOpen(true);
  };

  const handleToggleClientAssignment = async (clientId: string, isAssigned: boolean) => {
    if (!clientsDialogUser) return;
    setSavingAssignments(true);
    if (isAssigned) {
      // Remove assignment
      await supabase.from('client_users').delete().eq('user_id', clientsDialogUser.user_id).eq('client_id', clientId);
      setUserClientAssigns(prev => prev.filter(a => a.client_id !== clientId));
    } else {
      // Add assignment
      await supabase.from('client_users').insert({ client_id: clientId, user_id: clientsDialogUser.user_id, role: 'viewer' });
      const { data } = await supabase.from('client_users').select('id, client_id, user_id, role').eq('user_id', clientsDialogUser.user_id);
      setUserClientAssigns(data || []);
    }
    setSavingAssignments(false);
  };

  // Edit display name
  const handleSaveName = async () => {
    if (!editNameUser || !editNameValue.trim()) return;
    await supabase.from('agency_users').update({ display_name: editNameValue.trim() }).eq('user_id', editNameUser.user_id);
    toast.success(t('profile.nameSaved'));
    setEditNameOpen(false); fetchUsers();
  };

  const filteredUsers = users.filter(u =>
    (u.display_name || '').toLowerCase().includes(search.toLowerCase()) || u.user_id.toLowerCase().includes(search.toLowerCase())
  );
  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">{t('users.title')}</h1></div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />{t('invite.inviteUser')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('invite.inviteUser')}</DialogTitle><DialogDescription>{t('auth.requestAccessDescription')}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Label>{t('common.email')}</Label><Input type="email" placeholder={t('auth.emailPlaceholder')} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AgencyAdmin">{t('role.agencyAdmin')}</SelectItem>
                    <SelectItem value="MediaBuyer">{t('role.mediaBuyer')}</SelectItem>
                    <SelectItem value="Client">{t('role.client')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inviteRole === 'Client' && (
                <div className="space-y-2">
                  <Label>{t('users.selectClient')}</Label>
                  <Select value={inviteClientId} onValueChange={setInviteClientId}>
                    <SelectTrigger><SelectValue placeholder={t('users.selectClient')} /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
              <Button onClick={handleCreateInvite} disabled={inviteLoading}>{inviteLoading ? t('users.approving') : t('invite.createInvite')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={item}>
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" />{t('users.tabUsers')}</TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 relative">
              <Clock className="h-4 w-4" />{t('users.tabRequests')}
              {pendingRequests.length > 0 && <span className="ml-1 h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">{pendingRequests.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="invitations" className="gap-2"><Mail className="h-4 w-4" />{t('users.tabInvitations')}</TabsTrigger>
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
                        <TableHead className="min-w-[200px]">{t('common.user')}</TableHead>
                        <TableHead>{t('users.role')}</TableHead>
                        <TableHead>{t('users.assignedClients')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('common.noData')}</TableCell></TableRow>
                      ) : filteredUsers.map(u => (
                        <TableRow key={u.id} className="hover:bg-accent/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                {u.agency_role === 'AgencyAdmin' ? <Shield className="h-4 w-4 text-primary" /> : <UserCheck className="h-4 w-4 text-primary" />}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{u.display_name || 'No name'}</p>
                                <p className="text-xs text-muted-foreground font-mono">{u.user_id.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select value={u.agency_role} onValueChange={(v) => handleChangeRole(u, v)} disabled={u.user_id === currentUser?.id}>
                              <SelectTrigger className="w-[140px] h-8">
                                <Badge variant="outline" className={roleStyles[u.agency_role] || ''}>
                                  {u.agency_role === 'AgencyAdmin' ? t('role.agencyAdmin') : u.agency_role === 'Client' ? t('role.client') : t('role.mediaBuyer')}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AgencyAdmin">{t('role.agencyAdmin')}</SelectItem>
                                <SelectItem value="MediaBuyer">{t('role.mediaBuyer')}</SelectItem>
                                <SelectItem value="Client">{t('role.client')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => openClientAssignments(u)}>
                              <Users className="h-3.5 w-3.5" />
                              {t('users.manageClients')}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('common.edit')}
                                onClick={() => { setEditNameUser(u); setEditNameValue(u.display_name || ''); setEditNameOpen(true); }}>
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('users.editPermissions')} onClick={() => openPermissions(u)}>
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('users.resendTempPassword')} onClick={() => handleResendTempPassword(u.user_id, true)}>
                                <Key className="h-4 w-4" />
                              </Button>
                              {u.user_id !== currentUser?.id && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title={t('users.deleteUser')}
                                  onClick={() => { setDeleteUser(u); setDeleteOpen(true); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                      ) : requests.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('users.noRequests')}</TableCell></TableRow>
                      ) : requests.map(r => (
                        <TableRow key={r.id} className="hover:bg-accent/30">
                          <TableCell className="font-medium text-foreground">{r.full_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.message || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={requestStatusStyles[r.status] || ''}>
                              {r.status === 'pending' ? t('common.pending') : r.status === 'approved' ? t('common.approved') : t('common.denied')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-1 text-success border-success/30 hover:bg-success/10"
                                  onClick={() => { setApproveRequest(r); setApproveOpen(true); }}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />{t('common.approve')}
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => handleDenyRequest(r)}>
                                  <XCircle className="h-3.5 w-3.5" />{t('common.deny')}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('common.loading')}</TableCell></TableRow>
                      ) : invitations.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('users.noInvitations')}</TableCell></TableRow>
                      ) : invitations.map(inv => (
                        <TableRow key={inv.id} className="hover:bg-accent/30">
                          <TableCell className="font-medium text-foreground">{inv.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleStyles[inv.role] || roleStyles.Client}>
                              {inv.role === 'AgencyAdmin' ? t('role.agencyAdmin') : inv.role === 'MediaBuyer' ? t('role.mediaBuyer') : t('role.client')}
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
                                  <Button variant="outline" size="sm" className="gap-1" onClick={() => copyInviteLink(inv.token)}><Copy className="h-3.5 w-3.5" />{t('invite.copyLink')}</Button>
                                  <Button variant="outline" size="sm" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleRevokeInvitation(inv.id)}>
                                    <XCircle className="h-3.5 w-3.5" />{t('invite.revoke')}
                                  </Button>
                                </>
                              )}
                              {inv.status === 'accepted' && (
                                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleResendTempPassword(inv.email)}>
                                  <RefreshCw className="h-3.5 w-3.5" />{t('users.resendTempPassword')}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('common.approve')}: {approveRequest?.full_name}</DialogTitle><DialogDescription>{approveRequest?.email}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('users.role')}</Label>
              <Select value={approveRole} onValueChange={setApproveRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder={t('users.selectClient')} /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleApproveRequest} disabled={approveLoading}>{approveLoading ? t('users.approving') : t('common.approve')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('users.deleteUser')}: {deleteUser?.display_name}</AlertDialogTitle>
            <AlertDialogDescription>{t('users.confirmDeleteUser')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Dialog */}
      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('users.editPermissions')}: {permUser?.display_name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {PERM_KEYS.map(k => (
              <label key={k} className="flex items-center gap-3 cursor-pointer">
                <Switch checked={perms[k] ?? false} onCheckedChange={(v) => setPerms(p => ({ ...p, [k]: v }))} />
                <span className="text-sm">{t(`perm.${k}` as any)}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleSavePerms} disabled={savingPerms}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Assignments Dialog */}
      <Dialog open={clientsDialogOpen} onOpenChange={setClientsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('users.assignedClients')}: {clientsDialogUser?.display_name}</DialogTitle></DialogHeader>
          <div className="space-y-1 py-2 max-h-[400px] overflow-y-auto">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            ) : clients.map(c => {
              const isAssigned = userClientAssigns.some(a => a.client_id === c.id);
              return (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                  <Checkbox
                    checked={isAssigned}
                    onCheckedChange={() => handleToggleClientAssignment(c.id, isAssigned)}
                    disabled={savingAssignments}
                  />
                  <span className={`text-sm ${isAssigned ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{c.name}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.close')}</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t('profile.displayName')}</DialogTitle></DialogHeader>
          <div className="py-2"><Input value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} placeholder={t('auth.fullNamePlaceholder')} /></div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('common.cancel')}</Button></DialogClose>
            <Button onClick={handleSaveName}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
