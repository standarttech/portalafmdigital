import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Download, ExternalLink, Search, File, Image, Presentation, Table2, Link2, FolderOpen } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOutletContext } from 'react-router-dom';
import type { PortalUser, PortalBranding } from '@/types/portal';

interface Ctx { portalUser: PortalUser | null; branding: PortalBranding | null; isAdmin: boolean; }

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
  updated_at: string;
}

const typeIcons: Record<string, typeof FileText> = {
  report: FileText,
  creative: Image,
  pdf: FileText,
  spreadsheet: Table2,
  presentation: Presentation,
  document: File,
  link: Link2,
};

const typeLabels: Record<string, string> = {
  report: 'Report',
  creative: 'Creative',
  pdf: 'PDF',
  spreadsheet: 'Spreadsheet',
  presentation: 'Presentation',
  document: 'Document',
  link: 'Link',
};

export default function PortalFilesPage() {
  const { portalUser, isAdmin } = useOutletContext<Ctx>();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<PortalFile[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const load = useCallback(async () => {
    const clientId = portalUser?.client_id;
    if (!clientId && !isAdmin) { setLoading(false); return; }

    const q = clientId
      ? supabase.from('client_portal_files').select('*').eq('client_id', clientId).eq('is_visible_in_portal', true)
      : supabase.from('client_portal_files').select('*').eq('is_visible_in_portal', true);

    const { data } = await q.order('created_at', { ascending: false }).limit(200);
    setFiles((data as any as PortalFile[]) || []);
    setLoading(false);
  }, [portalUser, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async (file: PortalFile) => {
    if (file.external_url) {
      window.open(file.external_url, '_blank', 'noopener');
      return;
    }
    if (file.storage_path) {
      const { data } = await supabase.storage.from('portal-files').createSignedUrl(file.storage_path, 300);
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener');
      }
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const query = search.toLowerCase();
  const filtered = files.filter(f => {
    if (typeFilter !== 'all' && f.file_type !== typeFilter) return false;
    if (query && !f.title.toLowerCase().includes(query) && !f.description?.toLowerCase().includes(query)) return false;
    return true;
  });

  const types = Array.from(new Set(files.map(f => f.file_type)));

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" /> Shared Files
        </h1>
        <p className="text-sm text-muted-foreground">Documents, reports and resources shared with you</p>
      </div>

      {files.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..." className="pl-9 h-8 text-xs" />
          </div>
          <div className="flex gap-1 flex-wrap">
            <Button size="sm" variant={typeFilter === 'all' ? 'default' : 'outline'} onClick={() => setTypeFilter('all')} className="text-xs h-8">All</Button>
            {types.map(t => (
              <Button key={t} size="sm" variant={typeFilter === t ? 'default' : 'outline'} onClick={() => setTypeFilter(t)} className="text-xs h-8">
                {typeLabels[t] || t}
              </Button>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {files.length === 0
              ? 'No files have been shared yet. Your team will share documents and reports here.'
              : 'No files match your search.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(file => {
            const Icon = typeIcons[file.file_type] || File;
            return (
              <Card key={file.id} className="hover:bg-muted/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[9px]">{typeLabels[file.file_type] || file.file_type}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                      {file.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{file.description}</p>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleOpen(file)} className="gap-1.5 shrink-0 text-xs">
                      {file.external_url ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                      {file.external_url ? 'Open' : 'Download'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
