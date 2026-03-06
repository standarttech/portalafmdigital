import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus, Loader2, Calendar, MoreHorizontal,
  CheckCircle2, Clock, PlayCircle, Trash2, Archive, Eye, EyeOff,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const AGENCY_SENTINEL = '__agency__';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  client_id: string | null;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  assignee_names: string[];
  assignee_ids: string[];
}

interface AgencyUser { user_id: string; display_name: string | null; }
interface Client { id: string; name: string; }

const statusColumns: { key: Task['status']; labelRu: string; labelEn: string; icon: typeof Clock; color: string }[] = [
  { key: 'pending', labelRu: 'К выполнению', labelEn: 'To Do', icon: Clock, color: 'border-t-amber-500' },
  { key: 'in_progress', labelRu: 'В работе', labelEn: 'In Progress', icon: PlayCircle, color: 'border-t-blue-500' },
  { key: 'completed', labelRu: 'Выполнено', labelEn: 'Done', icon: CheckCircle2, color: 'border-t-emerald-500' },
];

/** Parse a date-only string (YYYY-MM-DD) without timezone shift */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(dateStr: string, fmt: 'short' | 'full' = 'short'): string {
  const d = parseLocalDate(dateStr);
  if (fmt === 'short') {
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/** Check if a completed task should be auto-archived (completed > 3 days ago) */
function isAutoArchived(task: Task): boolean {
  if (task.status !== 'completed') return false;
  const completedAt = new Date(task.updated_at);
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  return completedAt < threeDaysAgo;
}

export default function TaskBoardPage() {
  const { language } = useLanguage();
  const { user, agencyRole } = useAuth();
  const isRu = language === 'ru';
  const isAdmin = agencyRole === 'AgencyAdmin';
  const isAgency = isAdmin || agencyRole === 'MediaBuyer';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [agencyUsers, setAgencyUsers] = useState<AgencyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formAssignees, setFormAssignees] = useState<string[]>([]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState<Task['status']>('pending');

  const toggleFormAssignee = (userId: string) => {
    setFormAssignees(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const fetchData = useCallback(async () => {
    const [{ data: t }, { data: c }, { data: au }, { data: taskAssignees }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
      supabase.from('agency_users').select('user_id, display_name'),
      supabase.from('task_assignees').select('task_id, user_id'),
    ]);

    const clientMap = new Map((c || []).map(cl => [cl.id, cl.name]));
    const userMap = new Map((au || []).map(u => [u.user_id, u.display_name || 'User']));
    const assigneesByTask = new Map<string, string[]>();

    (taskAssignees || []).forEach((entry: any) => {
      const list = assigneesByTask.get(entry.task_id) || [];
      list.push(entry.user_id);
      assigneesByTask.set(entry.task_id, list);
    });

    setTasks((t || []).map(task => {
      const assigneeIds = assigneesByTask.get(task.id) || (task.assigned_to ? [task.assigned_to] : []);
      const assigneeNames = assigneeIds.map(id => userMap.get(id)).filter(Boolean) as string[];
      return {
        ...task,
        status: task.status as Task['status'],
        client_name: task.client_id ? clientMap.get(task.client_id) : undefined,
        assignee_ids: assigneeIds,
        assignee_names: assigneeNames,
      };
    }));
    setClients(c || []);
    setAgencyUsers(au || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNewDialog = (status: Task['status'] = 'pending') => {
    setEditingTask(null);
    setFormTitle(''); setFormDesc(''); setFormClient(''); setFormAssignees([]); setFormDueDate('');
    setFormStatus(status);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormClient(task.client_id ?? AGENCY_SENTINEL);
    setFormAssignees(task.assignee_ids || (task.assigned_to ? [task.assigned_to] : []));
    setFormDueDate(task.due_date || '');
    setFormStatus(task.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formClient) return;
    setSaving(true);

    const assigneeIds = Array.from(new Set(formAssignees.filter(Boolean)));

    const payload = {
      title: formTitle,
      description: formDesc || null,
      client_id: formClient === AGENCY_SENTINEL ? null : formClient,
      assigned_to: assigneeIds[0] || null,
      due_date: formDueDate || null,
      status: formStatus,
      created_by: user?.id || null,
    };

    if (editingTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
      if (error) { toast.error(error.message); setSaving(false); return; }

      await supabase.from('task_assignees').delete().eq('task_id', editingTask.id);
      if (assigneeIds.length > 0) {
        await supabase.from('task_assignees').insert(assigneeIds.map(userId => ({ task_id: editingTask.id, user_id: userId })));
      }
    } else {
      const { data: createdTask, error } = await supabase.from('tasks').insert(payload).select('id').single();
      if (error) { toast.error(error.message); setSaving(false); return; }

      if (createdTask && assigneeIds.length > 0) {
        await supabase.from('task_assignees').insert(assigneeIds.map(userId => ({ task_id: createdTask.id, user_id: userId })));
      }

      if (assigneeIds.length > 0) {
        const notifMessage = `${formTitle}${formDueDate ? ` · ${isRu ? 'до' : 'due'} ${formatLocalDate(formDueDate, 'full')}` : ''}`;
        await Promise.all(assigneeIds.map(assigneeId => supabase.functions.invoke('send-notification', {
          body: {
            user_id: assigneeId,
            type: 'task',
            title: isRu ? 'Новая задача назначена' : 'New task assigned',
            message: notifMessage,
            link: '/tasks',
            force_channels: ['in_app', 'email'],
          },
        })));
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
    toast.success(isRu ? 'Сохранено' : 'Saved');
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t));
  };

  const handleArchiveTask = async (taskId: string) => {
    // Move to completed + set updated_at to 4 days ago to trigger auto-archive
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    await supabase.from('tasks').update({ status: 'completed' as any, updated_at: fourDaysAgo.toISOString() } as any).eq('id', taskId);
    fetchData();
    toast.success(isRu ? 'Задача архивирована' : 'Task archived');
  };

  const handleDelete = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success(isRu ? 'Удалено' : 'Deleted');
  };

  const { activeTasks, archivedTasks, tasksByStatus } = useMemo(() => {
    const active: Task[] = [];
    const archived: Task[] = [];
    tasks.forEach(t => {
      if (isAutoArchived(t)) archived.push(t);
      else active.push(t);
    });
    const map: Record<string, Task[]> = { pending: [], in_progress: [], completed: [] };
    active.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
    });
    return { activeTasks: active, archivedTasks: archived, tasksByStatus: map };
  }, [tasks]);

  if (!isAgency) return <div className="p-8 text-center text-muted-foreground">Access restricted</div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            📋 {isRu ? 'Доска задач' : 'Task Board'}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {isRu ? 'Управление задачами команды' : 'Manage team tasks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchive ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowArchive(!showArchive)}
          >
            {showArchive ? <EyeOff className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            {isRu ? `Архив (${archivedTasks.length})` : `Archive (${archivedTasks.length})`}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => openNewDialog()}>
            <Plus className="h-4 w-4" />
            {isRu ? 'Новая задача' : 'New Task'}
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statusColumns.map(col => {
              const Icon = col.icon;
              const columnTasks = tasksByStatus[col.key] || [];
              return (
                <motion.div key={col.key} variants={item}>
                  <Card className={cn('glass-card border-t-2', col.color)}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          {isRu ? col.labelRu : col.labelEn}
                          <Badge variant="secondary" className="text-[10px] ml-1">{columnTasks.length}</Badge>
                        </CardTitle>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openNewDialog(col.key)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0 space-y-2 min-h-[200px]">
                      {columnTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          isRu={isRu}
                          onEdit={() => openEditDialog(task)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          onArchive={handleArchiveTask}
                          statusColumns={statusColumns}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Archive section */}
          {showArchive && archivedTasks.length > 0 && (
            <motion.div variants={item}>
              <Card className="glass-card border-t-2 border-t-muted-foreground/30">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Archive className="h-3.5 w-3.5" />
                    {isRu ? 'Архив' : 'Archive'}
                    <Badge variant="secondary" className="text-[10px] ml-1">{archivedTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {archivedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isRu={isRu}
                        onEdit={() => openEditDialog(task)}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onArchive={handleArchiveTask}
                        statusColumns={statusColumns}
                        isArchived
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? (isRu ? 'Редактировать задачу' : 'Edit Task') : (isRu ? 'Новая задача' : 'New Task')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{isRu ? 'Название' : 'Title'} *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={isRu ? 'Что нужно сделать?' : 'What needs to be done?'} />
            </div>
            <div className="space-y-2">
              <Label>{isRu ? 'Описание' : 'Description'}</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isRu ? 'Клиент / Агентство' : 'Client / Agency'} *</Label>
                <Select value={formClient} onValueChange={setFormClient}>
                  <SelectTrigger><SelectValue placeholder={isRu ? 'Выбрать' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AGENCY_SENTINEL}>🏢 {isRu ? 'Агентство' : 'Agency'}</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRu ? 'Исполнители' : 'Assignees'}</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {formAssignees.length === 0
                          ? (isRu ? 'Выбрать' : 'Select')
                          : `${isRu ? 'Выбрано' : 'Selected'}: ${formAssignees.length}`}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 max-h-72 overflow-y-auto" align="start">
                    <DropdownMenuItem onClick={() => setFormAssignees([])}>
                      {isRu ? 'Без исполнителей' : 'No assignees'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {agencyUsers.map(u => (
                      <DropdownMenuCheckboxItem
                        key={u.user_id}
                        checked={formAssignees.includes(u.user_id)}
                        onCheckedChange={() => toggleFormAssignee(u.user_id)}
                      >
                        {u.display_name || 'User'}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{isRu ? 'Дедлайн' : 'Due Date'}</Label>
                <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{isRu ? 'Статус' : 'Status'}</Label>
                <Select value={formStatus} onValueChange={v => setFormStatus(v as Task['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusColumns.map(s => (
                      <SelectItem key={s.key} value={s.key}>{isRu ? s.labelRu : s.labelEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editingTask && (
              <Button variant="destructive" size="sm" onClick={() => { handleDelete(editingTask.id); setDialogOpen(false); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> {isRu ? 'Удалить' : 'Delete'}
              </Button>
            )}
            <div className="flex-1" />
            <DialogClose asChild><Button variant="outline">{isRu ? 'Отмена' : 'Cancel'}</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !formTitle || !formClient}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isRu ? 'Сохранить' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

interface TaskCardProps {
  task: Task;
  isRu: boolean;
  onEdit: () => void;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  statusColumns: typeof import('./TaskBoardPage').default extends never ? never : { key: Task['status']; labelRu: string; labelEn: string; icon: any }[];
  isArchived?: boolean;
}

function TaskCard({ task, isRu, onEdit, onStatusChange, onDelete, onArchive, statusColumns, isArchived }: TaskCardProps) {
  return (
    <div
      className={cn(
        "bg-secondary/30 border border-border/50 rounded-lg p-3 space-y-2 hover:border-primary/30 transition-colors cursor-pointer group",
        isArchived && "opacity-60"
      )}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-tight">{task.title}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
            {statusColumns.filter(s => s.key !== task.status).map(s => (
              <DropdownMenuItem key={s.key} onClick={() => onStatusChange(task.id, s.key)}>
                <s.icon className="h-3.5 w-3.5 mr-2" />
                {isRu ? s.labelRu : s.labelEn}
              </DropdownMenuItem>
            ))}
            {task.status === 'completed' && !isArchived && (
              <DropdownMenuItem onClick={() => onArchive(task.id)}>
                <Archive className="h-3.5 w-3.5 mr-2" />
                {isRu ? 'В архив' : 'Archive'}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              {isRu ? 'Удалить' : 'Delete'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {task.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {task.client_id === null ? (
          <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">{isRu ? '🏢 Агентство' : '🏢 Agency'}</Badge>
        ) : task.client_name ? (
          <Badge variant="outline" className="text-[10px]">{task.client_name}</Badge>
        ) : null}
        {task.due_date && (
          <span className={cn(
            'text-[10px] flex items-center gap-0.5',
            parseLocalDate(task.due_date) < new Date() && task.status !== 'completed'
              ? 'text-destructive font-medium'
              : 'text-muted-foreground'
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {formatLocalDate(task.due_date)}
          </span>
        )}
        {task.assignee_names.length > 0 && (
          <div className="flex items-center gap-1 ml-auto">
            {task.assignee_names.slice(0, 3).map((name, idx) => (
              <Avatar key={`${name}-${idx}`} className="h-4 w-4">
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            <span className="text-[10px] text-muted-foreground">
              {task.assignee_names.length === 1
                ? task.assignee_names[0]
                : (isRu ? `${task.assignee_names.length} исп.` : `${task.assignee_names.length} assignees`)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
