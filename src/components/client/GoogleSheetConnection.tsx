import { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Zap, RefreshCw, Loader2, Plus, XCircle, Sheet, CalendarClock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TranslationKey } from '@/i18n/translations';

function PlatformSheetRow({ clientId, platform, label, fieldName, isAdmin }: { clientId: string; platform: string; label: string; fieldName: string; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('clients').select(fieldName).eq('id', clientId).single().then(({ data }) => {
      const val = (data as any)?.[fieldName] || '';
      setUrl(val); setSavedUrl(val);
    });
  }, [clientId, fieldName]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('clients').update({ [fieldName]: url || null } as any).eq('id', clientId);
    setSavedUrl(url); setSaving(false);
    toast.success(t('clients.sheetUrlSaved'));
  };

  const handleSync = async () => {
    if (!savedUrl) return;
    setSyncing(true); setLastResult(null);
    try {
      const res = await supabase.functions.invoke('sync-google-sheet', { body: { client_id: clientId, platform } });
      if (res.error) { setLastResult(`Error: ${res.error.message}`); }
      else { const d = res.data as any; setLastResult(`${d.rows_synced || 0} ${t('clients.rowsSynced')}`); }
    } catch (err: any) { setLastResult(`Error: ${err.message}`); }
    setSyncing(false);
  };

  return (
    <div className="rounded-lg border border-border/50 p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {savedUrl ? (
          <Badge variant="outline" className="text-[10px] border-success/30 text-success">{t('dashboard.connected')}</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{t('dashboard.notConnected')}</Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="flex-1 text-xs h-8" />
        <Button onClick={handleSave} disabled={saving || url === savedUrl} variant="outline" size="sm" className="h-8 text-xs flex-shrink-0">{t('common.save')}</Button>
      </div>
      {savedUrl && (
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} disabled={syncing} size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {t('clients.syncSheet')}
          </Button>
          {lastResult && <span className={`text-xs ${lastResult.startsWith('Error') ? 'text-destructive' : 'text-success'}`}>{lastResult}</span>}
        </div>
      )}
    </div>
  );
}

export default function GoogleSheetConnection({ clientId, isAdmin }: { clientId: string; isAdmin: boolean }) {
  const { t } = useLanguage();
  const [autoSync, setAutoSync] = useState(false);
  const [googleTrackingEnabled, setGoogleTrackingEnabled] = useState(true);
  const [metaAccounts, setMetaAccounts] = useState<{ id: string; platform_account_id: string; account_name: string | null; is_active: boolean }[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<{ id: string; name: string; status?: string; currency?: string }[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [addingAccounts, setAddingAccounts] = useState(false);
  const [metaAutoSync, setMetaAutoSync] = useState(true);

  useEffect(() => {
    supabase.from('clients').select('auto_sync_enabled').eq('id', clientId).single().then(({ data }) => {
      if (data?.auto_sync_enabled) setAutoSync(data.auto_sync_enabled);
    });
    supabase.from('platform_settings').select('value').eq('key', `google_tracking_${clientId}`).maybeSingle().then(({ data }) => {
      if (data?.value !== null && data?.value !== undefined) setGoogleTrackingEnabled((data.value as any)?.enabled !== false);
    });
    supabase.from('platform_settings').select('value').eq('key', `meta_auto_sync_${clientId}`).maybeSingle().then(({ data }) => {
      if (data?.value !== null && data?.value !== undefined) setMetaAutoSync((data.value as any)?.enabled !== false);
    });
    loadLinkedAccounts();
  }, [clientId]);

  const loadLinkedAccounts = async () => {
    const { data } = await supabase
      .from('ad_accounts')
      .select('id, platform_account_id, account_name, is_active')
      .eq('client_id', clientId);
    setMetaAccounts(data || []);
  };

  const fetchAvailableAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-meta-ads', {
        body: { action: 'list_accounts' },
      });
      if (error) throw error;
      setAvailableAccounts(data.accounts || []);
    } catch (err) {
      toast.error(t('clients.failedLoadAccounts' as TranslationKey));
    }
    setLoadingAccounts(false);
  };

  const toggleAccountSelection = (accId: string) => {
    setSelectedIds(prev => prev.includes(accId) ? prev.filter(id => id !== accId) : [...prev, accId]);
  };

  const addSelectedAccounts = async () => {
    if (selectedIds.length === 0) return;
    setAddingAccounts(true);
    let { data: conn } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('client_id', clientId)
      .eq('platform', 'meta')
      .maybeSingle();
    if (!conn) {
      const { data: newConn } = await supabase
        .from('platform_connections')
        .insert({ client_id: clientId, platform: 'meta' as any, account_name: 'Meta Ads API' })
        .select('id')
        .single();
      conn = newConn;
    }
    if (conn) {
      for (const accId of selectedIds) {
        const acc = availableAccounts.find(a => a.id === accId);
        await supabase.from('ad_accounts').insert({
          client_id: clientId,
          connection_id: conn.id,
          platform_account_id: accId,
          account_name: acc?.name || accId,
        });
      }
      toast.success(t('clients.accountsAdded' as TranslationKey) || `Added ${selectedIds.length} account(s)`);
      setSelectedIds([]);
      loadLinkedAccounts();
    }
    setAddingAccounts(false);
  };

  const removeMetaAccount = async (id: string) => {
    await supabase.from('ad_accounts').delete().eq('id', id);
    toast.success(t('clients.accountRemoved' as TranslationKey) || 'Account removed');
    loadLinkedAccounts();
  };

  const syncNow = async () => {
    toast.info(t('clients.syncStarted' as TranslationKey) || 'Sync started...');
    const { data, error } = await supabase.functions.invoke('sync-meta-ads', {
      body: { action: 'sync', client_id: clientId },
    });
    if (error) {
      toast.error(t('clients.syncError' as TranslationKey) || 'Sync error');
    } else {
      toast.success(`${t('clients.syncComplete' as TranslationKey) || 'Synced'}: ${data.synced} records`);
      if (data.errors?.length) toast.warning(data.errors.join('\n'));
    }
  };

  const handleToggleAutoSync = async (enabled: boolean) => {
    setAutoSync(enabled);
    await supabase.from('clients').update({ auto_sync_enabled: enabled } as any).eq('id', clientId);
    toast.success(enabled ? t('clients.autoSyncEnabled') : t('clients.autoSyncDisabled'));
  };

  const handleToggleGoogleTracking = async (enabled: boolean) => {
    setGoogleTrackingEnabled(enabled);
    await supabase.from('platform_settings').upsert({
      key: `google_tracking_${clientId}`,
      value: { enabled } as any,
      updated_by: null,
    }, { onConflict: 'key' });
    toast.success(enabled ? t('clients.googleTrackingEnabled' as TranslationKey) || 'Google Sheets tracking enabled' : t('clients.googleTrackingDisabled' as TranslationKey) || 'Google Sheets tracking disabled');
  };

  const filteredAvailable = availableAccounts
    .filter(a => !metaAccounts.some(m => m.platform_account_id === a.id))
    .filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.id.includes(q);
    });

  const hasMetaAccounts = metaAccounts.length > 0;

  return (
    <div className="space-y-6">
      {/* Meta Ads API Direct — PRIMARY */}
      <Card className="glass-card max-w-2xl border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" /> Meta Ads API — {t('clients.directConnection' as TranslationKey) || 'Direct Connection'}
            </CardTitle>
            {hasMetaAccounts && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">{t('clients.primarySource' as TranslationKey) || 'Primary Source'}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {t('clients.metaApiDesc' as TranslationKey) || 'Connect Meta ad accounts directly. Data syncs automatically every hour. This source has priority over Google Sheets.'}
          </p>

          {/* Linked accounts */}
          {metaAccounts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('clients.linkedAccounts' as TranslationKey) || 'Linked Accounts'} ({metaAccounts.length})</p>
              {metaAccounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2.5 bg-secondary/20">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{acc.account_name || acc.platform_account_id}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">ID: {acc.platform_account_id}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant={acc.is_active ? 'default' : 'secondary'} className="text-[9px] h-5">
                      {acc.is_active ? t('common.active') : t('common.inactive')}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMetaAccount(acc.id)}>
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={syncNow}>
                  <RefreshCw className="h-3.5 w-3.5" /> {t('clients.syncNow' as TranslationKey) || 'Sync Now'}
                </Button>
              </div>
              {/* Meta Auto-sync toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-secondary/10">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    {t('clients.metaAutoSync' as TranslationKey) || 'Meta Auto-sync'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {t('clients.metaAutoSyncDesc' as TranslationKey) || 'Data is pulled every hour for the last 3 days (covers Facebook attribution window). Manual sync — 30 days.'}
                  </p>
                </div>
                <Switch checked={metaAutoSync} onCheckedChange={async (enabled) => {
                  setMetaAutoSync(enabled);
                  await supabase.from('platform_settings').upsert({
                    key: `meta_auto_sync_${clientId}`,
                    value: { enabled } as any,
                    updated_by: null,
                  }, { onConflict: 'key' });
                  toast.success(enabled ? t('clients.metaAutoSyncEnabled' as TranslationKey) || 'Meta auto-sync enabled' : t('clients.metaAutoSyncDisabled' as TranslationKey) || 'Meta auto-sync disabled');
                }} className="flex-shrink-0" />
              </div>
            </div>
          )}

          {/* Add accounts — multi-select with search */}
          <div className="space-y-3 border-t border-border/50 pt-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('clients.addAccounts' as TranslationKey) || 'Add Accounts'}</p>
            {availableAccounts.length === 0 ? (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={fetchAvailableAccounts} disabled={loadingAccounts}>
                {loadingAccounts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {t('clients.loadAccountsList' as TranslationKey) || 'Load accounts list'}
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  placeholder={t('clients.searchAccounts' as TranslationKey) || 'Search by ID or name...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="max-h-[240px] overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2 bg-secondary/10">
                  {filteredAvailable.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {searchQuery ? t('common.noResults' as TranslationKey) || 'No results' : t('clients.allAccountsConnected' as TranslationKey) || 'All accounts already connected'}
                    </p>
                  ) : (
                    filteredAvailable.map(a => (
                      <label key={a.id} className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary/50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={selectedIds.includes(a.id)}
                          onCheckedChange={() => toggleAccountSelection(a.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">ID: {a.id}</p>
                        </div>
                        {a.status && (
                          <Badge variant="outline" className={`text-[9px] flex-shrink-0 ${a.status === 'active' ? 'border-success/30 text-success' : 'border-muted text-muted-foreground'}`}>
                            {a.status}
                          </Badge>
                        )}
                      </label>
                    ))
                  )}
                </div>
                {selectedIds.length > 0 && (
                  <Button size="sm" onClick={addSelectedAccounts} disabled={addingAccounts} className="gap-1.5 w-full">
                    {addingAccounts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {t('clients.addSelected' as TranslationKey) || 'Add selected'} ({selectedIds.length})
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={fetchAvailableAccounts} disabled={loadingAccounts}>
                  <RefreshCw className="h-3 w-3 mr-1.5" /> {t('clients.refreshList' as TranslationKey) || 'Refresh list'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets — Secondary */}
      <Card className={`glass-card max-w-2xl transition-opacity ${!googleTrackingEnabled ? 'opacity-50' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sheet className="h-5 w-5 text-primary" />{t('dashboard.dataSources')} — Google Sheets
            </CardTitle>
            <div className="flex items-center gap-2">
              {!googleTrackingEnabled && <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">{t('common.disabled' as TranslationKey) || 'Disabled'}</Badge>}
              {hasMetaAccounts && googleTrackingEnabled && <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">{t('clients.secondary' as TranslationKey) || 'Secondary'}</Badge>}
              <Switch checked={googleTrackingEnabled} onCheckedChange={handleToggleGoogleTracking} />
            </div>
          </div>
        </CardHeader>
        {googleTrackingEnabled && (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('clients.syncSheetDesc')}</p>
            <PlatformSheetRow clientId={clientId} platform="meta" label="Meta Ads" fieldName="meta_sheet_url" isAdmin={isAdmin} />
            <PlatformSheetRow clientId={clientId} platform="google" label="Google Ads" fieldName="google_sheet_url" isAdmin={isAdmin} />
            <PlatformSheetRow clientId={clientId} platform="tiktok" label="TikTok Ads" fieldName="tiktok_sheet_url" isAdmin={isAdmin} />
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1 mr-3"><p className="text-sm font-medium">{t('clients.autoSync')}</p><p className="text-xs text-muted-foreground">{t('clients.autoSyncDesc')}</p></div>
              <Switch checked={autoSync} onCheckedChange={handleToggleAutoSync} className="flex-shrink-0" />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
