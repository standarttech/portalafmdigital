import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import type { CrmStage } from '@/hooks/useCrmData';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  stages: CrmStage[];
  onCreateStage: (name: string, color: string) => Promise<void>;
  onUpdateStage: (id: string, updates: Partial<CrmStage>) => Promise<void>;
  onDeleteStage: (id: string) => Promise<void>;
}

const COLORS = ['#6366f1', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function CrmPipelineSettings({ open, onClose, stages, onCreateStage, onUpdateStage, onDeleteStage }: Props) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreateStage(newName.trim(), newColor);
    setNewName('');
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pipeline Stages</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/30">
              <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
              <div className="h-4 w-4 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
              <Input
                value={stage.name}
                onChange={e => onUpdateStage(stage.id, { name: e.target.value })}
                className="text-sm h-8 flex-1"
              />
              <select
                value={stage.color}
                onChange={e => onUpdateStage(stage.id, { color: e.target.value })}
                className="h-8 w-8 rounded border-0 cursor-pointer bg-transparent"
                style={{ backgroundColor: stage.color }}
              >
                {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                  <Switch checked={stage.is_won_stage} onCheckedChange={v => onUpdateStage(stage.id, { is_won_stage: v, is_closed_stage: v || stage.is_lost_stage })} className="scale-75" />
                  Won
                </label>
                <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
                  <Switch checked={stage.is_lost_stage} onCheckedChange={v => onUpdateStage(stage.id, { is_lost_stage: v, is_closed_stage: v || stage.is_won_stage })} className="scale-75" />
                  Lost
                </label>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => onDeleteStage(stage.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Input
            placeholder="New stage name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="text-sm h-9 flex-1"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-1">
            {COLORS.slice(0, 5).map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={cn('h-6 w-6 rounded-full border-2 transition-all', newColor === c ? 'border-foreground scale-110' : 'border-transparent')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
