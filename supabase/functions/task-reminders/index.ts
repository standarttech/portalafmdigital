import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Security: This function is cron-only. Validate internal secret header or service role bearer.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  // Allow: service role key (internal/cron calls) or x-cron-secret header
  const cronSecret = Deno.env.get('CRON_SECRET') ?? serviceKey;
  const internalSecret = req.headers.get('x-cron-secret');
  if (token !== serviceKey && internalSecret !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let type = 'daily';
  try { const body = await req.json(); type = body.type || 'daily'; } catch {}

  const today = new Date().toISOString().split('T')[0];

  if (type === 'daily') {
    // Send daily reminder: tasks due today or in next 3 days
    const threeDaysAhead = new Date();
    threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);
    const aheadStr = threeDaysAhead.toISOString().split('T')[0];

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, assigned_to, status')
      .in('status', ['pending', 'in_progress'])
      .not('assigned_to', 'is', null)
      .not('due_date', 'is', null)
      .lte('due_date', aheadStr)
      .gte('due_date', today);

    if (tasks && tasks.length > 0) {
      // Group by assigned_to
      const byUser: Record<string, typeof tasks> = {};
      tasks.forEach(t => {
        if (!byUser[t.assigned_to!]) byUser[t.assigned_to!] = [];
        byUser[t.assigned_to!].push(t);
      });

      for (const [userId, userTasks] of Object.entries(byUser)) {
        const taskList = userTasks.map(t => `• ${t.title} (${t.due_date})`).join('\n');
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: userId,
            type: 'task',
            title: `📋 Задачи на сегодня (${userTasks.length})`,
            message: `У вас ${userTasks.length} задач${userTasks.length === 1 ? 'а' : userTasks.length < 5 ? 'и' : ''} к выполнению:\n${taskList}`,
            link: '/tasks',
            force_channels: ['in_app', 'email', 'telegram'],
          },
        });
      }
      console.log(`[task-reminders] daily: notified ${Object.keys(byUser).length} users about ${tasks.length} tasks`);
    }
  }

  if (type === 'overdue') {
    // Send reminder for overdue tasks every 6 hours
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, assigned_to, status')
      .in('status', ['pending', 'in_progress'])
      .not('assigned_to', 'is', null)
      .not('due_date', 'is', null)
      .lt('due_date', today);

    if (overdueTasks && overdueTasks.length > 0) {
      const byUser: Record<string, typeof overdueTasks> = {};
      overdueTasks.forEach(t => {
        if (!byUser[t.assigned_to!]) byUser[t.assigned_to!] = [];
        byUser[t.assigned_to!].push(t);
      });

      for (const [userId, userTasks] of Object.entries(byUser)) {
        const taskList = userTasks.map(t => `• ${t.title} (просрочено: ${t.due_date})`).join('\n');
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: userId,
            type: 'alert',
            title: `⚠️ Просроченные задачи (${userTasks.length})`,
            message: `У вас ${userTasks.length} просроченных задач${userTasks.length === 1 ? 'а' : ''}:\n${taskList}`,
            link: '/tasks',
            force_channels: ['in_app', 'email', 'telegram'],
          },
        });
      }
      console.log(`[task-reminders] overdue: notified ${Object.keys(byUser).length} users about ${overdueTasks.length} overdue tasks`);
    }
  }

  return new Response(JSON.stringify({ success: true, type }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
