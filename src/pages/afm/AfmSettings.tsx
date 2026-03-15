import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Shield, Globe, Bell, Sun, Moon, Sparkles, Check, Languages, Edit2, Save, Loader2, Webhook, Copy, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Language } from '@/i18n/translations';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ru', label: 'Russian', native: 'Русский' },
  { code: 'it', label: 'Italian', native: 'Italiano' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'fr', label: 'French', native: 'Français' },
];

const TIMEZONES = [
  'Europe/Moscow', 'Europe/London', 'Europe/Berlin', 'America/New_York',
  'America/Los_Angeles', 'America/Chicago', 'Asia/Dubai', 'Asia/Tokyo',
  'Asia/Singapore', 'Australia/Sydney',
];

type Role = 'AgencyAdmin' | 'MediaBuyer' | 'Manager' | 'SalesManager' | 'AccountManager' | 'Designer' | 'Copywriter';

// Map permission matrix keys to actual DB column names in user_permissions
interface PermissionDef {
  key: string;
  dbKey: string; // column in user_permissions
  label: string;
  desc: string;
  defaultRoles: Role[];
}

const PERMISSIONS: PermissionDef[] = [
  { key: 'add_clients',       dbKey: 'can_add_clients',             label: 'Добавлять клиентов',       desc: 'Создание новых клиентов',            defaultRoles: ['AgencyAdmin', 'Manager'] },
  { key: 'edit_clients',      dbKey: 'can_edit_clients',            label: 'Редактировать клиентов',    desc: 'Изменение данных клиентов',           defaultRoles: ['AgencyAdmin', 'Manager', 'AccountManager'] },
  { key: 'manage_tasks',      dbKey: 'can_manage_tasks',            label: 'Задачи',                   desc: 'Создание и управление задачами',      defaultRoles: ['AgencyAdmin', 'Manager', 'AccountManager', 'MediaBuyer'] },
  { key: 'publish_reports',   dbKey: 'can_publish_reports',         label: 'Публикация отчётов',       desc: 'Публиковать отчёты для клиентов',     defaultRoles: ['AgencyAdmin', 'Manager', 'AccountManager'] },
  { key: 'run_sync',          dbKey: 'can_run_manual_sync',         label: 'Ручная синхронизация',     desc: 'Запуск синхронизации данных',         defaultRoles: ['AgencyAdmin', 'MediaBuyer'] },
  { key: 'view_audit',        dbKey: 'can_view_audit_log',          label: 'Аудит-лог',                desc: 'Просмотр журнала действий',           defaultRoles: ['AgencyAdmin'] },
  { key: 'edit_metrics',      dbKey: 'can_edit_metrics_override',   label: 'Правка метрик',            desc: 'Ручное изменение показателей',        defaultRoles: ['AgencyAdmin', 'MediaBuyer'] },
  { key: 'connect_integrations', dbKey: 'can_connect_integrations', label: 'Интеграции',               desc: 'Подключение платформ и синков',       defaultRoles: ['AgencyAdmin'] },
  { key: 'assign_clients',    dbKey: 'can_assign_clients_to_users', label: 'Назначение клиентов',      desc: 'Привязка клиентов к пользователям',   defaultRoles: ['AgencyAdmin'] },
  { key: 'access_afm',        dbKey: 'can_access_afm_internal',     label: 'AFM Internal',             desc: 'Доступ к внутреннему модулю агентства', defaultRoles: ['AgencyAdmin'] },
  { key: 'access_adminscale', dbKey: 'can_access_adminscale',       label: 'AdminScale Pro',           desc: 'Доступ к модулю админ-шкал',          defaultRoles: ['AgencyAdmin'] },
  { key: 'access_crm',        dbKey: 'can_access_crm',              label: 'CRM',                     desc: 'Доступ к CRM-модулю',                 defaultRoles: ['AgencyAdmin', 'SalesManager', 'Manager'] },
  { key: 'manage_crm_int',    dbKey: 'can_manage_crm_integrations', label: 'CRM Интеграции',           desc: 'Управление интеграциями CRM',         defaultRoles: ['AgencyAdmin'] },
];

const ALL_ROLES: Role[] = ['AgencyAdmin', 'MediaBuyer', 'Manager', 'SalesManager', 'AccountManager', 'Designer', 'Copywriter'];

const ROLE_LABELS: Record<Role, string> = {
  AgencyAdmin: 'Admin',
  MediaBuyer: 'Media Buyer',
  Manager: 'Manager',
  SalesManager: 'Sales Mgr',
  AccountManager: 'Acc. Mgr',
  Designer: 'Designer',
  Copywriter: 'Copywriter',
};

interface UserRow {
  user_id: string;
  display_name: string | null;
  agency_role: string;
}

/* ── Meta Webhook Settings Component ── */
function MetaWebhookSettings() {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tokenData, setTokenData] = useState<{ callback_url: string; verify_token: string | null; configured: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setError('Not authenticated'); setLoading(false); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'bhwvnmyvebgnxiisloqu';
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fb-leadgen-config`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${session.session.access_token}` },
        }
      );
      const result = await resp.json();
      if (resp.ok) {
        setTokenData(result);
      } else {
        setError(result.error || 'Failed to load config');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) { setError('Not authenticated'); setGenerating(false); return; }
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'bhwvnmyvebgnxiisloqu';
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fb-leadgen-config`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      const result = await resp.json();
      if (resp.ok && result.success) {
        setTokenData(result);
        toast.success('Verify token generated and saved');
      } else {
        setError(result.error || 'Failed to generate token');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" /> Meta Webhook Settings
        </CardTitle>
        <CardDescription className="text-xs">
          Configure the verify token for Facebook Lead Gen webhook integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading configuration...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/5 border border-destructive/20 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{error}</span>
          </div>
        )}

        {tokenData && (
          <>
            {/* Status */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground min-w-[60px]">Status</Label>
              <Badge variant="outline" className={`text-[10px] gap-1 ${
                tokenData.configured
                  ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-amber-500 border-amber-500/30 bg-amber-500/10'
              }`}>
                {tokenData.configured ? (
                  <><CheckCircle2 className="h-2.5 w-2.5" /> Configured</>
                ) : (
                  <><AlertTriangle className="h-2.5 w-2.5" /> Missing</>
                )}
              </Badge>
            </div>

            {/* Callback URL */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Callback URL</Label>
              <div className="flex items-center gap-1.5">
                <code className="flex-1 text-[10px] font-mono bg-muted/30 border border-border/30 rounded px-2 py-1.5 truncate text-foreground">
                  {tokenData.callback_url}
                </code>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => copyToClipboard(tokenData.callback_url, 'Callback URL')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Verify Token */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Verify Token</Label>
              {tokenData.verify_token ? (
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 text-[10px] font-mono bg-muted/30 border border-border/30 rounded px-2 py-1.5 truncate text-foreground">
                    {tokenData.verify_token}
                  </code>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 flex-shrink-0"
                    onClick={() => copyToClipboard(tokenData.verify_token!, 'Verify Token')}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-amber-500">Not configured. Generate a token below.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={generateToken} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                {tokenData.configured ? 'Regenerate Token' : 'Generate Secure Token'}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchConfig} disabled={loading}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
          </>
        )}

        {!loading && !tokenData && !error && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchConfig}>
            <RefreshCw className="h-3 w-3" /> Load Configuration
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AfmSettings() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme, fxEnabled, setFxEnabled } = useTheme();
  const { agencyRole } = useAuth();

  const [notifications, setNotifications] = useState({
    newLead: true, clientUpdate: true, teamMessage: false, weeklyReport: true,
  });
  const [security, setSecurity] = useState({
    mfaRequired: true, sessionLog: true, ipRestriction: false,
  });
  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [editingTz, setEditingTz] = useState(false);

  // Permission matrix — role→dbKeys mapping, loaded from actual user_permissions
  const [permissions, setPermissions] = useState<Record<string, Role[]>>(
    Object.fromEntries(PERMISSIONS.map(p => [p.key, [...p.defaultRoles]]))
  );
  const [users, setUsers] = useState<UserRow[]>([]);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixLoaded, setMatrixLoaded] = useState(false);

  // Load users & their permissions to build the matrix
  const loadMatrix = useCallback(async () => {
    const { data: usersData } = await supabase
      .from('agency_users')
      .select('user_id, display_name, agency_role')
      .order('created_at');
    if (!usersData) return;
    setUsers(usersData);

    const userIds = usersData.map(u => u.user_id);
    if (userIds.length === 0) { setMatrixLoaded(true); return; }

    const { data: permsData } = await supabase
      .from('user_permissions')
      .select('*')
      .in('user_id', userIds);

    // Build role→permission map from actual DB data
    const matrix: Record<string, Set<Role>> = {};
    PERMISSIONS.forEach(p => { matrix[p.key] = new Set(['AgencyAdmin']); }); // Admin always has all

    if (permsData) {
      for (const row of permsData) {
        const user = usersData.find(u => u.user_id === row.user_id);
        if (!user || user.agency_role === 'AgencyAdmin') continue;
        const role = user.agency_role as Role;
        PERMISSIONS.forEach(p => {
          if ((row as any)[p.dbKey]) {
            matrix[p.key].add(role);
          }
        });
      }
    }

    setPermissions(Object.fromEntries(
      Object.entries(matrix).map(([k, v]) => [k, Array.from(v)])
    ));
    setMatrixLoaded(true);
  }, []);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  const toggleRole = (permKey: string, role: Role) => {
    setPermissions(prev => {
      const current = prev[permKey] || [];
      const has = current.includes(role);
      return { ...prev, [permKey]: has ? current.filter(r => r !== role) : [...current, role] };
    });
  };

  // Save the matrix: update user_permissions for each user based on their role
  const saveMatrix = async () => {
    setSavingMatrix(true);
    try {
      for (const user of users) {
        if (user.agency_role === 'AgencyAdmin') continue; // Admin always has all
        const role = user.agency_role as Role;
        const updates: Record<string, boolean> = {};
        PERMISSIONS.forEach(p => {
          const roles = permissions[p.key] || [];
          updates[p.dbKey] = roles.includes(role);
        });

        const { data: existing } = await supabase
          .from('user_permissions')
          .select('id')
          .eq('user_id', user.user_id)
          .maybeSingle();

        if (existing) {
          await supabase.from('user_permissions').update(updates).eq('user_id', user.user_id);
        } else {
          await supabase.from('user_permissions').insert({ user_id: user.user_id, ...updates });
        }
      }
      toast.success('Матрица доступа сохранена');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения');
    }
    setSavingMatrix(false);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.settings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Настройки внутреннего рабочего пространства</p>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" /> Внешний вид
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Тема</Label>
                <p className="text-xs text-muted-foreground">Светлая или тёмная тема интерфейса</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={theme === 'light' ? 'default' : 'outline'} className="gap-1.5 h-8 text-xs" onClick={() => setTheme('light')}>
                  <Sun className="h-3.5 w-3.5" /> Светлая
                </Button>
                <Button size="sm" variant={theme === 'dark' ? 'default' : 'outline'} className="gap-1.5 h-8 text-xs" onClick={() => setTheme('dark')}>
                  <Moon className="h-3.5 w-3.5" /> Тёмная
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Futuristic FX
                </Label>
                <p className="text-xs text-muted-foreground">Частицы и глоу-эффекты</p>
              </div>
              <Switch checked={fxEnabled} onCheckedChange={setFxEnabled} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Language */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Languages className="h-4 w-4 text-primary" /> Язык интерфейса
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map(lang => (
                <button key={lang.code}
                  onClick={() => { setLanguage(lang.code); toast.success(`Language: ${lang.label}`); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                    language === lang.code
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}>
                  <span>{lang.native}</span>
                  {language === lang.code && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Workspace */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Рабочее пространство
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-border/30">
              <div>
                <Label className="text-sm font-medium">Часовой пояс</Label>
                <p className="text-xs text-muted-foreground">Используется в отчётах и уведомлениях</p>
              </div>
              {editingTz ? (
                <div className="flex items-center gap-2">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setEditingTz(false); toast.success('Часовой пояс сохранён'); }}>
                    <Save className="h-3 w-3" /> OK
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{timezone}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingTz(true)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {[
              { label: 'Название компании', value: 'AFM Digital' },
              { label: 'Валюта', value: 'USD ($)' },
              { label: 'Версия платформы', value: 'v2.0.0' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className="text-xs font-medium text-foreground">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Access Permissions Matrix — NOW SAVES TO DB */}
      {agencyRole === 'AgencyAdmin' && (
        <motion.div variants={item}>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Матрица доступа по ролям
              </CardTitle>
              <CardDescription className="text-xs">
                Настройте, какие роли имеют доступ к каждой функции. Изменения применяются ко всем пользователям с соответствующей ролью.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="text-left px-3 py-2 font-semibold text-foreground min-w-[180px]">Функция</th>
                      {ALL_ROLES.map(role => (
                        <th key={role} className="px-2 py-2 text-center font-medium text-muted-foreground whitespace-nowrap">
                          {ROLE_LABELS[role]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map(perm => (
                      <tr key={perm.key} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{perm.label}</p>
                          <p className="text-[10px] text-muted-foreground">{perm.desc}</p>
                        </td>
                        {ALL_ROLES.map(role => {
                          const hasAccess = (permissions[perm.key] || []).includes(role);
                          const isAdmin = role === 'AgencyAdmin';
                          return (
                            <td key={role} className="px-2 py-2 text-center">
                              <button
                                onClick={() => !isAdmin && toggleRole(perm.key, role)}
                                disabled={isAdmin}
                                title={isAdmin ? 'Admin всегда имеет полный доступ' : hasAccess ? 'Убрать доступ' : 'Дать доступ'}
                                className={`w-5 h-5 rounded border transition-all inline-flex items-center justify-center ${
                                  isAdmin
                                    ? 'border-primary/40 bg-primary/20 cursor-not-allowed'
                                    : hasAccess
                                      ? 'border-primary bg-primary/20 hover:bg-primary/30 cursor-pointer'
                                      : 'border-border/40 hover:border-border/70 cursor-pointer'
                                }`}
                              >
                                {(hasAccess || isAdmin) && <Check className="h-3 w-3 text-primary" />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button onClick={saveMatrix} disabled={savingMatrix} className="gap-2">
                {savingMatrix ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить матрицу доступа
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Meta Webhook Settings — Admin Only */}
      {agencyRole === 'AgencyAdmin' && (
        <motion.div variants={item}>
          <MetaWebhookSettings />
        </motion.div>
      )}


      {/* Notifications */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Уведомления
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'newLead', label: 'Новый лид', desc: 'Уведомлять при добавлении лида' },
              { key: 'clientUpdate', label: 'Изменение клиента', desc: 'Изменение статуса или данных' },
              { key: 'teamMessage', label: 'Сообщения команды', desc: 'Внутренний чат' },
              { key: 'weeklyReport', label: 'Еженедельный отчёт', desc: 'Автоматические сводки' },
            ].map(n => (
              <div key={n.key} className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{n.label}</Label>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
                <Switch
                  checked={notifications[n.key as keyof typeof notifications]}
                  onCheckedChange={v => setNotifications(prev => ({ ...prev, [n.key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Security */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Безопасность
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'mfaRequired', label: 'MFA обязателен', desc: 'Требовать 2FA для всей команды' },
              { key: 'sessionLog', label: 'Журнал сессий', desc: 'Записывать входы и выходы' },
              { key: 'ipRestriction', label: 'Ограничение по IP', desc: 'Только офисные IP-адреса' },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{s.label}</Label>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <Switch
                  checked={security[s.key as keyof typeof security]}
                  onCheckedChange={v => { setSecurity(prev => ({ ...prev, [s.key]: v })); toast.success('Сохранено'); }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
