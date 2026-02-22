import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, ExternalLink, X, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FinanceSheetSyncProps {
  tabKey: 'financial_planning' | 'income_plan';
  onSyncComplete?: () => void;
}

function extractEmbedUrl(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id = match[1];
  const gidMatch = url.match(/[?&#]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${id}/edit?gid=${gid}&widget=true&chrome=false&rm=embedded`;
}

export default function FinanceSheetSync({ tabKey }: FinanceSheetSyncProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', `finance_sheet_${tabKey}`)
        .maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setSheetUrl(val.url || '');
        setSavedUrl(val.url || '');
        if (val.url) setShowEmbed(true);
      }
      setLoading(false);
    };
    load();
  }, [tabKey]);

  // Prevent parent scroll when hovering over iframe container
  useEffect(() => {
    const container = iframeContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Stop the wheel event from propagating to parent scroll containers
      e.stopPropagation();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [showEmbed]);

  const saveUrl = async () => {
    if (!sheetUrl) {
      toast.error('Вставьте ссылку на Google таблицу');
      return;
    }
    const embedUrl = extractEmbedUrl(sheetUrl);
    if (!embedUrl) {
      toast.error('Некорректная ссылка на Google Sheets');
      return;
    }
    await supabase.from('platform_settings').upsert({
      key: `finance_sheet_${tabKey}`,
      value: { url: sheetUrl },
    }, { onConflict: 'key' });
    setSavedUrl(sheetUrl);
    setShowEmbed(true);
    toast.success('Таблица подключена');
  };

  const disconnect = async () => {
    await supabase.from('platform_settings').upsert({
      key: `finance_sheet_${tabKey}`,
      value: { url: '' },
    }, { onConflict: 'key' });
    setSavedUrl('');
    setSheetUrl('');
    setShowEmbed(false);
    toast.success('Таблица отключена');
  };

  if (loading) return null;

  const embedUrl = savedUrl ? extractEmbedUrl(savedUrl) : null;

  return (
    <div className="flex flex-col h-full gap-2">
      <Card className="glass-card border-border/40 flex-shrink-0">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">Google Sheets</span>
            </div>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="h-7 text-xs flex-1 min-w-0"
            />
            {!savedUrl ? (
              <Button size="sm" variant="outline" onClick={saveUrl} disabled={!sheetUrl} className="h-7 gap-1.5 text-xs shrink-0">
                <Link2 className="h-3 w-3" />
                Подключить
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setShowEmbed(!showEmbed)} className="h-7 gap-1 text-xs">
                  {showEmbed ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  {showEmbed ? 'Скрыть' : 'Показать'}
                </Button>
                <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Button size="sm" variant="ghost" onClick={disconnect} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showEmbed && embedUrl && (
        <Card className="glass-card border-border/40 overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 flex-shrink-0" style={{ background: 'hsl(var(--muted)/0.3)' }}>
            <span className="text-[10px] text-muted-foreground">Google Sheets — прямое редактирование</span>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-5 w-5 p-0">
              {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
          </div>
          <div
            ref={iframeContainerRef}
            className="flex-1 min-h-0 relative"
            style={{ isolation: 'isolate' }}
          >
            <iframe
              src={embedUrl}
              className="w-full h-full border-0 absolute inset-0"
              style={{ minHeight: expanded ? '80vh' : 'calc(100vh - 220px)' }}
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
