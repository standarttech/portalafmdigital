import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Settings, Shield, Globe, Bell, Users, Sun, Moon, Sparkles, Check, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t('afm.settings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Настройки внутреннего рабочего пространства</p>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sun className="h-4 w-4 text-primary" />
              Внешний вид
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Тема</Label>
                <p className="text-xs text-muted-foreground">Светлая или тёмная тема интерфейса</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={theme === 'light' ? 'default' : 'outline'}
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-3.5 w-3.5" /> Светлая
                </Button>
                <Button
                  size="sm"
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-3.5 w-3.5" /> Тёмная
                </Button>
              </div>
            </div>

            {/* FX */}
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
              <Languages className="h-4 w-4 text-primary" />
              Язык интерфейса
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { setLanguage(lang.code); toast.success(`Language: ${lang.label}`); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                    language === lang.code
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  <span>{lang.native}</span>
                  {language === lang.code && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Уведомления
            </CardTitle>
            <CardDescription className="text-xs">Выберите какие события вас уведомляют</CardDescription>
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
              <Shield className="h-4 w-4 text-primary" />
              Безопасность
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

      {/* Workspace */}
      <motion.div variants={item}>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Рабочее пространство
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Название компании', value: 'AFM Digital' },
              { label: 'Часовой пояс', value: 'Europe/Moscow (UTC+3)' },
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

      <motion.div variants={item}>
        <Button onClick={() => toast.success('Настройки сохранены')} className="gap-2">
          <Check className="h-4 w-4" />
          Сохранить настройки
        </Button>
      </motion.div>
    </motion.div>
  );
}
