import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Phone, Mail, Building2, Globe, User, Calendar, Tag, Trophy, X, 
  Plus, ChevronDown, Clock, MessageSquare, Activity, Code
} from 'lucide-react';
import { format } from 'date-fns';
import type { CrmLead, CrmStage, CrmLeadNote, CrmLeadActivity } from '@/hooks/useCrmData';
import { useCrmLeadNotes, useCrmLeadActivities } from '@/hooks/useCrmData';
import { cn } from '@/lib/utils';

interface Props {
  lead: CrmLead | null;
  stages: CrmStage[];
  agencyUsers: { user_id: string; display_name: string | null }[];
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<CrmLead>) => Promise<boolean>;
  onDelete: (id: string) => void;
}

const activityTypeLabels: Record<string, string> = {
  created: '🆕 Lead created',
  stage_changed: '📦 Stage changed',
  note_added: '📝 Note added',
  assignee_changed: '👤 Assignee changed',
  won: '🏆 Marked as Won',
  lost: '❌ Marked as Lost',
  updated: '✏️ Lead updated',
  webhook_received: '🔗 Webhook received',
};

export default function CrmLeadDetailPanel({ lead, stages, agencyUsers, open, onClose, onUpdate, onDelete }: Props) {
  const { notes, addNote } = useCrmLeadNotes(lead?.id || null);
  const { activities } = useCrmLeadActivities(lead?.id || null);
  const [newNote, setNewNote] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<CrmLead>>({});
  const [wonLostReason, setWonLostReason] = useState('');
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [wonAmount, setWonAmount] = useState('');

  useEffect(() => {
    if (lead) {
      setEditData({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        priority: lead.priority,
        value: lead.value,
        assignee_id: lead.assignee_id,
      });
    }
  }, [lead]);

  if (!lead) return null;

  const displayName = lead.full_name || `${lead.first_name} ${lead.last_name}`.trim() || lead.email || 'Unnamed';
  const currentStage = stages.find(s => s.id === lead.stage_id);

  const handleSaveEdit = async () => {
    const fullName = `${editData.first_name || ''} ${editData.last_name || ''}`.trim();
    await onUpdate(lead.id, { ...editData, full_name: fullName } as any);
    setEditMode(false);
  };


  const handleMarkWon = async () => {
    await onUpdate(lead.id, {
      status: 'won',
      won_at: new Date().toISOString(),
      won_reason: wonLostReason || undefined,
      value: wonAmount ? Number(wonAmount) : lead.value,
    } as any);
    setWonLostReason('');
    setWonAmount('');
    setShowWonDialog(false);
  };

  const handleMarkLost = async () => {
    await onUpdate(lead.id, {
      status: 'lost',
      lost_at: new Date().toISOString(),
      lost_reason: wonLostReason || undefined,
    } as any);
    setWonLostReason('');
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(newNote.trim());
    setNewNote('');
  };

  const handleStageChange = async (stageId: string) => {
    await onUpdate(lead.id, { stage_id: stageId } as any);
  };

  const handleAssigneeChange = async (userId: string) => {
    await onUpdate(lead.id, { assignee_id: userId === 'unassigned' ? null : userId } as any);
  };

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-4 pb-2 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{displayName}</SheetTitle>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {currentStage && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: currentStage.color, color: currentStage.color }}>
                {currentStage.name}
              </Badge>
            )}
            <Badge variant={lead.status === 'won' ? 'default' : lead.status === 'lost' ? 'destructive' : 'secondary'} className="text-xs">
              {lead.status}
            </Badge>
            {lead.is_duplicate && <Badge variant="outline" className="text-xs text-warning border-warning">Duplicate</Badge>}
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 flex-shrink-0">
            <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs">Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <TabsContent value="details" className="p-4 space-y-4 mt-0">
              {/* Quick actions */}
              <div className="flex gap-2 flex-wrap">
                <Select value={lead.stage_id} onValueChange={handleStageChange}>
                  <SelectTrigger className="w-auto text-xs h-8">
                    <SelectValue placeholder="Move Stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={lead.assignee_id || 'unassigned'} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="w-auto text-xs h-8">
                    <SelectValue placeholder="Assign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agencyUsers.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || 'Unknown'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lead.status !== 'won' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs text-success border-success/40" onClick={() => setShowWonDialog(true)}>
                    <Trophy className="h-3 w-3 mr-1" />Won
                  </Button>
                )}
                {lead.status !== 'lost' && (
                  <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/40" onClick={handleMarkLost}>
                    <X className="h-3 w-3 mr-1" />Lost
                  </Button>
                )}
              </div>

              {/* Won dialog */}
              {showWonDialog && (
                <div className="space-y-2 p-3 rounded-lg border border-success/30 bg-success/5">
                  <p className="text-xs font-medium text-success">Mark as Won</p>
                  <Input
                    type="number"
                    placeholder="Sale amount ($)"
                    value={wonAmount}
                    onChange={e => setWonAmount(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Input
                    placeholder="Won reason (optional)"
                    value={wonLostReason}
                    onChange={e => setWonLostReason(e.target.value)}
                    className="text-xs h-8"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="text-xs h-7 bg-success hover:bg-success/90" onClick={handleMarkWon}>Confirm Won</Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowWonDialog(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Lost reason */}
              {(lead.status === 'open' && !showWonDialog) && (
                <Input
                  placeholder="Lost reason (optional)"
                  value={wonLostReason}
                  onChange={e => setWonLostReason(e.target.value)}
                  className="text-xs h-8"
                />
              )}

              {/* Contact info */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="First name" value={editData.first_name || ''} onChange={e => setEditData(d => ({...d, first_name: e.target.value}))} className="text-xs h-8" />
                    <Input placeholder="Last name" value={editData.last_name || ''} onChange={e => setEditData(d => ({...d, last_name: e.target.value}))} className="text-xs h-8" />
                    <Input placeholder="Email" value={editData.email || ''} onChange={e => setEditData(d => ({...d, email: e.target.value}))} className="text-xs h-8" />
                    <Input placeholder="Phone" value={editData.phone || ''} onChange={e => setEditData(d => ({...d, phone: e.target.value}))} className="text-xs h-8" />
                    <Input placeholder="Company" value={editData.company || ''} onChange={e => setEditData(d => ({...d, company: e.target.value}))} className="text-xs h-8" />
                    <Input placeholder="Source" value={editData.source || ''} onChange={e => setEditData(d => ({...d, source: e.target.value}))} className="text-xs h-8" />
                    <Input type="number" placeholder="Value" value={editData.value || ''} onChange={e => setEditData(d => ({...d, value: Number(e.target.value)}))} className="text-xs h-8" />
                    <Select value={editData.priority || 'medium'} onValueChange={v => setEditData(d => ({...d, priority: v}))}>
                      <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="col-span-2 flex gap-2">
                      <Button size="sm" className="text-xs h-7" onClick={handleSaveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setEditMode(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={lead.email} />
                    <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={lead.phone} />
                    <DetailRow icon={<Building2 className="h-3.5 w-3.5" />} label="Company" value={lead.company} />
                    <DetailRow icon={<Globe className="h-3.5 w-3.5" />} label="Source" value={lead.source} />
                    <DetailRow icon={<User className="h-3.5 w-3.5" />} label="Priority" value={lead.priority} />
                    {lead.value > 0 && <DetailRow icon={<Trophy className="h-3.5 w-3.5" />} label="Value" value={`$${lead.value.toLocaleString()}`} />}
                    <Button size="sm" variant="ghost" className="text-xs h-7 mt-1" onClick={() => setEditMode(true)}>Edit Contact Info</Button>
                  </div>
                )}
              </div>

              {/* Tags */}
              {lead.tags?.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {lead.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* UTM / Campaign */}
              {(lead.utm_source || lead.campaign_name || lead.landing_page) && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <ChevronDown className="h-3 w-3" />Campaign & UTM Data
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1">
                    {lead.utm_source && <DetailRow icon={<Tag className="h-3 w-3" />} label="UTM Source" value={lead.utm_source} />}
                    {lead.utm_medium && <DetailRow icon={<Tag className="h-3 w-3" />} label="UTM Medium" value={lead.utm_medium} />}
                    {lead.utm_campaign && <DetailRow icon={<Tag className="h-3 w-3" />} label="UTM Campaign" value={lead.utm_campaign} />}
                    {lead.campaign_name && <DetailRow icon={<Tag className="h-3 w-3" />} label="Campaign" value={lead.campaign_name} />}
                    {lead.adset_name && <DetailRow icon={<Tag className="h-3 w-3" />} label="Adset" value={lead.adset_name} />}
                    {lead.ad_name && <DetailRow icon={<Tag className="h-3 w-3" />} label="Ad" value={lead.ad_name} />}
                    {lead.form_name && <DetailRow icon={<Tag className="h-3 w-3" />} label="Form" value={lead.form_name} />}
                    {lead.landing_page && <DetailRow icon={<Globe className="h-3 w-3" />} label="Landing Page" value={lead.landing_page} />}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Won/Lost info */}
              {(lead.won_at || lead.lost_at) && (
                <div className="space-y-1 p-2 rounded-lg bg-muted/30 border border-border/30">
                  {lead.won_at && <p className="text-xs text-success">🏆 Won on {format(new Date(lead.won_at), 'dd MMM yyyy HH:mm')}</p>}
                  {lead.won_reason && <p className="text-xs text-muted-foreground">Reason: {lead.won_reason}</p>}
                  {lead.lost_at && <p className="text-xs text-destructive">❌ Lost on {format(new Date(lead.lost_at), 'dd MMM yyyy HH:mm')}</p>}
                  {lead.lost_reason && <p className="text-xs text-muted-foreground">Reason: {lead.lost_reason}</p>}
                </div>
              )}

              {/* Raw Payload */}
              {lead.raw_payload && (
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Code className="h-3 w-3" /><ChevronDown className="h-3 w-3" />Raw Webhook Payload
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <pre className="text-[10px] bg-muted/50 p-2 rounded-md overflow-x-auto max-h-40">
                      {JSON.stringify(lead.raw_payload, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Timestamps */}
              <div className="space-y-1 pt-2 border-t border-border/30">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />Created: {format(new Date(lead.created_at), 'dd MMM yyyy HH:mm')}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />Updated: {format(new Date(lead.updated_at), 'dd MMM yyyy HH:mm')}
                </div>
              </div>

              {/* Delete */}
              <Button size="sm" variant="destructive" className="text-xs w-full mt-4" onClick={() => { onDelete(lead.id); onClose(); }}>
                Delete Lead
              </Button>
            </TabsContent>

            <TabsContent value="notes" className="p-4 space-y-3 mt-0">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="text-xs min-h-[60px]"
                  maxLength={1000}
                />
              </div>
              <Button size="sm" className="text-xs" onClick={handleAddNote} disabled={!newNote.trim()}>
                <Plus className="h-3 w-3 mr-1" />Add Note
              </Button>
              <div className="space-y-2 mt-4">
                {notes.map(note => (
                  <div key={note.id} className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-xs text-foreground whitespace-pre-wrap">{note.note}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(note.created_at), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="p-4 mt-0">
              <div className="space-y-2">
                {activities.map(act => (
                  <div key={act.id} className="flex items-start gap-2 text-xs">
                    <Activity className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground">{activityTypeLabels[act.type] || act.type}</span>
                      {act.payload?.message && <span className="text-muted-foreground ml-1">— {act.payload.message}</span>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(act.created_at), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground flex-shrink-0">{icon}</span>
      <span className="text-muted-foreground min-w-[60px]">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}
