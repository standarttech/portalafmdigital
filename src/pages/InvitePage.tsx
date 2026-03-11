import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm.png';
import { motion } from 'framer-motion';
import { Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
}

export default function InvitePage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError(t('invite.invalidLink'));
      setLoadingInvite(false);
      return;
    }

    const fetchInvitation = async () => {
      const { data, error } = await supabase
        .rpc('get_invitation_by_token', { _token: token });

      const invite = Array.isArray(data) ? data[0] : data;

      if (error || !invite) {
        setInviteError(t('invite.invalidOrExpired'));
        setLoadingInvite(false);
        return;
      }

      setInvitation({ ...invite, token: token! });
      setLoadingInvite(false);
    };

    fetchInvitation();
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) return;

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      toast.error(t('auth.allFieldsRequired'));
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast.error('Name must be 2-100 characters');
      return;
    }

    if (password.length < 8 || password.length > 128) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Try to sign up (new user)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { display_name: trimmedName },
        },
      });

      let userId: string | null = null;

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          // User already exists (e.g. from a previous invite attempt) — try to sign in
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: invitation.email,
            password,
          });

          if (signInError) {
            // Maybe user has a different password — update via admin in edge function
            // For now, tell user to use their existing password or contact admin
            setIsLoading(false);
            toast.error(t('auth.userExists') + '. ' + t('auth.tryExistingPassword'));
            return;
          }

          userId = signInData.user?.id || null;
        } else {
          setIsLoading(false);
          toast.error(signUpError.message);
          return;
        }
      } else {
        // New user created — sign in immediately (auto-confirm is enabled)
        if (!signUpData.user) {
          setIsLoading(false);
          toast.error('Failed to create account');
          return;
        }

        userId = signUpData.user.id;

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });

        if (signInError) {
          setIsLoading(false);
          toast.error(signInError.message);
          return;
        }
      }

      if (!userId) {
        setIsLoading(false);
        toast.error('Failed to authenticate');
        return;
      }

      // Step 2: Fetch invitation details (client_id, permissions)
      const { data: detailsData } = await supabase
        .rpc('get_invitation_details', { _invitation_id: invitation.id });

      const details = Array.isArray(detailsData) ? detailsData[0] : detailsData;
      const perms = (details?.permissions as Record<string, any>) || {};
      const clientIds: string[] = perms._client_ids || (details?.client_id ? [details.client_id] : []);

      // Step 3: Create agency_users or client_users record (idempotent)
      if (invitation.role === 'Client') {
        for (const cid of clientIds) {
          await supabase.from('client_users').upsert({
            user_id: userId,
            client_id: cid,
            role: 'Client',
          }, { onConflict: 'user_id,client_id' }).select();
        }
      } else {
        // Agency user — upsert to avoid duplicates
        const { data: existingAU } = await supabase
          .from('agency_users')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingAU) {
          await supabase.from('agency_users').insert({
            user_id: userId,
            agency_role: invitation.role as any,
            display_name: trimmedName,
          });
        } else {
          await supabase.from('agency_users').update({
            agency_role: invitation.role as any,
            display_name: trimmedName,
          }).eq('user_id', userId);
        }

        // Assign to clients if provided
        for (const cid of clientIds) {
          const { data: existingCU } = await supabase
            .from('client_users')
            .select('id')
            .eq('user_id', userId)
            .eq('client_id', cid)
            .maybeSingle();

          if (!existingCU) {
            await supabase.from('client_users').insert({
              user_id: userId,
              client_id: cid,
              role: 'viewer',
            });
          }
        }

        // Create permissions (idempotent)
        const { data: existingPerms } = await supabase
          .from('user_permissions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingPerms) {
          await supabase.from('user_permissions').insert({
            user_id: userId,
            can_add_clients: perms.can_add_clients || false,
            can_edit_clients: perms.can_edit_clients || false,
            can_assign_clients_to_users: perms.can_assign_clients_to_users || false,
            can_connect_integrations: perms.can_connect_integrations || false,
            can_run_manual_sync: perms.can_run_manual_sync || false,
            can_edit_metrics_override: perms.can_edit_metrics_override || false,
            can_manage_tasks: perms.can_manage_tasks || false,
            can_publish_reports: perms.can_publish_reports || false,
            can_view_audit_log: perms.can_view_audit_log || false,
          });
        }
      }

      // Step 4: Mark invitation as accepted
      await supabase.rpc('accept_invitation', { _invitation_id: invitation.id });

      // Step 5: Create default user settings (idempotent)
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existingSettings) {
        await supabase.from('user_settings').insert({
          user_id: userId,
          language: 'ru',
          theme: 'dark',
        });
      }

      setIsLoading(false);
      toast.success(t('invite.accepted'));
      navigate('/dashboard');
    } catch (err: any) {
      setIsLoading(false);
      toast.error(err?.message || 'An error occurred');
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('invite.error')}</h1>
          <p className="text-muted-foreground mb-6">{inviteError}</p>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            {t('auth.backToLogin')}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-auto bg-primary/10 rounded-2xl p-3 flex items-center justify-center">
              <img src={logoAfm} alt="AFM DIGITAL" className="h-10 w-auto invert dark:invert-0" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t('invite.title')}</h1>
          </div>
          <p className="text-muted-foreground">{t('invite.subtitle')}</p>
        </div>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">{t('invite.completeSignup')}</CardTitle>
            <CardDescription>
              {t('invite.invitedAs')} <span className="font-medium text-foreground">{invitation?.email}</span>
              {' · '}
              <span className="font-medium text-primary">
                {invitation?.role === 'Client' ? t('role.client') : t('role.mediaBuyer')}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">{t('auth.fullName')}</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('invite.acceptAndCreate')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
