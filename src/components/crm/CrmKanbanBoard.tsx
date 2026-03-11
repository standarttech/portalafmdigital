import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical, Phone, Mail, Tag, User, Calendar } from 'lucide-react';
import type { CrmLead, CrmStage } from '@/hooks/useCrmData';
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface KanbanBoardProps {
  stages: CrmStage[];
  leads: CrmLead[];
  onMoveLead: (leadId: string, newStageId: string, oldStageId: string) => Promise<boolean>;
  onLeadClick: (lead: CrmLead) => void;
  agencyUsers?: { user_id: string; display_name: string | null }[];
}

function SortableLeadCard({ lead, onClick, agencyUsers }: { lead: CrmLead; onClick: () => void; agencyUsers?: { user_id: string; display_name: string | null }[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', stageId: lead.stage_id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const displayName = lead.full_name || `${lead.first_name} ${lead.last_name}`.trim() || lead.email || 'Unnamed';
  const assigneeName = agencyUsers?.find(u => u.user_id === lead.assignee_id)?.display_name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border border-border/60 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 transition-all group shadow-sm hover:shadow-md touch-none',
        isDragging && 'shadow-lg ring-2 ring-primary/30'
      )}
      onClick={() => { if (!isDragging) onClick(); }}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="text-sm font-medium text-foreground truncate flex-1">{displayName}</span>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 mt-0.5" />
      </div>

      {lead.company && (
        <div className="text-[11px] text-muted-foreground mb-1 truncate">{lead.company}</div>
      )}

      {(lead.phone || lead.email) && (
        <div className="space-y-0.5 mb-1.5">
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {lead.source && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{lead.source}</span>
        )}
        {(lead as any).utm_campaign && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground font-medium truncate max-w-[100px]" title={(lead as any).utm_campaign}>
            {(lead as any).utm_campaign}
          </span>
        )}
        {lead.tags?.slice(0, 2).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            <Tag className="h-2.5 w-2.5 inline mr-0.5" />{tag}
          </span>
        ))}
        {lead.value > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium ml-auto">${lead.value.toLocaleString()}</span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/30">
        {assigneeName ? (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <User className="h-2.5 w-2.5" />
            <span className="truncate max-w-[80px]">{assigneeName}</span>
          </div>
        ) : <div />}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-2.5 w-2.5" />
          <span>{format(new Date(lead.created_at), 'dd MMM')}</span>
        </div>
      </div>
    </div>
  );
}

function StageColumn({ stage, leads, onLeadClick, agencyUsers }: {
  stage: CrmStage;
  leads: CrmLead[];
  onLeadClick: (lead: CrmLead) => void;
  agencyUsers?: { user_id: string; display_name: string | null }[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'stage', stageId: stage.id },
  });

  return (
    <div className="flex-shrink-0 w-[240px] sm:w-[280px] flex flex-col max-h-full">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
        <span className="text-sm font-semibold text-foreground truncate">{stage.name}</span>
        <span className="text-xs text-muted-foreground ml-auto bg-muted/60 px-1.5 py-0.5 rounded-full">{leads.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 bg-muted/20 rounded-lg p-2 overflow-y-auto min-h-[200px] space-y-2 border border-border/30 transition-colors',
          isOver && 'border-primary/50 bg-primary/5'
        )}
      >
        <SortableContext id={stage.id} items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
              agencyUsers={agencyUsers}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/50">
            Drop leads here
          </div>
        )}
      </div>
    </div>
  );
}

export default function CrmKanbanBoard({ stages, leads, onMoveLead, onLeadClick, agencyUsers }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
  );

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const overData = over.data.current as { type?: string; stageId?: string; sortable?: { containerId?: string } } | undefined;
    let targetStageId: string | null = null;

    if (overData?.type === 'stage' && overData.stageId) {
      targetStageId = overData.stageId;
    } else if (overData?.type === 'lead') {
      targetStageId = overData.stageId || overData.sortable?.containerId || null;
    }

    if (!targetStageId) {
      const overLead = leads.find(l => l.id === over.id);
      if (overLead) targetStageId = overLead.stage_id;
      const overStage = stages.find(s => s.id === over.id);
      if (overStage) targetStageId = overStage.id;
    }

    if (targetStageId && targetStageId !== lead.stage_id) {
      await onMoveLead(leadId, targetStageId, lead.stage_id);
    }
  }, [leads, stages, onMoveLead]);

  const leadsByStage = stages.reduce<Record<string, CrmLead[]>>((acc, stage) => {
    acc[stage.id] = leads.filter(l => l.stage_id === stage.id);
    return acc;
  }, {});

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea className="w-full">
        <div className="flex gap-2 sm:gap-3 pb-4 min-h-[400px]" style={{ minWidth: stages.length * 256 }}>
          {stages.map(stage => (
            <StageColumn
              key={stage.id}
              stage={stage}
              leads={leadsByStage[stage.id] || []}
              onLeadClick={onLeadClick}
              agencyUsers={agencyUsers}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {activeLead && (
          <div className="bg-card border border-primary/40 rounded-lg p-3 shadow-xl ring-2 ring-primary/20 w-[224px] sm:w-[264px] rotate-2">
            <span className="text-sm font-medium text-foreground">
              {activeLead.full_name || `${activeLead.first_name} ${activeLead.last_name}`.trim() || activeLead.email || 'Unnamed'}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
