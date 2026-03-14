import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MonitorSmartphone, Plus, CheckCircle2, XCircle, Loader2, Link2, Info, Pencil, Eye, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface AdAccount {
  id: string;
  platform_account_id: string;
  account_name: string | null;
  is_active: boolean;
  created_at: string;
  client_id: string;
  connection_id: string;
  client?: { name: string };
}

interface MgmtAccount {
  account_id: string;
  name: string;
}

export default function AiAdsAccountsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [mgmtAccountIds, setMgmtAccountIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRu = language === 'ru';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load ad_accounts from DB
      const { data: dbAccounts } = await supabase
        .from('ad_accounts')
        .select('*, client:clients(name)')
        .order('created_at', { ascending: false });

      // Load management accounts from Meta API (if integration exists)
      let mgmtIds = new Set<string>();
      try {
        const { data } = await supabase.functions.invoke('meta-automation', {
          body: { action: 'list_ad_accounts' },
        });
        if (data?.accounts) {
          mgmtIds = new Set(data.accounts.map((a: MgmtAccount) => a.account_id));
        }
      } catch {
        // Management integration not connected — all are read-only
      }

      if (!cancelled) {
        setAccounts((dbAccounts as any[]) || []);
        setMgmtAccountIds(mgmtIds);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getAccessLevel = (acc: AdAccount): 'management' | 'read_only' => {
    return mgmtAccountIds.has(acc.platform_account_id) ? 'management' : 'read_only';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6 text-blue-400" />
            {isRu ? 'Рекламные аккаунты' : 'Ad Accounts'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isRu ? 'Подключённые аккаунты рекламных платформ' : 'Connected advertising platform accounts'}
          </p>
        </div>
      </div>

      {/* How to connect */}
      <Card className="border-blue-400/20 bg-blue-400/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {isRu ? 'Как подключить рекламный аккаунт' : 'How to connect an ad account'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isRu
                ? 'Аккаунты подключаются через настройки клиента. Откройте карточку клиента → вкладка "Платформы" → добавьте подключение Meta/Google/TikTok → аккаунт появится здесь автоматически.'
                : 'Accounts are connected via client settings. Open a client card → "Platforms" tab → add a Meta/Google/TikTok connection → the account will appear here automatically.'}
            </p>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate('/clients')}>
                <Plus className="h-3.5 w-3.5" /> {isRu ? 'Перейти к клиентам' : 'Go to Clients'}
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => navigate('/ai-ads/integrations')}>
                <Link2 className="h-3.5 w-3.5" /> {isRu ? 'Интеграции' : 'Integrations'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access level legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Badge className="gap-1 text-[10px] bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
            <Pencil className="h-2.5 w-2.5" /> Management
          </Badge>
          <span>{isRu ? '— полный доступ: создание, редактирование, запуск' : '— full access: create, edit, launch'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Eye className="h-2.5 w-2.5" /> Read Only
          </Badge>
          <span>{isRu ? '— только чтение: статистика и метрики' : '— read only: statistics and metrics'}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MonitorSmartphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isRu ? 'Нет подключённых аккаунтов' : 'No Ad Accounts Connected'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isRu
                ? 'Подключите Meta, Google или TikTok аккаунты через настройки клиента для начала работы с ИИ-ассистентом.'
                : 'Connect your Meta, Google, or TikTok ad accounts through client settings to start using AI-assisted campaign management.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => {
            const access = getAccessLevel(acc);
            const isManagement = access === 'management';
            return (
              <Card key={acc.id} className={`hover:border-primary/20 transition-colors ${isManagement ? 'border-primary/10' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-semibold truncate">
                      {acc.account_name || acc.platform_account_id}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isManagement ? (
                        <Badge className="gap-1 text-[10px] bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
                          <Pencil className="h-2.5 w-2.5" /> Management
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <Eye className="h-2.5 w-2.5" /> Read Only
                        </Badge>
                      )}
                      {acc.is_active ? (
                        <Badge variant="outline" className="gap-1 text-[10px] text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px] text-destructive border-destructive/30">
                          <XCircle className="h-2.5 w-2.5" />
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Platform ID</span>
                    <span className="font-mono text-foreground">{acc.platform_account_id}</span>
                  </div>
                  {(acc as any).client?.name && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{isRu ? 'Клиент' : 'Client'}</span>
                      <span className="text-foreground">{(acc as any).client.name}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{isRu ? 'Доступ' : 'Access'}</span>
                    <span className="text-foreground">
                      {isManagement
                        ? (isRu ? 'Создание, редактирование, запуск' : 'Create, edit, launch')
                        : (isRu ? 'Только статистика' : 'Statistics only')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{isRu ? 'Подключён' : 'Connected'}</span>
                    <span className="text-foreground">{new Date(acc.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Permissions Info */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {isRu ? 'Модель разрешений' : 'Permissions Model'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">{isRu ? 'Просмотр' : 'View'}</Badge>
              <span>{isRu ? 'Все участники с доступом к клиенту видят аккаунты и статистику' : 'All members with client access can view accounts and stats'}</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">Management</Badge>
              <span>{isRu ? 'Аккаунты из Meta Ads Management — создание пикселей, аудиторий, кампаний' : 'Accounts from Meta Ads Management — create pixels, audiences, campaigns'}</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">Read Only</Badge>
              <span>{isRu ? 'Аккаунты из интеграции для статистики — только чтение метрик' : 'Accounts from stats integration — read-only metrics'}</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">{isRu ? 'Запуск' : 'Execute'}</Badge>
              <span>{isRu ? 'Только администраторы одобряют и запускают кампании' : 'Only admins can approve and execute campaign launches'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
