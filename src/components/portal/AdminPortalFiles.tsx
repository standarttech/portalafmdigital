import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, FolderOpen, Eye, EyeOff, Trash2, Link2, Upload } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PortalFile {
  id: string;
  client_id: string;
  title: string;
  file_type: string;
  storage_path: string | null;
  external_url: string | null;
  description: string;
  uploaded_by: string | null;
  is_visible_in_portal: boolean;
  created_at: string;
}

const fileTypes = ['report', 'creative', 'pdf', 'spreadsheet', 'presentation', 'document', 'link'];

export default function AdminPortalFiles() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [clients, setClients] = useState<{id:string;name:string}[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  // Form
  const [fClientId, setFClientId] = useState('');
  const [fTitle, setFTitle] = useState('');
  const [fType, setFType] = useState('document');
  const [fUrl, setFUrl] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fFile, setFFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [cRes, fRes] = await Promise.all([
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('client_portal_files').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setClients(cRes.data || []);
    setFiles((fRes.data as unknown as PortalFile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clientName = (id: string) => clients.find(c => c.id === id)?.name || id.slice(0, 8);

  const handleAdd = async () => {
    if (!fClientId || !fTitle) return;
    setSaving(true);

    let storagePath: string | null = null;
    let externalUrl: string | null = fUrl || null;

    // Upload file if provided
    if (fFile) {
      const path = `${fClientId}/${Date.now()}-${fFile.name}`;
      const { error: upErr } = await supabase.storage.from('portal-files').upload(path, fFile);
      if (upErr) { toast.error('Upload failed: ' + upErr.message); setSaving(false); return; }
      storagePath = path;
      externalUrl = null;
    }

    const { error } = await supabase.from('client_portal_files' as any).insert({
      client_id: fClientId,
      title: fTitle,
      file_type: fType,
      storage_path: storagePath,
      external_url: externalUrl,
      description: fDesc,
      uploaded_by: user?.id,
      is_visible_in_portal: true,
    } as any);

    if (error) { toast.error(error.message); setSaving(false); return; }

    // Create portal notification for file shared (respects preferences via DB function)
    const { data: prefEnabled } = await supabase.rpc('portal_notification_enabled' as any, {
      _client_id: fClientId, _type: 'file_shared',
    });
    if (prefEnabled !== false) {
      await supabase.from('portal_notifications' as any).insert({
        client_id: fClientId,
        type: 'file_shared',
        title: 'New file shared',
        message: `"${fTitle}" has been shared with you.`,
      } as any);
    }

    // Audit
    await supabase.from('audit_log').insert({
      action: 'portal_file_shared', entity_type: 'client_portal_files',
      entity_id: fClientId, user_id: user?.id,
      details: { title: fTitle, file_type: fType },
    });

    toast.success('File shared with portal');
    setAddOpen(false);
    setFTitle(''); setFUrl(''); setFDesc(''); setFFile(null);
    setSaving(false);
    load();
  };

  const toggleVisibility = async (file: PortalFile) => {
    const newVal = !file.is_visible_in_portal;
    await supabase.from('client_portal_files').update({ is_visible_in_portal: newVal }).eq('id', file.id);
    await supabase.from('audit_log').insert({
      action: newVal ? 'portal_file_shared' : 'portal_file_unshared',
      entity_type: 'client_portal_files', entity_id: file.id, user_id: user?.id,
    });
    toast.success(newVal ? 'File visible in portal' : 'File hidden from portal');
    load();
  };

  const deleteFile = async (file: PortalFile) => {
    if (file.storage_path) {
      await supabase.storage.from('portal-files').remove([file.storage_path]);
    }
    await supabase.from('client_portal_files').delete().eq('id', file.id);
    await supabase.from('audit_log').insert({
      action: 'portal_file_deleted', entity_type: 'client_portal_files',
      entity_id: file.id, user_id: user?.id,
    });
    toast.success('File deleted');
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" /> Portal Files ({files.length})
        </h3>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Share File</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Share File with Client Portal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Client</Label>
                <Select value={fClientId} onValueChange={setFClientId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Monthly Report — March" className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={fType} onValueChange={setFType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{fileTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Upload file (optional)</Label>
                <Input type="file" onChange={e => setFFile(e.target.files?.[0] || null)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Or external URL</Label>
                <Input value={fUrl} onChange={e => setFUrl(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Brief description..." className="text-xs min-h-[60px]" />
              </div>
              <Button onClick={handleAdd} disabled={saving || !fClientId || !fTitle} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Share</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">No files shared yet.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 text-xs">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{f.title}</p>
                <p className="text-muted-foreground">{clientName(f.client_id)} · {f.file_type} · {new Date(f.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={`text-[8px] ${f.is_visible_in_portal ? 'text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'}`}>
                {f.is_visible_in_portal ? 'Visible' : 'Hidden'}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => toggleVisibility(f)} title={f.is_visible_in_portal ? 'Hide' : 'Show'}>
                {f.is_visible_in_portal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => deleteFile(f)} title="Delete">
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
