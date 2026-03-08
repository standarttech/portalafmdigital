import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  ImageIcon, Plus, Loader2, Search, Video, Link2, FileText, Trash2, Eye, Tag,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';

interface CreativeAsset {
  id: string; client_id: string; name: string; asset_type: string;
  url: string | null; file_path: string | null; mime_type: string | null;
  file_size_bytes: number | null; status: string; notes: string;
  tags: string[]; created_by: string; created_at: string; updated_at: string;
}
interface Client { id: string; name: string; }

const typeIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4 text-emerald-400" />,
  video: <Video className="h-4 w-4 text-blue-400" />,
  external_url: <Link2 className="h-4 w-4 text-cyan-400" />,
  text_only_reference: <FileText className="h-4 w-4 text-muted-foreground" />,
};

export default function AiAdsCreativesPage() {
  const { user, agencyRole } = useAuth();
  const { logGosAction } = useGosAuditLog();
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const isAdmin = agencyRole === 'AgencyAdmin';

  const load = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([
      supabase.from('creative_assets' as any).select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(500),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    setAssets((aRes.data as any[]) || []);
    setClients(cRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  const filtered = assets.filter(a => {
    if (filterClient !== 'all' && a.client_id !== filterClient) return false;
    if (filterType !== 'all' && a.asset_type !== filterType) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!a.name.toLowerCase().includes(s) && !a.notes.toLowerCase().includes(s) &&
          !(a.tags || []).some(t => t.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const archiveAsset = async (id: string) => {
    const { error } = await supabase.from('creative_assets' as any).update({ status: 'archived' }).eq('id', id);
    if (error) { toast.error('Archive failed'); return; }
    logGosAction('archive', 'creative_asset', id, 'Archived creative asset');
    toast.success('Asset archived');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-cyan-400" /> Creative Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage creative assets for campaign drafts</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="external_url">External URL</SelectItem>
            <SelectItem value="text_only_reference">Text Ref</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-xs text-muted-foreground">{filtered.length} assets</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Creative Assets</h3>
          <p className="text-sm text-muted-foreground">Add images, videos, or URL references for your campaign ads.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(a => (
            <Card key={a.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                    {a.url && a.asset_type === 'image' ? (
                      <img src={a.url} alt={a.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : typeIcons[a.asset_type] || <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{a.name || 'Untitled'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[9px]">{a.asset_type.replace(/_/g, ' ')}</Badge>
                      {a.mime_type && <span className="text-[9px] text-muted-foreground">{a.mime_type}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{clientName(a.client_id)}</p>
                    {(a.tags || []).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {a.tags.map(t => <Badge key={t} variant="outline" className="text-[8px] h-4">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {a.url && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(a.url!, '_blank')}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => archiveAsset(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAssetDialog open={createOpen} onOpenChange={setCreateOpen} clients={clients}
        userId={user?.id || ''} onCreated={() => { load(); setCreateOpen(false); }} />
    </div>
  );
}

function CreateAssetDialog({ open, onOpenChange, clients, userId, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; clients: Client[];
  userId: string; onCreated: () => void;
}) {
  const { logGosAction } = useGosAuditLog();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [assetType, setAssetType] = useState('image');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!clientId || !name.trim()) { toast.error('Client and name required'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.from('creative_assets' as any).insert({
        client_id: clientId, name: name.trim(), asset_type: assetType,
        url: url.trim() || null, notes: notes.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        created_by: userId,
      }).select().single();
      if (error) throw error;
      logGosAction('create', 'creative_asset', (data as any).id, name.trim(), { clientId });
      toast.success('Creative asset added');
      onCreated();
      setName(''); setClientId(''); setUrl(''); setNotes(''); setTags('');
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Creative Asset</DialogTitle>
        <DialogDescription>Register an image, video, or URL reference for campaign ads.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="external_url">External URL</SelectItem>
                  <SelectItem value="text_only_reference">Text Reference</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hero banner v2" />
          </div>
          <div className="space-y-2">
            <Label>URL / Link</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. hero, banner, v2" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Creative notes, hook, angle..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !clientId || !name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Add Asset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
