import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  Sparkles, Calendar, ImageIcon, Loader2, Play, CheckCircle2, XCircle,
  Eye, RefreshCw, Copy, Wand2, LayoutGrid, List, Plus, FileText,
  Video, Layers, MessageSquare, Type, Package, ChevronRight, Film,
  Zap, ArrowRight, Download, Music, AudioLines, Scissors, Search,
  Upload, Maximize, Palette, Eraser, RotateCw
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ──
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

// ── Freepik model configs ──
const IMAGE_MODELS = [
  { value: 'realism', label: 'Mystic Realism', desc: 'Photorealistic, natural look' },
  { value: 'fluid', label: 'Mystic Fluid', desc: 'Best prompt adherence, creative' },
  { value: 'zen', label: 'Mystic Zen', desc: 'Smooth, clean, minimal' },
  { value: 'flexible', label: 'Mystic Flexible', desc: 'Good for illustrations, HDR' },
  { value: 'super_real', label: 'Mystic Super Real', desc: 'Maximum realism' },
  { value: 'editorial_portraits', label: 'Editorial Portraits', desc: 'Best for close-ups' },
];

const VIDEO_MODELS = [
  { value: 'kling-v2.1-pro', label: 'Kling 2.1 Pro', desc: 'High-quality I2V' },
  { value: 'kling-v2.5-pro', label: 'Kling 2.5 Pro', desc: 'Enhanced motion' },
  { value: 'kling-v2.6-pro', label: 'Kling 2.6 Pro', desc: 'Latest with motion control' },
  { value: 'hailuo-02', label: 'Hailuo 02 1080p', desc: 'MiniMax video' },
  { value: 'wan-2.5-i2v', label: 'WAN 2.5 I2V', desc: 'Image-to-video 1080p' },
  { value: 'wan-2.5-t2v', label: 'WAN 2.5 T2V', desc: 'Text-to-video 1080p' },
  { value: 'runway-gen4', label: 'RunWay Gen4 Turbo', desc: 'Fast video gen' },
  { value: 'seedance-pro', label: 'Seedance Pro', desc: 'ByteDance model' },
];

const ASPECT_RATIOS = [
  { value: 'square_1_1', label: '1:1' },
  { value: 'widescreen_16_9', label: '16:9' },
  { value: 'social_story_9_16', label: '9:16' },
  { value: 'classic_4_3', label: '4:3' },
  { value: 'traditional_3_4', label: '3:4' },
  { value: 'standard_3_2', label: '3:2' },
  { value: 'portrait_2_3', label: '2:3' },
];

const RESOLUTIONS = [
  { value: '1k', label: '1K' },
  { value: '2k', label: '2K' },
  { value: '4k', label: '4K' },
];

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

  const [genOpen, setGenOpen] = useState(false);
  const [genClientId, setGenClientId] = useState('');
  const [genBrief, setGenBrief] = useState('');
  const [genDays, setGenDays] = useState('14');
  const [detailItem, setDetailItem] = useState<PlanItem | null>(null);
  const [videoGenItemId, setVideoGenItemId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('creative_content_plans' as any).select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setClients(cRes.data || []);
    setPlans((pRes.data as unknown as ContentPlan[]) || []);
    const { data: integrations } = await supabase
      .from('platform_integrations' as any).select('is_active').eq('integration_type', 'freepik').maybeSingle();
    setFreepikConnected(!!(integrations as any)?.is_active);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadItems = useCallback(async (planId: string) => {
    const { data } = await supabase.from('creative_plan_items' as any).select('*').eq('plan_id', planId).order('sort_order');
    setItems((data as unknown as PlanItem[]) || []);
  }, []);

  const selectPlan = (plan: ContentPlan) => { setSelectedPlan(plan); loadItems(plan.id); setTab('board'); };

  const handleGeneratePlan = async () => {
    if (!genClientId) { toast.error(isRu ? 'Выберите клиента' : 'Select a client'); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-plan', {
        body: { action: 'generate_plan', client_id: genClientId, brief: genBrief, period_days: parseInt(genDays), formats: ['image', 'carousel', 'story', 'text_copy', 'video', 'logo_product'], language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isRu ? `План создан: ${data.items_count} элементов` : `Plan created: ${data.items_count} items`);
      setGenOpen(false); setGenBrief('');
      await loadData();
      const { data: newPlan } = await supabase.from('creative_content_plans' as any).select('*').eq('id', data.plan_id).single();
      if (newPlan) selectPlan(newPlan as unknown as ContentPlan);
    } catch (e: any) { toast.error(e.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const handleGenerateCreative = async (itemId: string) => {
    setGeneratingItemId(itemId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-plan', { body: { action: 'generate_creative', item_id: itemId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.status === 'processing') toast.info(isRu ? 'Генерация запущена через Freepik (Mystic).' : 'Generation started via Freepik (Mystic).');
      else toast.success(isRu ? 'Креатив сгенерирован!' : 'Creative generated!');
      if (selectedPlan) loadItems(selectedPlan.id);
    } catch (e: any) { toast.error(e.message || 'Generation failed'); }
    finally { setGeneratingItemId(null); }
  };

  const handleGenerateVideo = async (itemId: string, imageUrl: string) => {
    setVideoGenItemId(itemId);
    try {
      const { data, error } = await supabase.functions.invoke('freepik-generate', {
        body: { action: 'generate_video', image_url: imageUrl, prompt: items.find(i => i.id === itemId)?.prompt || '', item_id: itemId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.info(isRu ? 'Видео генерируется...' : 'Video generating...');
      if (selectedPlan) setTimeout(() => loadItems(selectedPlan.id), 5000);
    } catch (e: any) { toast.error(e.message || 'Video generation failed'); }
    finally { setVideoGenItemId(null); }
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    await supabase.from('creative_plan_items' as any).update({ status }).eq('id', itemId);
    if (selectedPlan) loadItems(selectedPlan.id);
    toast.success(isRu ? 'Статус обновлён' : 'Status updated');
  };

  const handleGenerateCopies = async (itemId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-content-plan', { body: { action: 'generate_copies', item_id: itemId, language } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isRu ? 'Копирайт сгенерирован!' : 'Ad copy generated!');
      return data;
    } catch (e: any) { toast.error(e.message || 'Copy generation failed'); return null; }
  };

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || '—';
  const groupedByStatus = items.reduce<Record<string, PlanItem[]>>((acc, item) => { (acc[item.status] = acc[item.status] || []).push(item); return acc; }, {});
  const statusOrder = ['pending', 'generating', 'review', 'approved', 'rejected', 'published'];
  const statusLabels: Record<string, string> = isRu
    ? { pending: 'Ожидает', generating: 'Генерация', review: 'На ревью', approved: 'Одобрено', rejected: 'Отклонено', published: 'Опубликовано' }
    : { pending: 'Pending', generating: 'Generating', review: 'Review', approved: 'Approved', rejected: 'Rejected', published: 'Published' };

  return (
    <div className="space-y-4">
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

      {!freepikConnected && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Zap className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{isRu ? 'Freepik API не подключён' : 'Freepik API not connected'}</p>
              <p className="text-xs text-muted-foreground">
                {isRu ? 'Подключите Freepik в Integrations для Mystic, видео, музыки и всего доступного функционала.' : 'Connect Freepik in Integrations for Mystic, video, music and all features.'}
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
          <TabsTrigger value="plans" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> {isRu ? 'Планы' : 'Plans'}</TabsTrigger>
          <TabsTrigger value="board" className="gap-1.5" disabled={!selectedPlan}><LayoutGrid className="h-3.5 w-3.5" /> {isRu ? 'Доска' : 'Board'}</TabsTrigger>
          <TabsTrigger value="spaces" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Spaces</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : plans.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{isRu ? 'Нет контент-планов' : 'No Content Plans'}</h3>
              <p className="text-sm text-muted-foreground mb-4">{isRu ? 'Создайте первый план' : 'Create your first plan'}</p>
              <Button onClick={() => setGenOpen(true)} className="gap-2"><Wand2 className="h-4 w-4" /> {isRu ? 'Создать план' : 'Generate Plan'}</Button>
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
                    {plan.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{plan.description}</p>}
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

        {/* Board Tab */}
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
                    {statusOrder.filter(s => (groupedByStatus[s]?.length || 0) > 0 || ['pending', 'review', 'approved'].includes(s)).map(status => (
                      <div key={status} className="w-72 flex-shrink-0">
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <Badge className={`text-[10px] ${statusColors[status]}`}>{statusLabels[status]}</Badge>
                          <span className="text-xs text-muted-foreground">{groupedByStatus[status]?.length || 0}</span>
                        </div>
                        <div className="space-y-2">
                          {(groupedByStatus[status] || []).map(item => (
                            <BoardItemCard key={item.id} item={item} isRu={isRu}
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
                    <ListItemRow key={item.id} item={item} isRu={isRu}
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

        {/* Spaces Tab */}
        <TabsContent value="spaces" className="mt-4">
          <SpacesWorkspace isRu={isRu} freepikConnected={freepikConnected} />
        </TabsContent>
      </Tabs>

      {/* Generate Plan Dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> {isRu ? 'Создать контент-план' : 'Generate Content Plan'}</DialogTitle>
            <DialogDescription>{isRu ? 'ИИ создаст план креативов на основе брифа клиента' : 'AI will create a creative plan from the client brief'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Клиент' : 'Client'}</label>
              <Select value={genClientId} onValueChange={setGenClientId}>
                <SelectTrigger><SelectValue placeholder={isRu ? 'Выберите клиента' : 'Select client'} /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Бриф / контекст' : 'Brief / context'}</label>
              <Textarea value={genBrief} onChange={e => setGenBrief(e.target.value)} placeholder={isRu ? 'Опишите продукт, цели...' : 'Describe product, goals...'} rows={4} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Период (дни)' : 'Period (days)'}</label>
              <Input type="number" value={genDays} onChange={e => setGenDays(e.target.value)} min={3} max={60} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>{isRu ? 'Отмена' : 'Cancel'}</Button>
            <Button onClick={handleGeneratePlan} disabled={generating} className="gap-2 bg-gradient-to-r from-primary to-accent">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? (isRu ? 'Генерация...' : 'Generating...') : (isRu ? 'Создать' : 'Generate')}
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

// ══════════════════════════════════════════════
// SPACES WORKSPACE
// ══════════════════════════════════════════════
type SpaceTool = 'image' | 'video' | 'music' | 'sfx' | 'upscale' | 'remove_bg' | 'stock';

function SpacesWorkspace({ isRu, freepikConnected }: { isRu: boolean; freepikConnected: boolean }) {
  const [activeTool, setActiveTool] = useState<SpaceTool | null>(null);

  if (!freepikConnected) {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="py-16 text-center">
          <Zap className="h-12 w-12 mx-auto text-amber-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">{isRu ? 'Подключите Freepik' : 'Connect Freepik'}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isRu ? 'Spaces требует подключённый Freepik API для генерации изображений, видео, музыки и многого другого.' : 'Spaces requires a connected Freepik API for images, video, music and more.'}
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/ai-ads/integrations'}>{isRu ? 'Настроить' : 'Configure'}</Button>
        </CardContent>
      </Card>
    );
  }

  const tools: { key: SpaceTool; icon: React.ReactNode; label: string; desc: string }[] = [
    { key: 'image', icon: <ImageIcon className="h-6 w-6" />, label: isRu ? 'Генератор изображений' : 'Image Generator', desc: isRu ? 'Mystic AI · 6 моделей · до 4K' : 'Mystic AI · 6 models · up to 4K' },
    { key: 'video', icon: <Video className="h-6 w-6" />, label: isRu ? 'Генератор видео' : 'Video Generator', desc: isRu ? '8 моделей · Kling, WAN, RunWay' : '8 models · Kling, WAN, RunWay' },
    { key: 'music', icon: <Music className="h-6 w-6" />, label: isRu ? 'Генератор музыки' : 'Music Generator', desc: isRu ? 'AI музыка по описанию' : 'AI music from text' },
    { key: 'sfx', icon: <AudioLines className="h-6 w-6" />, label: isRu ? 'Звуковые эффекты' : 'Sound Effects', desc: isRu ? 'AI SFX для видео и рекламы' : 'AI SFX for video & ads' },
    { key: 'upscale', icon: <Maximize className="h-6 w-6" />, label: isRu ? 'Апскейл (Magnific)' : 'Upscale (Magnific)', desc: isRu ? 'Увеличение до 4x' : 'Up to 4x enhancement' },
    { key: 'remove_bg', icon: <Eraser className="h-6 w-6" />, label: isRu ? 'Удаление фона' : 'Remove Background', desc: isRu ? 'Автоматическое удаление фона' : 'Automatic background removal' },
    { key: 'stock', icon: <Search className="h-6 w-6" />, label: isRu ? 'Стоковые ресурсы' : 'Stock Resources', desc: isRu ? 'Поиск фото, векторов, иконок' : 'Search photos, vectors, icons' },
  ];

  if (!activeTool) {
    return (
      <div className="space-y-8">
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-foreground mb-2">{isRu ? 'Ваше пространство готово' : 'Your Space is Ready'}</h2>
          <p className="text-sm text-muted-foreground">{isRu ? 'Выберите инструмент и начните творить' : 'Choose a tool and start creating'}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {tools.map(t => (
            <Card key={t.key} className="hover:border-primary/40 transition-all cursor-pointer group hover:shadow-lg hover:shadow-primary/5" onClick={() => setActiveTool(t.key)}>
              <CardContent className="p-5 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-xl bg-muted/30 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                  {t.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setActiveTool(null)} className="gap-1.5 text-muted-foreground">
        <ChevronRight className="h-3.5 w-3.5 rotate-180" /> {isRu ? 'Назад к инструментам' : 'Back to tools'}
      </Button>
      {activeTool === 'image' && <ImageGeneratorTool isRu={isRu} />}
      {activeTool === 'video' && <VideoGeneratorTool isRu={isRu} />}
      {activeTool === 'music' && <MusicGeneratorTool isRu={isRu} />}
      {activeTool === 'sfx' && <SfxGeneratorTool isRu={isRu} />}
      {activeTool === 'upscale' && <UpscaleTool isRu={isRu} />}
      {activeTool === 'remove_bg' && <RemoveBgTool isRu={isRu} />}
      {activeTool === 'stock' && <StockSearchTool isRu={isRu} />}
    </div>
  );
}

// ── Helper: call freepik-generate edge function ──
async function callFreepik(action: string, body: any) {
  const { data, error } = await supabase.functions.invoke('freepik-generate', { body: { action, ...body } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function pollFreepikTask(action: string, taskId: string, extraBody: any = {}, interval = 3000, maxAttempts = 40): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, interval));
    const data = await callFreepik(action, { task_id: taskId, ...extraBody });
    const status = data?.data?.status;
    if (status === 'COMPLETED') return data;
    if (status === 'FAILED') throw new Error(data?.data?.error || 'Generation failed');
  }
  throw new Error('Timeout — generation took too long');
}

// ══════ IMAGE GENERATOR ══════
function ImageGeneratorTool({ isRu }: { isRu: boolean }) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('realism');
  const [aspect, setAspect] = useState('square_1_1');
  const [resolution, setResolution] = useState('2k');
  const [detailing, setDetailing] = useState(33);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResultUrl(null); setTaskStatus(isRu ? 'Отправка...' : 'Submitting...');
    try {
      const data = await callFreepik('generate_mystic', { prompt, model, aspect_ratio: aspect, resolution, creative_detailing: detailing });
      const taskId = data.task_id;
      setTaskStatus(isRu ? 'Генерация...' : 'Generating...');

      const result = await pollFreepikTask('check_mystic', taskId);
      const images = result?.data?.generated || [];
      const url = images[0]?.url || images[0];
      if (url) {
        setResultUrl(url);
        toast.success(isRu ? 'Изображение готово!' : 'Image ready!');
      } else throw new Error('No image returned');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); setTaskStatus(''); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-5 w-5 text-primary" /> {isRu ? 'Генератор изображений' : 'Image Generator'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Промпт' : 'Prompt'}</label>
            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder={isRu ? 'Опишите изображение...' : 'Describe the image...'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Модель' : 'Model'}</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map(m => <SelectItem key={m.value} value={m.value}><span className="text-xs">{m.label}</span></SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">{IMAGE_MODELS.find(m => m.value === model)?.desc}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Соотношение' : 'Aspect Ratio'}</label>
              <Select value={aspect} onValueChange={setAspect}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASPECT_RATIOS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'Разрешение' : 'Resolution'}</label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RESOLUTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Creative Detailing: {detailing}</label>
              <Slider min={0} max={100} step={1} value={[detailing]} onValueChange={v => setDetailing(v[0])} className="mt-2" />
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full gap-2 bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? taskStatus : (isRu ? 'Генерировать' : 'Generate')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-center min-h-[400px]">
          {resultUrl ? (
            <div className="space-y-3 w-full">
              <img src={resultUrl} alt="Generated" className="rounded-lg w-full max-h-[500px] object-contain" />
              <div className="flex gap-2">
                <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5"><Download className="h-3.5 w-3.5" /> {isRu ? 'Скачать' : 'Download'}</Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-16 w-16 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{isRu ? 'Результат появится здесь' : 'Result will appear here'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════ VIDEO GENERATOR ══════
function VideoGeneratorTool({ isRu }: { isRu: boolean }) {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [model, setModel] = useState('kling-v2.1-pro');
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState('');

  const isT2V = model === 'wan-2.5-t2v';

  const handleGenerate = async () => {
    if (!isT2V && !imageUrl.trim()) { toast.error(isRu ? 'Укажите URL изображения' : 'Image URL required'); return; }
    if (!prompt.trim() && isT2V) { toast.error(isRu ? 'Укажите промпт' : 'Prompt required'); return; }
    setLoading(true); setResultUrl(null); setTaskStatus(isRu ? 'Отправка...' : 'Submitting...');
    try {
      const body: any = { model, duration, prompt };
      if (!isT2V) body.image_url = imageUrl;
      const data = await callFreepik('generate_video', body);
      setTaskStatus(isRu ? 'Генерация видео (до 3 мин)...' : 'Generating video (up to 3 min)...');

      const endpoint = data.endpoint || `image-to-video/${model}`;
      const result = await pollFreepikTask('check_video', data.task_id, { endpoint }, 5000, 60);
      const videoUrl = result?.data?.generated?.[0]?.url || result?.data?.video?.url;
      if (videoUrl) { setResultUrl(videoUrl); toast.success(isRu ? 'Видео готово!' : 'Video ready!'); }
      else throw new Error('No video returned');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); setTaskStatus(''); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Video className="h-5 w-5 text-primary" /> {isRu ? 'Генератор видео' : 'Video Generator'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Модель' : 'Model'}</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VIDEO_MODELS.map(m => <SelectItem key={m.value} value={m.value}><span className="text-xs">{m.label} — {m.desc}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
          {!isT2V && (
            <div>
              <label className="text-xs font-medium text-foreground">{isRu ? 'URL изображения' : 'Image URL'}</label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Промпт (опционально)' : 'Prompt (optional)'}</label>
            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder={isRu ? 'Описание движения...' : 'Describe the motion...'} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Длительность (сек)' : 'Duration (sec)'}: {duration}</label>
            <Slider min={2} max={10} step={1} value={[duration]} onValueChange={v => setDuration(v[0])} className="mt-2" />
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2 bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            {loading ? taskStatus : (isRu ? 'Генерировать видео' : 'Generate Video')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-center min-h-[400px]">
          {resultUrl ? (
            <div className="space-y-3 w-full">
              <video src={resultUrl} controls className="rounded-lg w-full max-h-[500px]" />
              <a href={resultUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1.5"><Download className="h-3.5 w-3.5" /> {isRu ? 'Скачать' : 'Download'}</Button></a>
            </div>
          ) : (
            <div className="text-center text-muted-foreground"><Video className="h-16 w-16 mx-auto mb-3 opacity-20" /><p className="text-sm">{isRu ? 'Результат видео' : 'Video result'}</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════ MUSIC GENERATOR ══════
function MusicGeneratorTool({ isRu }: { isRu: boolean }) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResultUrl(null);
    try {
      const data = await callFreepik('generate_music', { prompt, duration });
      const result = await pollFreepikTask('check_music', data.task_id, {}, 5000, 60);
      const url = result?.data?.generated?.[0]?.url || result?.data?.audio_url;
      if (url) { setResultUrl(url); toast.success(isRu ? 'Музыка готова!' : 'Music ready!'); }
      else throw new Error('No audio returned');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Music className="h-5 w-5 text-primary" /> {isRu ? 'Генератор музыки' : 'Music Generator'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Описание трека' : 'Track description'}</label>
            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder={isRu ? 'Энергичный электронный трек для рекламного видео...' : 'Upbeat electronic track for ad video...'} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Длительность (сек)' : 'Duration (sec)'}: {duration}</label>
            <Slider min={5} max={120} step={5} value={[duration]} onValueChange={v => setDuration(v[0])} className="mt-2" />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full gap-2 bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
            {loading ? (isRu ? 'Генерация...' : 'Generating...') : (isRu ? 'Создать музыку' : 'Generate Music')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-center min-h-[300px]">
          {resultUrl ? (
            <div className="space-y-3 w-full text-center">
              <Music className="h-12 w-12 mx-auto text-primary" />
              <audio src={resultUrl} controls className="w-full" />
              <a href={resultUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1.5"><Download className="h-3.5 w-3.5" /> {isRu ? 'Скачать' : 'Download'}</Button></a>
            </div>
          ) : (
            <div className="text-center text-muted-foreground"><Music className="h-16 w-16 mx-auto mb-3 opacity-20" /><p className="text-sm">{isRu ? 'Аудио появится здесь' : 'Audio will appear here'}</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════ SFX GENERATOR ══════
function SfxGeneratorTool({ isRu }: { isRu: boolean }) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResultUrl(null);
    try {
      const data = await callFreepik('generate_sfx', { prompt, duration });
      const result = await pollFreepikTask('check_sfx', data.task_id, {}, 3000, 30);
      const url = result?.data?.generated?.[0]?.url || result?.data?.audio_url;
      if (url) { setResultUrl(url); toast.success(isRu ? 'SFX готов!' : 'SFX ready!'); }
      else throw new Error('No audio returned');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AudioLines className="h-5 w-5 text-primary" /> {isRu ? 'Звуковые эффекты' : 'Sound Effects'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Описание звука' : 'Sound description'}</label>
            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3} placeholder={isRu ? 'Звук клика, свист, взрыв...' : 'Click sound, whoosh, explosion...'} />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Длительность (сек)' : 'Duration (sec)'}: {duration}</label>
            <Slider min={1} max={22} step={1} value={[duration]} onValueChange={v => setDuration(v[0])} className="mt-2" />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="w-full gap-2 bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AudioLines className="h-4 w-4" />}
            {loading ? (isRu ? 'Генерация...' : 'Generating...') : (isRu ? 'Создать SFX' : 'Generate SFX')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-center min-h-[300px]">
          {resultUrl ? (
            <div className="space-y-3 w-full text-center">
              <AudioLines className="h-12 w-12 mx-auto text-primary" />
              <audio src={resultUrl} controls className="w-full" />
              <a href={resultUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1.5"><Download className="h-3.5 w-3.5" /> {isRu ? 'Скачать' : 'Download'}</Button></a>
            </div>
          ) : (
            <div className="text-center text-muted-foreground"><AudioLines className="h-16 w-16 mx-auto mb-3 opacity-20" /><p className="text-sm">{isRu ? 'Звук появится здесь' : 'Sound will appear here'}</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════ UPSCALE ══════
function UpscaleTool({ isRu }: { isRu: boolean }) {
  const [imageUrl, setImageUrl] = useState('');
  const [scale, setScale] = useState(2);
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleUpscale = async () => {
    if (!imageUrl.trim()) return;
    setLoading(true); setResultUrl(null);
    try {
      const data = await callFreepik('upscale', { image_url: imageUrl, scale });
      // Upscaler might return directly or as a task
      const url = data?.data?.generated?.[0]?.url || data?.data?.url;
      if (data?.data?.task_id) {
        const result = await pollFreepikTask('check_upscale', data.data.task_id, { endpoint: 'image-upscaler' }, 3000, 30);
        const u = result?.data?.generated?.[0]?.url;
        if (u) { setResultUrl(u); toast.success(isRu ? 'Апскейл готов!' : 'Upscale ready!'); }
      } else if (url) {
        setResultUrl(url); toast.success(isRu ? 'Апскейл готов!' : 'Upscale ready!');
      } else throw new Error('No result');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Maximize className="h-5 w-5 text-primary" /> {isRu ? 'Апскейл изображения' : 'Image Upscale'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">URL {isRu ? 'изображения' : 'image'}</label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">{isRu ? 'Масштаб' : 'Scale'}: {scale}x</label>
            <Slider min={2} max={4} step={1} value={[scale]} onValueChange={v => setScale(v[0])} className="mt-2" />
          </div>
          <Button onClick={handleUpscale} disabled={loading || !imageUrl.trim()} className="w-full gap-2 bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Maximize className="h-4 w-4" />}
            {loading ? (isRu ? 'Обработка...' : 'Processing...') : (isRu ? 'Увеличить' : 'Upscale')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-center min-h-[400px]">
          {resultUrl ? (
            <div className="space-y-3 w-full">
              <img src={resultUrl} alt="Upscaled" className="rounded-lg w-full max-h-[500px] object-contain" />
              <a href={resultUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1.5"><Download className="h-3.5 w-3.5" /> {isRu ? 'Скачать' : 'Download'}</Button></a>
            </div>
          ) : (
            <div className="text-center text-muted-foreground"><Maximize className="h-16 w-16 mx-auto mb-3 opacity-20" /><p className="text-sm">{isRu ? 'Результат апскейла' : 'Upscale result'}</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════ REMOVE BG ══════
function RemoveBgTool({ isRu }: { isRu: boolean }) {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const handleRemove = async () => {
    if (!imageUrl.trim()) return;
    setLoading(true); setResultUrl(null);
    try {
      const data = await callFreepik('remove_background', { image_url: imageUrl });
      const url = data?.data?.generated?.[0]?.url || data?.data?.url || data?.data?.result?.url;
      if (url) { setResultUrl(url); toast.success(isRu ? 'Фон удалён!' : 'Background removed!'); }
      else throw new Error('No result');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Eraser className="h-5 w-5 text-primary" /> {isRu ? 'Удаление фона' : 'Remove Background'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">URL {isRu ? 'изображения' : 'image'}</label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button onClick={handleRemove} disabled={loading || !imageUrl.trim()} className="w-full gap-2 bg-gradient-to-r from-primary to-accent">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
            {loading ? (isRu ? 'Обработка...' : 'Processing...') : (isRu ? 'Удалить фон' : 'Remove Background')}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center justify-center min-h-[400px] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmMSIvPjxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZmZmMSIvPjwvc3ZnPg==')] rounded-lg">
          {resultUrl ? (
            <div className="space-y-3 w-full">
              <img src={resultUrl} alt="No bg" className="rounded-lg w-full max-h-[500px] object-contain" />
              <a href={resultUrl} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="w-full gap-1.5"><Download className="h-3.5 w-3.5" /> {isRu ? 'Скачать' : 'Download'}</Button></a>
            </div>
          ) : (
            <div className="text-center text-muted-foreground"><Eraser className="h-16 w-16 mx-auto mb-3 opacity-20" /><p className="text-sm">{isRu ? 'Результат' : 'Result'}</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════ STOCK SEARCH ══════
function StockSearchTool({ isRu }: { isRu: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await callFreepik('search_stock', { query, per_page: 30 });
      setResults(data?.data || []);
      if ((data?.data || []).length === 0) toast.info(isRu ? 'Ничего не найдено' : 'No results');
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Search className="h-5 w-5 text-primary" /> {isRu ? 'Поиск стоковых ресурсов' : 'Stock Resource Search'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder={isRu ? 'Поиск фото, векторов...' : 'Search photos, vectors...'} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <Button onClick={handleSearch} disabled={loading || !query.trim()} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {isRu ? 'Найти' : 'Search'}
          </Button>
        </div>
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map((item: any, i: number) => (
              <a key={i} href={item.url || item.image?.source?.url || '#'} target="_blank" rel="noopener noreferrer" className="group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted/20 border border-border/30 group-hover:border-primary/40 transition-colors">
                  <img src={item.image?.source?.url || item.thumbnail?.url || item.url} alt={item.title || ''} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 truncate">{item.title || ''}</p>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════
// BOARD COMPONENTS (unchanged logic, extracted)
// ══════════════════════════════════════════════

function BoardItemCard({ item, isRu, isGenerating, isVideoGenerating, freepikConnected, onGenerate, onGenerateVideo, onApprove, onReject, onDetail }: {
  item: PlanItem; isRu: boolean; isGenerating: boolean; isVideoGenerating: boolean; freepikConnected: boolean;
  onGenerate: () => void; onGenerateVideo: () => void; onApprove: () => void; onReject: () => void; onDetail: () => void;
}) {
  return (
    <Card className="hover:border-primary/20 transition-colors cursor-pointer" onClick={onDetail}>
      <CardContent className="p-3">
        {item.generated_url && (
          <div className="rounded-md overflow-hidden bg-muted/20 mb-2 aspect-video relative">
            {item.format === 'video' && item.generated_url.endsWith('.mp4') ? (
              <video src={item.generated_url} className="w-full h-full object-cover" muted />
            ) : (
              <img src={item.generated_url} alt={item.title} className="w-full h-full object-cover" />
            )}
          </div>
        )}
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-primary">{formatIcons[item.format]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
            {item.scheduled_date && <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Calendar className="h-2.5 w-2.5" /> {item.scheduled_date}</p>}
          </div>
        </div>
        {item.copy_headline && <p className="text-[10px] text-muted-foreground mt-2 line-clamp-1">📝 {item.copy_headline}</p>}
        <div className="flex gap-1 mt-2 flex-wrap" onClick={e => e.stopPropagation()}>
          {item.status === 'pending' && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} {isRu ? 'Генерировать' : 'Generate'}
            </Button>
          )}
          {item.status === 'generating' && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-400 w-full"><Loader2 className="h-3 w-3 animate-spin" /> {isRu ? 'Генерация...' : 'Generating...'}</div>
          )}
          {item.status === 'review' && (<>
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1 text-emerald-400" onClick={onApprove}><CheckCircle2 className="h-3 w-3" /> {isRu ? 'Ок' : 'Approve'}</Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1 text-destructive" onClick={onReject}><XCircle className="h-3 w-3" /> {isRu ? 'Нет' : 'Reject'}</Button>
          </>)}
          {item.status === 'approved' && item.generated_url && freepikConnected && item.format !== 'video' && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 flex-1" onClick={onGenerateVideo} disabled={isVideoGenerating}>
              {isVideoGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Film className="h-3 w-3" />} {isRu ? 'Видео' : 'Video'}
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

function ListItemRow({ item, isRu, isGenerating, onGenerate, onApprove, onReject, onDetail }: {
  item: PlanItem; isRu: boolean; isGenerating: boolean;
  onGenerate: () => void; onApprove: () => void; onReject: () => void; onDetail: () => void;
}) {
  return (
    <Card className="hover:border-primary/20 transition-colors cursor-pointer" onClick={onDetail}>
      <CardContent className="p-3 flex items-center gap-3">
        {item.generated_url ? (
          <div className="h-12 w-12 rounded-md overflow-hidden bg-muted/20 shrink-0"><img src={item.generated_url} alt="" className="h-full w-full object-cover" /></div>
        ) : (
          <div className="h-12 w-12 rounded-md bg-muted/20 flex items-center justify-center shrink-0 text-primary">{formatIcons[item.format]}</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge className={`text-[9px] ${statusColors[item.status]}`}>{item.status}</Badge>
            <span className="text-[10px] text-muted-foreground">{item.format}</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {item.status === 'pending' && (
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} {isRu ? 'Генерировать' : 'Generate'}
            </Button>
          )}
          {item.status === 'review' && (<>
            <Button size="sm" variant="ghost" className="h-7 w-7 text-emerald-400" onClick={onApprove}><CheckCircle2 className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 text-destructive" onClick={onReject}><XCircle className="h-4 w-4" /></Button>
          </>)}
        </div>
      </CardContent>
    </Card>
  );
}

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
    const data: any = await onGenerateCopies();
    if (data?.variations) setCopyVariations(data.variations);
    setLoadingCopies(false);
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><span className="text-primary">{formatIcons[item.format]}</span> {item.title}</DialogTitle>
          <DialogDescription>{item.format} · {item.scheduled_date || '—'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {item.generated_url && (
            <div className="rounded-lg overflow-hidden bg-muted/20 relative">
              {item.format === 'video' && item.generated_url.endsWith('.mp4') ? (
                <video src={item.generated_url} controls className="w-full max-h-64" />
              ) : (
                <img src={item.generated_url} alt={item.title} className="w-full max-h-64 object-contain" />
              )}
              <a href={item.generated_url} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-1.5 rounded bg-background/80 hover:bg-background text-foreground">
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          <Badge className={`text-xs ${statusColors[item.status]}`}>{item.status}</Badge>
          {item.description && <div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{isRu ? 'Описание' : 'Description'}</p><p className="text-sm text-foreground">{item.description}</p></div>}
          {item.prompt && <div><p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{isRu ? 'Промпт' : 'Prompt'}</p><p className="text-xs text-foreground bg-muted/20 p-2 rounded-md font-mono">{item.prompt}</p></div>}
          {(item.copy_headline || item.copy_body || item.copy_cta) && (
            <div className="border border-border/50 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{isRu ? 'Рекламные тексты' : 'Ad Copy'}</p>
              {item.copy_headline && <div><span className="text-[10px] text-muted-foreground">Headline:</span> <span className="text-sm font-medium text-foreground">{item.copy_headline}</span></div>}
              {item.copy_body && <div><span className="text-[10px] text-muted-foreground">Body:</span> <span className="text-sm text-foreground">{item.copy_body}</span></div>}
              {item.copy_cta && <div><span className="text-[10px] text-muted-foreground">CTA:</span> <Badge variant="outline" className="text-xs">{item.copy_cta}</Badge></div>}
            </div>
          )}
          {copyVariations && (
            <div className="border border-border/50 rounded-lg p-3 space-y-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{isRu ? 'Вариации' : 'Variations'}</p>
              {copyVariations.map((v: any, i: number) => (
                <div key={i} className="bg-muted/10 rounded-md p-2 space-y-1">
                  <p className="text-sm font-medium text-foreground">{v.headline}</p>
                  <p className="text-xs text-foreground">{v.body}</p>
                  <Badge variant="outline" className="text-[10px]">{v.cta}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {(item.status === 'pending' || item.status === 'rejected') && (
            <Button onClick={onGenerate} disabled={isGenerating} className="gap-2 bg-gradient-to-r from-primary to-accent">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {isRu ? 'Генерировать' : 'Generate'}
            </Button>
          )}
          {item.status === 'review' && (<>
            <Button variant="outline" className="gap-2 text-emerald-400" onClick={onApprove}><CheckCircle2 className="h-4 w-4" /> {isRu ? 'Одобрить' : 'Approve'}</Button>
            <Button variant="outline" className="gap-2 text-destructive" onClick={onReject}><XCircle className="h-4 w-4" /> {isRu ? 'Отклонить' : 'Reject'}</Button>
          </>)}
          {item.generated_url && freepikConnected && item.format !== 'video' && (
            <Button variant="outline" className="gap-2" onClick={onGenerateVideo} disabled={isVideoGenerating}>
              {isVideoGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />} {isRu ? 'Видео' : 'Video'}
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handleGetCopies} disabled={loadingCopies}>
            {loadingCopies ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} {isRu ? 'Копирайт' : 'Copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
