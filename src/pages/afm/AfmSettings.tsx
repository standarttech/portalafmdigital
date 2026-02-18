import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Shield, Globe, Bell, Users, Sun, Moon, Sparkles, Check, Languages, Edit2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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

interface Permission {
  key: string;
  label: string;
  desc: string;
  roles: Role[];
}

const PERMISSIONS: Permission[] = [
  { key: 'add_clients',       label: 'Добавлять клиентов',      desc: 'Создание новых клиентов',            roles: ['AgencyAdmin', 'Manager'] },
  { key: 'edit_clients',      label: 'Редактировать клиентов',   desc: 'Изменение данных клиентов',           roles: ['AgencyAdmin', 'Manager', 'AccountManager'] },
  { key: 'view_finance',      label: 'Финансы',                  desc: 'Просмотр финансового планирования',   roles: ['AgencyAdmin'] },
  { key: 'view_salary',       label: 'Зарплаты',                 desc: 'Просмотр зарплат команды',            roles: ['AgencyAdmin'] },
  { key: 'manage_users',      label: 'Управление пользователями', desc: 'Добавление/удаление пользователей',  roles: ['AgencyAdmin'] },
  { key: 'manage_tasks',      label: 'Задачи',                   desc: 'Создание и управление задачами',      roles: ['AgencyAdmin', 'Manager', 'AccountManager', 'MediaBuyer'] },
  { key: 'publish_reports',   label: 'Публикация отчётов',       desc: 'Публиковать отчёты для клиентов',     roles: ['AgencyAdmin', 'Manager', 'AccountManager'] },
  { key: 'run_sync',          label: 'Ручная синхронизация',      desc: 'Запуск синхронизации данных',         roles: ['AgencyAdmin', 'MediaBuyer'] },
  { key: 'view_audit',        label: 'Аудит-лог',                desc: 'Просмотр журнала действий',           roles: ['AgencyAdmin'] },
  { key: 'manage_crm',        label: 'CRM (Sales)',               desc: 'Управление лидами и сделками',        roles: ['AgencyAdmin', 'SalesManager', 'Manager'] },
  { key: 'edit_metrics',      label: 'Правка метрик',             desc: 'Ручное изменение показателей',        roles: ['AgencyAdmin', 'MediaBuyer'] },
  { key: 'branding',          label: 'Брендинг',                 desc: 'Настройка логотипов платформы',       roles: ['AgencyAdmin'] },
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

export default function AfmSettings() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme, fxEnabled, setFxEnabled } = useTheme();

  const [notifications, setNotifications] = useState({
    newLead: true,
    clientUpdate: true,
    teamMessage: false,
    weeklyReport: true,
  });

  const [security, setSecurity] = useState({
    mfaRequired: true,
    sessionLog: true,
    ipRestriction: false,
  });

  const [timezone, setTimezone] = useState('Europe/Moscow');
  const [editingTz, setEditingTz] = useState(false);

  const [permissions, setPermissions] = useState<Record<string, Role[]>>(
    Object.fromEntries(PERMISSIONS.map(p => [p.key, p.roles]))
  );

  const toggleRole = (permKey: string, role: Role) => {
    setPermissions(prev => {
      const current = prev[permKey] || [];
      const has = current.includes(role);
      return { ...prev, [permKey]: has ? current.filter(r => r !== role) : [...current, role] };
    });
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
            {/* Timezone - editable */}
            <div className="flex items-center justify-between py-1.5 border-b border-border/30">
              <div>
                <Label className="text-sm font-medium">Часовой пояс</Label>
                <p className="text-xs text-muted-foreground">Используется в отчётах и уведомлениях</p>
              </div>
              {editingTz ? (
                <div className="flex items-center gap-2">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="h-8 text-xs w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
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

      {/* Access Permissions Matrix */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Матрица доступа по ролям
            </CardTitle>
            <CardDescription className="text-xs">
              Настройте, какие роли имеют доступ к каждой функции платформы
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </motion.div>

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

      <motion.div variants={item}>
        <Button onClick={() => toast.success('Настройки сохранены')} className="gap-2">
          <Check className="h-4 w-4" />
          Сохранить настройки
        </Button>
      </motion.div>
    </motion.div>
  );
}
