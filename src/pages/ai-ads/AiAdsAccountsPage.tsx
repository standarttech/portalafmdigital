import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MonitorSmartphone, Plus, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
            Ad Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Connected advertising platform accounts</p>
        </div>
        <Button size="sm" disabled className="gap-2">
          <Plus className="h-4 w-4" />
          Connect Account
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MonitorSmartphone className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Ad Accounts Connected</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Connect your Meta, Google, or TikTok ad accounts to start using AI-assisted campaign management.
              Accounts are connected through client platform connections.
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
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
                      <XCircle className="h-3 w-3" /> Inactive
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
                    <span className="text-muted-foreground">Client</span>
                    <span className="text-foreground">{(acc as any).client.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Connected</span>
                  <span className="text-foreground">{new Date(acc.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Access & Permissions Info */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Permissions Model</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">View</Badge>
              <span>All agency members with client access can view connected accounts</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">Connect</Badge>
              <span>Only admins can connect new ad platform accounts</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">Draft</Badge>
              <span>Members with client access can create campaign drafts</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="text-[10px] shrink-0">Execute</Badge>
              <span>Only admins can approve and execute campaign launches</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
