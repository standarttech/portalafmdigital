import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MonitorSmartphone, Plus, CheckCircle2, XCircle, Loader2, Link2, Info } from 'lucide-react';
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

export default function AiAdsAccountsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRu = language === 'ru';

  useEffect(() => {
    supabase
      .from('ad_accounts')
      .select('*, client:clients(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAccounts((data as any[]) || []);
        setLoading(false);
      });
  }, []);

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
          {accounts.map(acc => (
            <Card key={acc.id} className="hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold truncate">
                    {acc.account_name || acc.platform_account_id}
                  </CardTitle>
                  {acc.is_active ? (
                    <Badge variant="outline" className="gap-1 text-[hsl(var(--success))] border-[hsl(var(--success))]/30">
                      <CheckCircle2 className="h-3 w-3" /> {isRu ? 'Активен' : 'Active'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                      <XCircle className="h-3 w-3" /> {isRu ? 'Неактивен' : 'Inactive'}
                    </Badge>
                  )}
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
                  <span className="text-muted-foreground">{isRu ? 'Подключён' : 'Connected'}</span>
                  <span className="text-foreground">{new Date(acc.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Permissions Info */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {isRu ? 'Модель разрешений' : 'Permissions Model'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">{isRu ? 'Просмотр' : 'View'}</Badge>
              <span>{isRu ? 'Все участники агентства с доступом к клиенту видят аккаунты' : 'All agency members with client access can view connected accounts'}</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">{isRu ? 'Подключение' : 'Connect'}</Badge>
              <span>{isRu ? 'Только администраторы могут подключать новые аккаунты' : 'Only admins can connect new ad platform accounts'}</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">{isRu ? 'Черновики' : 'Draft'}</Badge>
              <span>{isRu ? 'Участники с доступом к клиенту создают черновики' : 'Members with client access can create campaign drafts'}</span>
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
