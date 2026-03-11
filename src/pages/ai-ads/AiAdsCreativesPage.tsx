import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  ImageIcon, Plus, Loader2, Search, Video, Link2, FileText, Trash2, Eye, Tag, Upload, AlertTriangle, FileStack,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGosAuditLog } from '@/hooks/useGosAuditLog';
import { toast } from 'sonner';
import type { CreativeAsset } from '@/types/ai-ads';
import PlatformIntegrationsPanel from '@/components/integrations/PlatformIntegrationsPanel';

interface Client { id: string; name: string; }

const typeIcons: Record<string, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4 text-emerald-400" />,
  video: <Video className="h-4 w-4 text-blue-400" />,
  external_url: <Link2 className="h-4 w-4 text-cyan-400" />,
  text_only_reference: <FileText className="h-4 w-4 text-muted-foreground" />,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'];

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
  const [detailAsset, setDetailAsset] = useState<CreativeAsset | null>(null);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const isAdmin = agencyRole === 'AgencyAdmin';

  const load = useCallback(async () => {
    const [aRes, cRes] = await Promise.all([
      supabase.from('creative_assets' as any).select('*').neq('status', 'deleted').order('created_at', { ascending: false }).limit(500),
      supabase.from('clients').select('id, name').order('name'),
    ]);
    const loadedAssets = ((aRes.data as unknown as CreativeAsset[]) || []);
    setAssets(loadedAssets);
    setClients(cRes.data || []);

    // Load usage counts
    if (loadedAssets.length > 0) {
      const { data: items } = await supabase.from('campaign_draft_items' as any)
        .select('creative_asset_id').not('creative_asset_id', 'is', null);
      const counts: Record<string, number> = {};
      (items || []).forEach((i: any) => { counts[i.creative_asset_id] = (counts[i.creative_asset_id] || 0) + 1; });
      setUsageCounts(counts);
    }
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

  const archiveAsset = async (asset: CreativeAsset) => {
    const count = usageCounts[asset.id] || 0;
    if (count > 0 && !window.confirm(`This asset is used in ${count} draft item(s). Archive anyway?`)) return;
    const { error } = await supabase.from('creative_assets' as any).update({ status: 'archived' }).eq('id', asset.id);
    if (error) { toast.error('Archive failed'); return; }
    logGosAction('archive', 'creative_asset', asset.id, asset.name);
    toast.success('Asset archived');
    load();
  };

  const activeAssets = filtered.filter(a => a.status === 'active');
  const archivedAssets = filtered.filter(a => a.status === 'archived');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-cyan-400" /> Creative Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage creative assets for campaign drafts. Upload files or reference external URLs.</p>
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
          <p className="text-sm text-muted-foreground">Upload images, videos, or add URL references for your campaign ads.</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAssets.map(a => (
              <AssetCard key={a.id} asset={a} clientName={clientName(a.client_id)} usage={usageCounts[a.id] || 0}
                isAdmin={isAdmin} onArchive={() => archiveAsset(a)} onDetail={() => setDetailAsset(a)} />
            ))}
          </div>
          {archivedAssets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Archived ({archivedAssets.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
                {archivedAssets.map(a => (
                  <AssetCard key={a.id} asset={a} clientName={clientName(a.client_id)} usage={usageCounts[a.id] || 0}
                    isAdmin={isAdmin} onArchive={() => {}} onDetail={() => setDetailAsset(a)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <CreateAssetDialog open={createOpen} onOpenChange={setCreateOpen} clients={clients}
        userId={user?.id || ''} onCreated={() => { load(); setCreateOpen(false); }} />

      {detailAsset && (
        <AssetDetailDialog asset={detailAsset} clientName={clientName(detailAsset.client_id)}
          usage={usageCounts[detailAsset.id] || 0} onClose={() => setDetailAsset(null)} />
      )}
    </div>
  );
}

function AssetCard({ asset: a, clientName, usage, isAdmin, onArchive, onDetail }: {
  asset: CreativeAsset; clientName: string; usage: number; isAdmin: boolean;
  onArchive: () => void; onDetail: () => void;
}) {
  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 cursor-pointer" onClick={onDetail}>
            {a.url && a.asset_type === 'image' ? (
              <img src={a.url} alt={a.name} className="h-12 w-12 rounded-lg object-cover" />
            ) : typeIcons[a.asset_type] || <ImageIcon className="h-5 w-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onDetail}>
            <p className="font-semibold text-sm text-foreground truncate">{a.name || 'Untitled'}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-[9px]">{a.asset_type.replace(/_/g, ' ')}</Badge>
              {a.status === 'archived' && <Badge variant="outline" className="text-[9px] text-muted-foreground">archived</Badge>}
              {usage > 0 && <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-400/30">{usage} draft{usage !== 1 ? 's' : ''}</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{clientName}</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {a.url && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(a.url!, '_blank')}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
            )}
            {isAdmin && a.status === 'active' && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onArchive}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetDetailDialog({ asset: a, clientName, usage, onClose }: {
  asset: CreativeAsset; clientName: string; usage: number; onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{typeIcons[a.asset_type]} {a.name}</DialogTitle>
          <DialogDescription>Creative asset details and usage</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {a.url && a.asset_type === 'image' && (
            <div className="rounded-lg overflow-hidden bg-muted/20">
              <img src={a.url} alt={a.name} className="w-full max-h-48 object-contain" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground">{a.asset_type.replace(/_/g, ' ')}</span></div>
            <div><span className="text-muted-foreground">Status:</span> <span className="text-foreground">{a.status}</span></div>
            <div><span className="text-muted-foreground">Client:</span> <span className="text-foreground">{clientName}</span></div>
            <div><span className="text-muted-foreground">Used in:</span> <span className="text-foreground">{usage} draft item{usage !== 1 ? 's' : ''}</span></div>
            {a.mime_type && <div><span className="text-muted-foreground">MIME:</span> <span className="text-foreground">{a.mime_type}</span></div>}
            {a.file_size_bytes && <div><span className="text-muted-foreground">Size:</span> <span className="text-foreground">{(a.file_size_bytes / 1024).toFixed(0)} KB</span></div>}
          </div>
          {a.url && (
            <div className="text-xs">
              <span className="text-muted-foreground">URL:</span>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline ml-1 break-all">{a.url}</a>
            </div>
          )}
          {a.notes && <div className="text-xs"><span className="text-muted-foreground">Notes:</span> <span className="text-foreground">{a.notes}</span></div>}
          {(a.tags || []).length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {a.tags.map(t => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
            </div>
          )}
          {a.file_path && !a.url?.startsWith('http') && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              Internal asset — not uploaded to Meta. Use the URL in ad platform manually or via future automation.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateAssetDialog({ open, onOpenChange, clients, userId, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; clients: Client[];
  userId: string; onCreated: () => void;
}) {
  const { logGosAction } = useGosAuditLog();
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState('');
  const [assetType, setAssetType] = useState<string>('image');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedPath, setUploadedPath] = useState('');
  const [uploadedMime, setUploadedMime] = useState('');
  const [uploadedSize, setUploadedSize] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, or MOV.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum 10MB.');
      return;
    }
    if (!clientId) {
      toast.error('Select a client before uploading');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${clientId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('creative-assets').upload(path, file, { contentType: file.type });
    if (error) { toast.error('Upload failed: ' + error.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('creative-assets').getPublicUrl(path);
    setUploadedUrl(urlData.publicUrl);
    setUploadedPath(path);
    setUploadedMime(file.type);
    setUploadedSize(file.size);
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''));
    if (file.type.startsWith('video/')) setAssetType('video');
    else setAssetType('image');
    setUploading(false);
    toast.success('File uploaded');
  };

  const handleCreate = async () => {
    if (!clientId || !name.trim()) { toast.error('Client and name required'); return; }
    setSaving(true);
    try {
      const finalUrl = uploadedUrl || url.trim() || null;
      const payload: Record<string, unknown> = {
        client_id: clientId, name: name.trim(), asset_type: assetType,
        url: finalUrl, notes: notes.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        created_by: userId,
      };
      if (uploadedPath) {
        payload.file_path = uploadedPath;
        payload.mime_type = uploadedMime;
        payload.file_size_bytes = uploadedSize;
      }
      const { data, error } = await supabase.from('creative_assets' as any).insert(payload).select().single();
      if (error) throw error;
      logGosAction('create', 'creative_asset', (data as any).id, name.trim(), { clientId });
      toast.success('Creative asset added');
      onCreated();
      resetForm();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const resetForm = () => {
    setName(''); setClientId(''); setUrl(''); setNotes(''); setTags('');
    setUploadedUrl(''); setUploadedPath(''); setUploadedMime(''); setUploadedSize(0);
    setAssetType('image');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Creative Asset</DialogTitle>
        <DialogDescription>Upload a file or add a URL reference for campaign ads.</DialogDescription></DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
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

          {/* File Upload */}
          {(assetType === 'image' || assetType === 'video') && (
            <div className="space-y-2">
              <Label>Upload File</Label>
              <div className="border border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                {uploadedUrl ? (
                  <div className="space-y-2">
                    {assetType === 'image' && <img src={uploadedUrl} alt="Preview" className="max-h-24 mx-auto rounded" />}
                    <p className="text-xs text-emerald-400">✓ Uploaded ({(uploadedSize / 1024).toFixed(0)} KB)</p>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setUploadedUrl(''); setUploadedPath(''); }}>Replace</Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground mb-2">JPEG, PNG, WebP, GIF, MP4, MOV — max 10MB</p>
                    <Button variant="outline" size="sm" disabled={uploading || !clientId} onClick={() => fileRef.current?.click()}>
                      {uploading ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Uploading...</> : 'Choose File'}
                    </Button>
                    <input ref={fileRef} type="file" className="hidden" accept="image/*,video/mp4,video/quicktime" onChange={handleFileUpload} />
                  </>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Or enter a URL below if the file is hosted externally.</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hero banner v2" />
          </div>
          {!uploadedUrl && (
            <div className="space-y-2">
              <Label>URL / Link</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
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
