import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3, Users, TrendingUp, DollarSign, Target, Lock,
  Globe, Instagram, Facebook, Youtube, Linkedin, Settings,
  Zap, ShieldCheck, Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function AfmInternalPage() {
  const { t } = useLanguage();
  const { agencyRole } = useAuth();
  const isAdmin = agencyRole === 'AgencyAdmin';

  // KPIs stub data
  const kpis = [
    { label: 'Бюджет на рекламу', value: '$12 400', icon: DollarSign, trend: '+8%', color: 'text-primary' },
    { label: 'Лиды за месяц', value: '184', icon: Users, trend: '+23%', color: 'text-success' },
    { label: 'CPL', value: '$67.4', icon: TrendingUp, trend: '-5%', color: 'text-info' },
    { label: 'Активные кампании', value: '6', icon: Target, trend: '0', color: 'text-warning' },
  ];

  const socialNetworks = [
    { name: 'Instagram', icon: Instagram, connected: false, followers: '-', color: 'text-pink-500' },
    { name: 'Facebook', icon: Facebook, connected: false, followers: '-', color: 'text-blue-500' },
    { name: 'YouTube', icon: Youtube, connected: false, followers: '-', color: 'text-red-500' },
    { name: 'LinkedIn', icon: Linkedin, connected: false, followers: '-', color: 'text-blue-600' },
  ];

  const tools = [
    { name: 'CRM Pipeline', desc: 'Воронка продаж и сделок', icon: TrendingUp, available: false },
    { name: 'Лид-трекер', desc: 'Отслеживание входящих лидов', icon: Users, available: false },
    { name: 'Расчёт P&L', desc: 'Прибыльность агентства', icon: DollarSign, available: false },
    { name: 'HR-панель', desc: 'Команда и нагрузка', icon: Building2, available: false },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground gradient-text">AFM Digital — Internal</h1>
          <p className="text-sm text-muted-foreground">Внутренняя панель команды агентства</p>
        </div>
        <Badge className="ml-auto" variant="outline">
          <ShieldCheck className="h-3 w-3 mr-1" />
          Только для команды
        </Badge>
      </motion.div>

      <Tabs defaultValue="dashboard">
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-none h-auto flex-nowrap p-1">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <BarChart3 className="h-3.5 w-3.5" />
            Дашборд
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <Globe className="h-3.5 w-3.5" />
            Соц. сети
          </TabsTrigger>
          <TabsTrigger value="tools" className="gap-1.5 text-xs sm:text-sm flex-shrink-0">
            <Settings className="h-3.5 w-3.5" />
            Инструменты
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {/* KPI Cards */}
          <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map(kpi => (
              <div key={kpi.label} className="kpi-card">
                <div className="flex items-center gap-2 mb-2">
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                {kpi.trend !== '0' && (
                  <p className={`text-xs mt-1 ${kpi.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                    {kpi.trend} vs прошлый месяц
                  </p>
                )}
              </div>
            ))}
          </motion.div>

          {/* Info banner */}
          <motion.div variants={item}>
            <Card className="glass-card border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-start gap-3">
                <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Данные Media Buying — AFM Digital</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Здесь отображается рекламная активность агентства по продвижению самого AFM Digital.
                    Подключите рекламные аккаунты через раздел «Клиенты», создав клиента «AFM Digital».
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* SOCIAL NETWORKS TAB */}
        <TabsContent value="social" className="mt-4">
          <motion.div variants={item} className="space-y-4">
            <Card className="glass-card border-warning/20 bg-warning/5">
              <CardContent className="p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Безопасность соц. сетей</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Подключение соц. сетей требует хранения токенов доступа. Для обеспечения максимальной безопасности 
                    токены хранятся только в зашифрованном виде на серверной стороне через Vault. 
                    Прямое подключение через OAuth будет добавлено в следующем обновлении 
                    после прохождения аудита безопасности.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {socialNetworks.map(net => (
                <Card key={net.name} className="glass-card">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-secondary flex items-center justify-center`}>
                        <net.icon className={`h-5 w-5 ${net.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{net.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {net.connected ? `Подписчики: ${net.followers}` : 'Не подключено'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground gap-1">
                        <Lock className="h-2.5 w-2.5" />
                        Скоро
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* TOOLS TAB */}
        <TabsContent value="tools" className="mt-4">
          <motion.div variants={item}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tools.map(tool => (
                <Card key={tool.name} className="glass-card opacity-70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                        <tool.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{tool.name}</p>
                        <p className="text-xs text-muted-foreground">{tool.desc}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                      В разработке
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
