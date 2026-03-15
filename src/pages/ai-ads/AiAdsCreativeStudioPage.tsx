import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles, Calendar, ImageIcon, Loader2, Play, CheckCircle2, XCircle,
  Eye, RefreshCw, Copy, Wand2, LayoutGrid, List, Plus, FileText,
  Video, Layers, MessageSquare, Type, Package, ChevronRight, Film,
  Zap, ArrowRight, Download
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Client { id: string; name: string; }
interface ContentPlan {
  id: string; client_id: string; title: string; description: string;
  period_start: string | null; period_end: string | null; status: string;
  ai_prompt: string; created_at: string;
}
interface PlanItem {
  id: string; plan_id: string; title: string; description: string;
  format: string; prompt: string; status: string; sort_order: number;
  scheduled_date: string | null; generated_url: string | null;
  storage_path: string | null; ai_notes: string; copy_headline: string;
  copy_body: string; copy_cta: string; metadata: any;
}

const formatIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  carousel: <Layers className="h-4 w-4" />,
  story: <MessageSquare className="h-4 w-4" />,
  text_copy: <Type className="h-4 w-4" />,
  logo_product: <Package className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  generating: 'bg-amber-500/20 text-amber-400 animate-pulse',
  review: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-emerald-500/20 text-emerald-400',
  rejected: 'bg-destructive/20 text-destructive',
  published: 'bg-primary/20 text-primary',
};

export default function AiAdsCreativeStudioPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRu = language === 'ru';

  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ContentPlan | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingItemId, setGeneratingItemId] = useState<string | null>(null);
  const [tab, setTab] = useState('plans');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [freepikConnected, setFreepikConnected] = useState(false);

  // Generate plan form
  const [genOpen, setGenOpen] = useState(false);
  const [genClientId, setGenClientId] = useState('');
  const [genBrief, setGenBrief] = useState('');
  const [genDays, setGenDays] = useState('14');

  // Detail dialog
  const [detailItem, setDetailItem] = useState<PlanItem | null>(null);
  
  // Video generation
  const [videoGenItemId, setVideoGenItemId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('creative_content_plans' as any).select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setClients(cRes.data || []);
    setPlans((pRes.data as unknown as ContentPlan[]) || []);
    
    // Check Freepik connection
    const { data: integrations } = await supabase
      .from('platform_integrations' as any)
      .select('is_active')
      .eq('integration_type', 'freepik')
      .maybeSingle();
    setFreepikConnected(!!integrations?.is_active);
    
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadItems = useCallback(async (planId: string) => {
    const { data } = await supabase
      .from('creative_plan_items' as any)
      .select('*')
      .eq('plan_id', planId)
      .order('sort_order');
    setItems((data as unknown as PlanItem[]) || []);
  }, []);

  const selectPlan = (plan: ContentPlan) => {
    setSelectedPlan(plan);
    loadItems(plan.id);
    setTab('board');
  };

  const handleGeneratePlan = async () => {
    if (!genClientId) { toast.error(isRu ? 'Выберите клиента' : 'Select a client'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-plan', {
        body: {
          action: 'generate_plan',
          client_id: genClientId,
          brief: genBrief,
          period_days: parseInt(genDays),
          formats: ['image', 'carousel', 'story', 'text_copy', 'video', 'logo_product'],
          language,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isRu ? `План создан: ${data.items_count} элементов` : `Plan created: ${data.items_count} items`);
      setGenOpen(false);
      setGenBrief('');
      await loadData();
      const { data: newPlan } = await supabase
        .from('creative_content_plans' as any)
        .select('*')
        .eq('id', data.plan_id)
        .single();
      if (newPlan) selectPlan(newPlan as unknown as ContentPlan);
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateCreative = async (itemId: string) => {
    setGeneratingItemId(itemId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-plan', {
        body: { action: 'generate_creative', item_id: itemId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.status === 'processing') {
        toast.info(isRu ? 'Генерация запущена через Freepik. Обновится автоматически.' : 'Generation started via Freepik. Will update automatically.');
      } else {
        toast.success(isRu ? 'Креатив сгенерирован!' : 'Creative generated!');
      }
      if (selectedPlan) loadItems(selectedPlan.id);
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGeneratingItemId(null);
    }
  };

  const handleGenerateVideo = async (itemId: string, imageUrl: string) => {
    setVideoGenItemId(itemId);
    try {
      const { data, error } = await supabase.functions.invoke('freepik-generate', {
        body: {
          action: 'generate_video',
          image_url: imageUrl,
          prompt: items.find(i => i.id === itemId)?.prompt || '',
          item_id: itemId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.info(isRu ? 'Видео генерируется через Freepik (Kling v2)...' : 'Video generating via Freepik (Kling v2)...');
      if (selectedPlan) setTimeout(() => loadItems(selectedPlan.id), 5000);
    } catch (e: any) {
      toast.error(e.message || 'Video generation failed');
    } finally {
      setVideoGenItemId(null);
    }
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    await supabase.from('creative_plan_items' as any).update({ status }).eq('id', itemId);
    if (selectedPlan) loadItems(selectedPlan.id);
    toast.success(isRu ? 'Статус обновлён' : 'Status updated');
  };

  const handleGenerateCopies = async (itemId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-plan', {
        body: { action: 'generate_copies', item_id: itemId, language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isRu ? 'Копирайт сгенерирован!' : 'Ad copy generated!');
      return data;
    } catch (e: any) {
      toast.error(e.message || 'Copy generation failed');
      return null;
    }
  };

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '—';

  const groupedByStatus = items.reduce<Record<string, PlanItem[]>>((acc, item) => {
    (acc[item.status] = acc[item.status] || []).push(item);
    return acc;
  }, {});

  const statusOrder = ['pending', 'generating', 'review', 'approved', 'rejected', 'published'];
  const statusLabels: Record<string, string> = isRu
    ? { pending: 'Ожидает', generating: 'Генерация', review: 'На ревью', approved: 'Одобрено', rejected: 'Отклонено', published: 'Опубликовано' }
    : { pending: 'Pending', generating: 'Generating', review: 'Review', approved: 'Approved', rejected: 'Rejected', published: 'Published' };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            {isRu ? 'Креативная студия' : 'Creative Studio'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            {isRu ? 'ИИ-контент-планы, генерация и управление креативами' : 'AI content plans, generation & creative management'}
            {freepikConnected && (
              <Badge variant="outline" className="text-[9px] gap-1 text-emerald-400 border-emerald-400/30">
                <Zap className="h-2.5 w-2.5" /> Freepik
              </Badge>
            )}
          </p>
        </div>
        <Button className="gap-2 bg-gradient-to-r from-primary to-accent" onClick={() => setGenOpen(true)}>
          <Wand2 className="h-4 w-4" /> {isRu ? 'Создать контент-план' : 'Generate Content Plan'}
        </Button>
      </div>

      {/* Freepik Status Banner */}
      {!freepikConnected && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Zap className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {isRu ? 'Freepik API не подключён' : 'Freepik API not connected'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRu
                  ? 'Подключите Freepik в разделе Integrations для генерации через Flux Kontext Pro и видео через Kling v2. Без него используется Gemini.'
                  : 'Connect Freepik in Integrations for Flux Kontext Pro images & Kling v2 video. Falls back to Gemini without it.'}
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => window.location.href = '/ai-ads/integrations'}>
              {isRu ? 'Настроить' : 'Configure'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30">
          <TabsTrigger value="plans" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {isRu ? 'Планы' : 'Plans'}
          </TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5" disabled={!selectedPlan}>
            <LayoutGrid className="h-3.5 w-3.5" /> {isRu ? 'Доска' : 'Board'}
          </TabsTrigger>
        </TabsList>

        {/* Plans List */}
        <TabsContent value="plans" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : plans.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{isRu ? 'Нет контент-планов' : 'No Content Plans'}</h3>
              <p className="text-sm text-muted-foreground mb-4">{isRu ? 'Создайте первый ИИ-контент-план на основе брифа клиента' : 'Create your first AI content plan from a client brief'}</p>
              <Button onClick={() => setGenOpen(true)} className="gap-2">
                <Wand2 className="h-4 w-4" /> {isRu ? 'Создать план' : 'Generate Plan'}
              </Button>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map(plan => (
                <Card key={plan.id} className="hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => selectPlan(plan)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{plan.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{clientName(plan.client_id)}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{plan.status}</Badge>
                    </div>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                      {plan.period_start && <span>{plan.period_start} — {plan.period_end}</span>}
                      <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Board View */}
        <TabsContent value="board" className="mt-4">
          {selectedPlan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedPlan.title}</h2>
                  <p className="text-xs text-muted-foreground">{clientName(selectedPlan.client_id)} · {selectedPlan.period_start} — {selectedPlan.period_end}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewMode(v => v === 'board' ? 'list' : 'board')} className="gap-1.5">
                    {viewMode === 'board' ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                    {viewMode === 'board' ? (isRu ? 'Список' : 'List') : (isRu ? 'Доска' : 'Board')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadItems(selectedPlan.id)} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> {isRu ? 'Обновить' : 'Refresh'}
                  </Button>
                </div>
              </div>

              {viewMode === 'board' ? (
                <ScrollArea className="w-full">
                  <div className="flex gap-3 min-w-max pb-4">
                    {statusOrder.filter(s => (groupedByStatus[s]?.length || 0) > 0 || s === 'pending' || s === 'review' || s === 'approved').map(status => (
                      <div key={status} className="w-72 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <Badge className={`text-[10px] ${statusColors[status]}`}>{statusLabels[status]}</Badge>
                          <span className="text-xs text-muted-foreground">{groupedByStatus[status]?.length || 0}</span>
                        </div>
                        <div className="space-y-2">
                          {(groupedByStatus[status] || []).map(item => (
                            <ItemCard key={item.id} item={item} isRu={isRu}
                              isGenerating={generatingItemId === item.id}
                              isVideoGenerating={videoGenItemId === item.id}
                              freepikConnected={freepikConnected}
                              onGenerate={() => handleGenerateCreative(item.id)}
                              onGenerateVideo={() => item.generated_url && handleGenerateVideo(item.id, item.generated_url)}
                              onApprove={() => updateItemStatus(item.id, 'approved')}
                              onReject={() => updateItemStatus(item.id, 'rejected')}
                              onDetail={() => setDetailItem(item)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="space-y-2">
                  {items.map(item => (
                    <ItemRow key={item.id} item={item} isRu={isRu}
                      isGenerating={generatingItemId === item.id}
                      onGenerate={() => handleGenerateCreative(item.id)}
                      onApprove={() => updateItemStatus(item.id, 'approved')}
                      onReject={() => updateItemStatus(item.id, 'rejected')}
                      onDetail={() => setDetailItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Plan Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              {isRu ? 'Создать контент-план' : 'Generate Content Plan'}
            </DialogTitle>
            <DialogDescription>
              {isRu ? 'ИИ создаст план креативов на основе брифа клиента' : 'AI will create a creative plan from the client brief'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Клиент' : 'Client'}</label>
              <Select value={genClientId} onValueChange={setGenClientId}>
                <SelectTrigger><SelectValue placeholder={isRu ? 'Выберите клиента' : 'Select client'} /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Бриф / контекст' : 'Brief / context'}</label>
              <Textarea
                value={genBrief}
                onChange={e => setGenBrief(e.target.value)}
                placeholder={isRu ? 'Опишите продукт, цели, тон коммуникации, акции...' : 'Describe product, goals, tone, promotions...'}
                rows={4}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {isRu ? 'ИИ также использует данные из карточки клиента (ниша, ЦА, конкуренты)' : 'AI also uses client card data (niche, audience, competitors)'}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Период (дни)' : 'Period (days)'}</label>
              <Input type="number" value={genDays} onChange={e => setGenDays(e.target.value)} min={3} max={60} />
            </div>
            {freepikConnected && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-emerald-400">
                  {isRu ? 'Генерация через Freepik Flux Kontext Pro' : 'Generation via Freepik Flux Kontext Pro'}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>{isRu ? 'Отмена' : 'Cancel'}</Button>
            <Button onClick={handleGeneratePlan} disabled={generating} className="gap-2 bg-gradient-to-r from-primary to-accent">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? (isRu ? 'Генерация...' : 'Generating...') : (isRu ? 'Создать план' : 'Generate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Detail Dialog */}
      {detailItem && (
        <ItemDetailDialog item={detailItem} isRu={isRu} onClose={() => setDetailItem(null)}
          isGenerating={generatingItemId === detailItem.id}
          isVideoGenerating={videoGenItemId === detailItem.id}
          freepikConnected={freepikConnected}
          onGenerate={() => handleGenerateCreative(detailItem.id)}
          onGenerateVideo={() => detailItem.generated_url && handleGenerateVideo(detailItem.id, detailItem.generated_url)}
          onGenerateCopies={() => handleGenerateCopies(detailItem.id)}
          onApprove={() => { updateItemStatus(detailItem.id, 'approved'); setDetailItem(null); }}
          onReject={() => { updateItemStatus(detailItem.id, 'rejected'); setDetailItem(null); }}
        />
      )}
    </div>
  );
}

// ── Item Card (Board View) ──
function ItemCard({ item, isRu, isGenerating, isVideoGenerating, freepikConnected, onGenerate, onGenerateVideo, onApprove, onReject, onDetail }: {
  item: PlanItem; isRu: boolean; isGenerating: boolean; isVideoGenerating: boolean;
  freepikConnected: boolean;
  onGenerate: () => void; onGenerateVideo: () => void;
  onApprove: () => void; onReject: () => void; onDetail: () => void;
}) {
  return (
    <Card className="hover:border-primary/20 transition-colors cursor-pointer" onClick={onDetail}>
      <CardContent className="p-3">
        {item.generated_url && (
          <div className="rounded-md overflow-hidden bg-muted/20 mb-2 aspect-video relative group/img">
            {item.format === 'video' && item.generated_url.endsWith('.mp4') ? (
              <video src={item.generated_url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={item.generated_url} alt={item.title} className="w-full h-full object-cover" />
            )}
            {item.metadata?.model && (
              <span className="absolute bottom-1 right-1 text-[8px] bg-background/80 text-foreground px-1.5 py-0.5 rounded">
                {item.metadata.model}
              </span>
            )}
          </div>
        )}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-primary">{formatIcons[item.format]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
            {item.scheduled_date && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-2.5 w-2.5" /> {item.scheduled_date}
              </p>
            )}
          </div>
        </div>
        {item.copy_headline && (
          <p className="text-[10px] text-muted-foreground mt-2 line-clamp-1">📝 {item.copy_headline}</p>
        )}
        <div className="flex gap-1 mt-2 flex-wrap" onClick={e => e.stopPropagation()}>
          {item.status === 'pending' && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {isRu ? 'Генерировать' : 'Generate'}
            </Button>
          )}
          {item.status === 'generating' && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 w-full">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isRu ? 'Генерация через Freepik...' : 'Generating via Freepik...'}
            </div>
          )}
          {item.status === 'review' && (
            <>
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1 text-emerald-400 hover:text-emerald-300" onClick={onApprove}>
                <CheckCircle2 className="h-3 w-3" /> {isRu ? 'Ок' : 'Approve'}
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1 text-destructive hover:text-destructive" onClick={onReject}>
                <XCircle className="h-3 w-3" /> {isRu ? 'Нет' : 'Reject'}
              </Button>
            </>
          )}
          {item.status === 'approved' && item.generated_url && freepikConnected && item.format !== 'video' && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1" onClick={onGenerateVideo} disabled={isVideoGenerating}>
              {isVideoGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Film className="h-3 w-3" />}
              {isRu ? 'Видео' : 'Video'}
            </Button>
          )}
          {item.status === 'rejected' && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1" onClick={onGenerate} disabled={isGenerating}>
              <RefreshCw className="h-3 w-3" /> {isRu ? 'Перегенерировать' : 'Regenerate'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Item Row (List View) ──
function ItemRow({ item, isRu, isGenerating, onGenerate, onApprove, onReject, onDetail }: {
  item: PlanItem; isRu: boolean; isGenerating: boolean;
  onGenerate: () => void; onApprove: () => void; onReject: () => void; onDetail: () => void;
}) {
  return (
    <Card className="hover:border-primary/20 transition-colors cursor-pointer" onClick={onDetail}>
      <CardContent className="p-3 flex items-center gap-3">
        {item.generated_url ? (
          <div className="h-12 w-12 rounded-md overflow-hidden bg-muted/20 shrink-0">
            <img src={item.generated_url} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-12 w-12 rounded-md bg-muted/20 flex items-center justify-center shrink-0 text-primary">
            {formatIcons[item.format]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`text-[9px] ${statusColors[item.status]}`}>{item.status}</Badge>
            <span className="text-[10px] text-muted-foreground">{item.format}</span>
            {item.scheduled_date && <span className="text-[10px] text-muted-foreground">{item.scheduled_date}</span>}
            {item.metadata?.model && <span className="text-[10px] text-muted-foreground/60">{item.metadata.model}</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {item.status === 'pending' && (
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {isRu ? 'Генерировать' : 'Generate'}
            </Button>
          )}
          {item.status === 'review' && (
            <>
              <Button size="sm" variant="ghost" className="h-7 w-7 text-emerald-400" onClick={onApprove}><CheckCircle2 className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 text-destructive" onClick={onReject}><XCircle className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Item Detail Dialog ──
function ItemDetailDialog({ item, isRu, onClose, isGenerating, isVideoGenerating, freepikConnected, onGenerate, onGenerateVideo, onGenerateCopies, onApprove, onReject }: {
  item: PlanItem; isRu: boolean; onClose: () => void; isGenerating: boolean;
  isVideoGenerating: boolean; freepikConnected: boolean;
  onGenerate: () => void; onGenerateVideo: () => void;
  onGenerateCopies: () => void; onApprove: () => void; onReject: () => void;
}) {
  const [copyVariations, setCopyVariations] = useState<any[] | null>(null);
  const [loadingCopies, setLoadingCopies] = useState(false);

  const handleGetCopies = async () => {
    setLoadingCopies(true);
    const data = await onGenerateCopies();
    if (data?.variations) setCopyVariations(data.variations);
    setLoadingCopies(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-primary">{formatIcons[item.format]}</span>
            {item.title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {item.format} · {item.scheduled_date || '—'}
            {item.metadata?.model && (
              <Badge variant="outline" className="text-[9px]">{item.metadata.model}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {item.generated_url && (
            <div className="rounded-lg overflow-hidden bg-muted/20 relative">
              {item.format === 'video' && item.generated_url.endsWith('.mp4') ? (
                <video src={item.generated_url} controls className="w-full max-h-64" />
              ) : (
                <img src={item.generated_url} alt={item.title} className="w-full max-h-64 object-contain" />
              )}
              <a href={item.generated_url} target="_blank" rel="noopener noreferrer"
                className="absolute top-2 right-2 p-1.5 rounded bg-background/80 hover:bg-background text-foreground">
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          <Badge className={`text-xs ${statusColors[item.status]}`}>{item.status}</Badge>

          {item.description && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{isRu ? 'Описание' : 'Description'}</p>
              <p className="text-sm text-foreground">{item.description}</p>
            </div>
          )}

          {item.prompt && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{isRu ? 'Промпт для генерации' : 'Generation Prompt'}</p>
              <p className="text-xs text-foreground bg-muted/20 p-2 rounded-md font-mono">{item.prompt}</p>
            </div>
          )}

          {(item.copy_headline || item.copy_body || item.copy_cta) && (
            <div className="border border-border/50 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{isRu ? 'Рекламные тексты' : 'Ad Copy'}</p>
              {item.copy_headline && <div><span className="text-[10px] text-muted-foreground">Headline:</span> <span className="text-sm font-medium text-foreground">{item.copy_headline}</span></div>}
              {item.copy_body && <div><span className="text-[10px] text-muted-foreground">Body:</span> <span className="text-sm text-foreground">{item.copy_body}</span></div>}
              {item.copy_cta && <div><span className="text-[10px] text-muted-foreground">CTA:</span> <Badge variant="outline" className="text-xs">{item.copy_cta}</Badge></div>}
            </div>
          )}

          {/* Copy Variations */}
          {copyVariations && (
            <div className="border border-border/50 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{isRu ? 'Вариации копирайта' : 'Copy Variations'}</p>
              {copyVariations.map((v: any, i: number) => (
                <div key={i} className="bg-muted/10 rounded-md p-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground">#{i + 1}</p>
                  <p className="text-sm font-medium text-foreground">{v.headline}</p>
                  <p className="text-xs text-foreground">{v.body}</p>
                  <Badge variant="outline" className="text-[10px]">{v.cta}</Badge>
                </div>
              ))}
            </div>
          )}

          {item.ai_notes && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{isRu ? 'Заметки ИИ' : 'AI Notes'}</p>
              <p className="text-xs text-muted-foreground italic">{item.ai_notes}</p>
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {(item.status === 'pending' || item.status === 'rejected') && (
            <Button onClick={onGenerate} disabled={isGenerating} className="gap-2 bg-gradient-to-r from-primary to-accent">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRu ? 'Генерировать' : 'Generate'}
            </Button>
          )}
          {item.status === 'review' && (
            <>
              <Button variant="outline" className="gap-2 text-emerald-400" onClick={onApprove}>
                <CheckCircle2 className="h-4 w-4" /> {isRu ? 'Одобрить' : 'Approve'}
              </Button>
              <Button variant="outline" className="gap-2 text-destructive" onClick={onReject}>
                <XCircle className="h-4 w-4" /> {isRu ? 'Отклонить' : 'Reject'}
              </Button>
            </>
          )}
          {item.generated_url && freepikConnected && item.format !== 'video' && (
            <Button variant="outline" className="gap-2" onClick={onGenerateVideo} disabled={isVideoGenerating}>
              {isVideoGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              {isRu ? 'Создать видео' : 'Create Video'}
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handleGetCopies} disabled={loadingCopies}>
            {loadingCopies ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            {isRu ? 'Генерировать копирайт' : 'Generate Copy'}
          </Button>
          <Button variant="outline" onClick={onClose}>{isRu ? 'Закрыть' : 'Close'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
