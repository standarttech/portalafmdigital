import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import type { DateRange, Comparison } from '@/components/dashboard/dashboardData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus, Loader2, GripVertical, Calendar, User, MoreHorizontal,
  CheckCircle2, Clock, PlayCircle, Trash2, Edit,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed';
  client_id: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  client_name?: string;
  assignee_name?: string;
}

interface AgencyUser { user_id: string; display_name: string | null; }
interface Client { id: string; name: string; }

const statusColumns: { key: Task['status']; labelRu: string; labelEn: string; icon: typeof Clock; color: string }[] = [
  { key: 'pending', labelRu: 'К выполнению', labelEn: 'To Do', icon: Clock, color: 'border-t-amber-500' },
  { key: 'in_progress', labelRu: 'В работе', labelEn: 'In Progress', icon: PlayCircle, color: 'border-t-blue-500' },
  { key: 'completed', labelRu: 'Выполнено', labelEn: 'Done', icon: CheckCircle2, color: 'border-t-emerald-500' },
];

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
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState<Task['status']>('pending');

  const fetchData = useCallback(async () => {
    const [{ data: t }, { data: c }, { data: au }] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('status', 'active').order('name'),
      supabase.from('agency_users').select('user_id, display_name'),
    ]);

    const clientMap = new Map((c || []).map(cl => [cl.id, cl.name]));
    const userMap = new Map((au || []).map(u => [u.user_id, u.display_name || 'User']));

    setTasks((t || []).map(task => ({
      ...task,
      status: task.status as Task['status'],
      client_name: clientMap.get(task.client_id),
      assignee_name: task.assigned_to ? userMap.get(task.assigned_to) : undefined,
    })));
    setClients(c || []);
    setAgencyUsers(au || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNewDialog = (status: Task['status'] = 'pending') => {
    setEditingTask(null);
    setFormTitle(''); setFormDesc(''); setFormClient(''); setFormAssignee(''); setFormDueDate('');
    setFormStatus(status);
    setDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormClient(task.client_id);
    setFormAssignee(task.assigned_to || '');
    setFormDueDate(task.due_date || '');
    setFormStatus(task.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formClient) return;
    setSaving(true);

    const payload = {
      title: formTitle,
      description: formDesc || null,
      client_id: formClient,
      assigned_to: formAssignee || null,
      due_date: formDueDate || null,
      status: formStatus,
      created_by: user?.id || null,
    };

    if (editingTask) {
      const { error } = await supabase.from('tasks').update(payload).eq('id', editingTask.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('tasks').insert(payload);
      if (error) { toast.error(error.message); setSaving(false); return; }

      // Create notification for assignee
      if (formAssignee) {
        await supabase.from('notifications').insert({
          user_id: formAssignee,
          title: isRu ? 'Новая задача' : 'New task',
          message: `${formTitle}${formDueDate ? ` · ${isRu ? 'до' : 'due'} ${format(new Date(formDueDate), 'dd.MM.yy')}` : ''}`,
          type: 'task',
          link: '/tasks',
        });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
    toast.success(isRu ? 'Сохранено' : 'Saved');
  };

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const handleDelete = async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success(isRu ? 'Удалено' : 'Deleted');
  };

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = { pending: [], in_progress: [], completed: [] };
    tasks.forEach(t => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
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
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            comparison={comparison}
            onComparisonChange={setComparison}
            customDateRange={customDateRange}
            onCustomDateRangeChange={setCustomDateRange}
            compareEnabled={compareEnabled}
            onCompareEnabledChange={setCompareEnabled}
          />
          <Button size="sm" className="gap-1.5" onClick={() => openNewDialog()}>
            <Plus className="h-4 w-4" />
            {isRu ? 'Новая задача' : 'New Task'}
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
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
                      <div
                        key={task.id}
                        className="bg-secondary/30 border border-border/50 rounded-lg p-3 space-y-2 hover:border-primary/30 transition-colors cursor-pointer group"
                        onClick={() => openEditDialog(task)}
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
                                <DropdownMenuItem key={s.key} onClick={() => handleStatusChange(task.id, s.key)}>
                                  <s.icon className="h-3.5 w-3.5 mr-2" />
                                  {isRu ? s.labelRu : s.labelEn}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive">
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
                          {task.client_name && (
                            <Badge variant="outline" className="text-[10px]">{task.client_name}</Badge>
                          )}
                          {task.due_date && (
                            <span className={cn(
                              'text-[10px] flex items-center gap-0.5',
                              new Date(task.due_date) < new Date() && task.status !== 'completed'
                                ? 'text-destructive font-medium'
                                : 'text-muted-foreground'
                            )}>
                              <Calendar className="h-2.5 w-2.5" />
                              {format(new Date(task.due_date), 'dd.MM')}
                            </span>
                          )}
                          {task.assignee_name && (
                            <div className="flex items-center gap-1 ml-auto">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                  {task.assignee_name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-muted-foreground">{task.assignee_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
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
                <Label>{isRu ? 'Клиент' : 'Client'} *</Label>
                <Select value={formClient} onValueChange={setFormClient}>
                  <SelectTrigger><SelectValue placeholder={isRu ? 'Выбрать' : 'Select'} /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isRu ? 'Исполнитель' : 'Assignee'}</Label>
                <Select value={formAssignee} onValueChange={setFormAssignee}>
                  <SelectTrigger><SelectValue placeholder={isRu ? 'Выбрать' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {agencyUsers.map(u => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.display_name || 'User'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
