import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { CrmStage } from '@/hooks/useCrmData';

interface Props {
  open: boolean;
  onClose: () => void;
  stages: CrmStage[];
  onCreate: (data: any) => Promise<any>;
}

export default function CrmCreateLeadDialog({ open, onClose, stages, onCreate }: Props) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', company: '',
    source: '', stage_id: stages[0]?.id || '', value: 0, priority: 'medium',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.first_name.trim() && !form.email.trim()) return;
    setSaving(true);
    const fullName = `${form.first_name} ${form.last_name}`.trim();
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    await onCreate({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      full_name: fullName,
      email: form.email.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      source: form.source.trim(),
      stage_id: form.stage_id || stages[0]?.id,
      value: form.value,
      priority: form.priority,
      tags,
    });
    setSaving(false);
    setForm({ first_name: '', last_name: '', email: '', phone: '', company: '', source: '', stage_id: stages[0]?.id || '', value: 0, priority: 'medium', tags: '' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-xs">First Name *</Label>
            <Input value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} className="text-sm h-9" />
          </div>
          <div>
            <Label className="text-xs">Last Name</Label>
            <Input value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} className="text-sm h-9" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="text-sm h-9" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="text-sm h-9" />
          </div>
          <div>
            <Label className="text-xs">Company</Label>
            <Input value={form.company} onChange={e => setForm(f => ({...f, company: e.target.value}))} className="text-sm h-9" />
          </div>
          <div>
            <Label className="text-xs">Source</Label>
            <Input placeholder="e.g. Meta, Website" value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))} className="text-sm h-9" />
          </div>
          <div>
            <Label className="text-xs">Stage</Label>
            <Select value={form.stage_id} onValueChange={v => setForm(f => ({...f, stage_id: v}))}>
              <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Value ($)</Label>
            <Input type="number" value={form.value || ''} onChange={e => setForm(f => ({...f, value: Number(e.target.value)}))} className="text-sm h-9" />
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm(f => ({...f, priority: v}))}>
              <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tags (comma-separated)</Label>
            <Input placeholder="hot, vip" value={form.tags} onChange={e => setForm(f => ({...f, tags: e.target.value}))} className="text-sm h-9" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || (!form.first_name.trim() && !form.email.trim())}>
            {saving ? 'Creating...' : 'Create Lead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
