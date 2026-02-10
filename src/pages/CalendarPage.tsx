import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Target, ListTodo, MessageSquare } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/i18n/translations';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'task' | 'annotation' | 'campaign';
  client_name?: string;
  status?: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const typeConfig: Record<string, { icon: typeof ListTodo; color: string }> = {
  task: { icon: ListTodo, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  annotation: { icon: MessageSquare, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  campaign: { icon: Target, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export default function CalendarPage() {
  const { t } = useLanguage();
  const { agencyRole } = useAuth();
  const isAgency = agencyRole === 'AgencyAdmin' || agencyRole === 'MediaBuyer';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart);

  const fetchEvents = useCallback(async () => {
    const from = format(monthStart, 'yyyy-MM-dd');
    const to = format(monthEnd, 'yyyy-MM-dd');

    const [{ data: tasks }, { data: annotations }] = await Promise.all([
      supabase.from('tasks').select('id, title, due_date, status, client_id').gte('due_date', from).lte('due_date', to),
      supabase.from('annotations').select('id, text, date, client_id').gte('date', from).lte('date', to),
    ]);

    // Get client names
    const clientIds = new Set([
      ...(tasks || []).map(t => t.client_id),
      ...(annotations || []).map(a => a.client_id),
    ]);
    const { data: clients } = await supabase.from('clients').select('id, name').in('id', [...clientIds]);
    const nameMap = new Map(clients?.map(c => [c.id, c.name]) || []);

    const evts: CalendarEvent[] = [
      ...(tasks || []).filter(t => t.due_date).map(t => ({
        id: t.id, date: t.due_date!, title: t.title, type: 'task' as const,
        client_name: nameMap.get(t.client_id), status: t.status,
      })),
      ...(annotations || []).map(a => ({
        id: a.id, date: a.date, title: a.text, type: 'annotation' as const,
        client_name: nameMap.get(a.client_id),
      })),
    ];
    setEvents(evts);
  }, [monthStart, monthEnd]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(e => {
      const key = e.date;
      map.set(key, [...(map.get(key) || []), e]);
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDate
    ? eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {t('calendar.title' as TranslationKey)}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t('calendar.subtitle' as TranslationKey)}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar Grid */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <h3 className="text-sm sm:text-base font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1.5">{d}</div>
                ))}
                {Array.from({ length: startDow }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-16 sm:h-20" />
                ))}
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'h-16 sm:h-20 border border-border/30 rounded-md p-1 text-left hover:bg-secondary/30 transition-colors relative',
                        isToday(day) && 'border-primary/50',
                        isSelected && 'bg-primary/10 border-primary',
                      )}
                    >
                      <span className={cn(
                        'text-[10px] sm:text-xs font-medium',
                        isToday(day) ? 'text-primary font-bold' : 'text-muted-foreground'
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map(e => (
                          <div key={e.id} className={cn('h-1.5 w-1.5 rounded-full', e.type === 'task' ? 'bg-blue-400' : e.type === 'annotation' ? 'bg-amber-400' : 'bg-green-400')} />
                        ))}
                        {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Selected day details */}
        <motion.div variants={item}>
          <Card className="glass-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a day'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No events</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(e => {
                    const config = typeConfig[e.type];
                    const Icon = config.icon;
                    return (
                      <div key={e.id} className={cn('flex items-start gap-2 p-2 rounded-md border text-xs', config.color)}>
                        <Icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.title}</p>
                          {e.client_name && <p className="text-[10px] opacity-70 mt-0.5">{e.client_name}</p>}
                          {e.status && <Badge variant="outline" className="text-[9px] mt-1">{e.status}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
