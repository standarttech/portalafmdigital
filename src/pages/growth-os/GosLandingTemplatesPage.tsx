import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileCode2, Eye, Copy, Trash2, Loader2, GripVertical, Settings2, X, ChevronUp, ChevronDown, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import type { TranslationKey } from '@/i18n/translations';

interface Section {
  type: string;
  config: Record<string, any>;
}

const sectionTypes = [
  { value: 'hero', label: 'Hero Section', defaults: { headline: '', subheadline: '', cta: 'Get Started', bg_image: '' } },
  { value: 'features', label: 'Features', defaults: { items: [{ title: '', description: '', icon: '' }] } },
  { value: 'testimonials', label: 'Testimonials', defaults: { items: [{ name: '', text: '', avatar: '' }] } },
  { value: 'pricing', label: 'Pricing', defaults: { plans: [{ name: 'Basic', price: '', features: [] }] } },
  { value: 'faq', label: 'FAQ', defaults: { items: [{ question: '', answer: '' }] } },
  { value: 'cta', label: 'CTA Block', defaults: { text: '', button: 'Contact Us', url: '' } },
  { value: 'form', label: 'Form Embed', defaults: { form_id: '', title: '' } },
  { value: 'custom_html', label: 'Custom HTML', defaults: { html: '' } },
];

export default function GosLandingTemplatesPage() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('gos_landing_templates').select('*').order('updated_at', { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };

  const createTemplate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('gos_landing_templates').insert({
      name: 'New Template',
      created_by: user.id,
      sections: [
        { type: 'hero', config: { headline: 'Your Headline', subheadline: 'Your subheadline', cta: 'Get Started' } },
        { type: 'features', config: { items: [] } },
        { type: 'cta', config: { text: 'Ready to grow?', button: 'Contact Us' } },
      ],
    }).select().single();
    if (error) { toast.error('Failed to create template'); return; }
    setEditing(data);
    loadTemplates();
  };

  const saveTemplate = async () => {
    if (!editing) return;
    const { error } = await supabase.from('gos_landing_templates').update({
      name: editing.name,
      description: editing.description,
      sections: editing.sections,
      settings: editing.settings,
      status: editing.status,
    }).eq('id', editing.id);
    if (error) toast.error('Save failed');
    else { toast.success('Template saved'); loadTemplates(); }
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from('gos_landing_templates').delete().eq('id', id);
    toast.success('Template deleted');
    loadTemplates();
  };

  const duplicateTemplate = async (tpl: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('gos_landing_templates').insert({
      name: `${tpl.name} (copy)`,
      created_by: user.id,
      sections: tpl.sections,
      settings: tpl.settings,
      description: tpl.description,
    });
    toast.success('Template duplicated');
    loadTemplates();
  };

  const updateSection = (idx: number, config: Record<string, any>) => {
    if (!editing) return;
    const sections = [...(editing.sections || [])];
    sections[idx] = { ...sections[idx], config };
    setEditing({ ...editing, sections });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    if (!editing) return;
    const sections = [...(editing.sections || [])];
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[idx], sections[target]] = [sections[target], sections[idx]];
    setEditing({ ...editing, sections });
  };

  const removeSection = (idx: number) => {
    if (!editing) return;
    const sections = (editing.sections || []).filter((_: any, i: number) => i !== idx);
    setEditing({ ...editing, sections });
  };

  const addSection = (type: string) => {
    if (!editing) return;
    const def = sectionTypes.find(s => s.value === type);
    const sections = [...(editing.sections || []), { type, config: def?.defaults || {} }];
    setEditing({ ...editing, sections });
  };

  const generatePreview = () => {
    if (!editing) return;
    const sections = (editing.sections || []) as Section[];
    const html = sections.map(s => {
      switch (s.type) {
        case 'hero': return `<section style="padding:60px 20px;text-align:center;background:#111"><h1 style="font-size:2.5em;color:#fff">${s.config.headline || ''}</h1><p style="color:#aaa;font-size:1.2em">${s.config.subheadline || ''}</p><a href="#" style="display:inline-block;margin-top:20px;padding:12px 32px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none">${s.config.cta || 'CTA'}</a></section>`;
        case 'features': return `<section style="padding:40px 20px;background:#1a1a1a"><h2 style="text-align:center;color:#fff;margin-bottom:30px">Features</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;max-width:800px;margin:auto">${((s.config.items || []) as any[]).map((f: any) => `<div style="padding:20px;background:#222;border-radius:12px"><h3 style="color:#fff;font-size:1em">${f.title || ''}</h3><p style="color:#888;font-size:0.9em">${f.description || ''}</p></div>`).join('')}</div></section>`;
        case 'cta': return `<section style="padding:50px 20px;text-align:center;background:#0d9488"><h2 style="color:#fff;font-size:1.8em">${s.config.text || ''}</h2><a href="${s.config.url || '#'}" style="display:inline-block;margin-top:16px;padding:12px 32px;background:#fff;color:#0d9488;border-radius:8px;text-decoration:none;font-weight:bold">${s.config.button || 'CTA'}</a></section>`;
        case 'faq': return `<section style="padding:40px 20px;background:#1a1a1a;max-width:700px;margin:auto"><h2 style="color:#fff;text-align:center;margin-bottom:20px">FAQ</h2>${((s.config.items || []) as any[]).map((f: any) => `<details style="margin-bottom:12px;padding:12px;background:#222;border-radius:8px;color:#fff"><summary style="cursor:pointer;font-weight:bold">${f.question || ''}</summary><p style="color:#aaa;margin-top:8px">${f.answer || ''}</p></details>`).join('')}</section>`;
        default: return `<section style="padding:30px 20px;text-align:center;color:#888">[${s.type}]</section>`;
      }
    }).join('');
    setPreviewHtml(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#111}</style></head><body>${html}</body></html>`);
    setPreviewOpen(true);
  };

  const statusColor: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    archived: 'bg-destructive/10 text-destructive',
  };

  // Editor dialog
  const renderEditor = () => {
    if (!editing) return null;
    const sections = (editing.sections || []) as Section[];

    return (
      <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCode2 className="h-5 w-5 text-primary" /> Edit Template
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="settings" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="sections">Sections ({sections.length})</TabsTrigger>
              <TabsTrigger value="code">Embed Code</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="flex-1 overflow-auto space-y-4 p-1">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <Input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={editing.status || 'draft'} onValueChange={v => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sections" className="flex-1 overflow-auto space-y-3 p-1">
              {sections.map((section, idx) => (
                <Card key={idx} className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px]">{section.type}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(idx, -1)} disabled={idx === 0}><ChevronUp className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(idx, 1)} disabled={idx === sections.length - 1}><ChevronDown className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSection(idx)}><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                    <SectionConfigEditor type={section.type} config={section.config} onChange={cfg => updateSection(idx, cfg)} />
                  </CardContent>
                </Card>
              ))}
              <div className="flex items-center gap-2">
                <Select onValueChange={addSection}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Add section..." /></SelectTrigger>
                  <SelectContent>
                    {sectionTypes.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 overflow-auto p-1">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs text-muted-foreground mb-2">Embed this template on any page:</p>
                <code className="text-xs text-foreground break-all block bg-background p-3 rounded border border-border">
                  {`<iframe src="${window.location.origin}/embed/landing/${editing.id}" width="100%" height="100%" frameborder="0"></iframe>`}
                </code>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generatePreview} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            <Button size="sm" onClick={saveTemplate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('gos.landingTemplates' as TranslationKey)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('gos.landingTemplatesDesc' as TranslationKey)}</p>
        </div>
        <Button size="sm" onClick={createTemplate} className="gap-1.5">
          <Plus className="h-4 w-4" /> {t('common.create')}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileCode2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{t('common.noData')}</p>
            <Button size="sm" variant="outline" onClick={createTemplate} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t('common.create')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(tpl => (
            <Card key={tpl.id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-foreground text-sm truncate flex-1">{tpl.name}</h3>
                  <Badge className={`text-[10px] ${statusColor[tpl.status] || statusColor.draft}`}>{tpl.status}</Badge>
                </div>
                {tpl.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{tpl.description}</p>}
                <p className="text-xs text-muted-foreground mb-3">{(tpl.sections || []).length} sections</p>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(tpl)}><Settings2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateTemplate(tpl)}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteTemplate(tpl.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {renderEditor()}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
          <iframe srcDoc={previewHtml} className="w-full h-full border-0" title="Preview" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionConfigEditor({ type, config, onChange }: { type: string; config: Record<string, any>; onChange: (c: Record<string, any>) => void }) {
  const update = (key: string, value: any) => onChange({ ...config, [key]: value });

  switch (type) {
    case 'hero':
      return (
        <div className="space-y-2">
          <Input placeholder="Headline" value={config.headline || ''} onChange={e => update('headline', e.target.value)} className="text-sm" />
          <Input placeholder="Subheadline" value={config.subheadline || ''} onChange={e => update('subheadline', e.target.value)} className="text-sm" />
          <Input placeholder="CTA button text" value={config.cta || ''} onChange={e => update('cta', e.target.value)} className="text-sm" />
          <Input placeholder="Background image URL" value={config.bg_image || ''} onChange={e => update('bg_image', e.target.value)} className="text-sm" />
        </div>
      );
    case 'cta':
      return (
        <div className="space-y-2">
          <Input placeholder="CTA text" value={config.text || ''} onChange={e => update('text', e.target.value)} className="text-sm" />
          <Input placeholder="Button text" value={config.button || ''} onChange={e => update('button', e.target.value)} className="text-sm" />
          <Input placeholder="Link URL" value={config.url || ''} onChange={e => update('url', e.target.value)} className="text-sm" />
        </div>
      );
    case 'features':
      return <ArrayItemsEditor items={config.items || []} fields={['title', 'description']} onChange={items => update('items', items)} />;
    case 'testimonials':
      return <ArrayItemsEditor items={config.items || []} fields={['name', 'text']} onChange={items => update('items', items)} />;
    case 'faq':
      return <ArrayItemsEditor items={config.items || []} fields={['question', 'answer']} onChange={items => update('items', items)} />;
    case 'pricing':
      return <ArrayItemsEditor items={config.plans || []} fields={['name', 'price']} onChange={items => update('plans', items)} />;
    case 'form':
      return <Input placeholder="Form ID" value={config.form_id || ''} onChange={e => update('form_id', e.target.value)} className="text-sm" />;
    case 'custom_html':
      return <Textarea placeholder="<div>Your HTML</div>" value={config.html || ''} onChange={e => update('html', e.target.value)} rows={4} className="font-mono text-xs" />;
    default:
      return <p className="text-xs text-muted-foreground">No editor for this section type</p>;
  }
}

function ArrayItemsEditor({ items, fields, onChange }: { items: any[]; fields: string[]; onChange: (items: any[]) => void }) {
  const addItem = () => {
    const empty: Record<string, string> = {};
    fields.forEach(f => empty[f] = '');
    onChange([...items, empty]);
  };
  const updateItem = (idx: number, field: string, value: string) => {
    const updated = items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    onChange(updated);
  };
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <div className="flex-1 space-y-1">
            {fields.map(f => (
              <Input key={f} placeholder={f} value={item[f] || ''} onChange={e => updateItem(idx, f, e.target.value)} className="text-xs h-8" />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0 mt-1" onClick={() => removeItem(idx)}><X className="h-3 w-3" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Add</Button>
    </div>
  );
}
