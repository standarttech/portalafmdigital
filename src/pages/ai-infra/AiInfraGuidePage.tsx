import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Server, GitBranch, ListTodo, ScrollText, HeartPulse, Shield, Zap, Settings } from 'lucide-react';

const sections = [
  {
    id: 'overview',
    title: 'What is AI Infrastructure?',
    icon: BookOpen,
    content: `AI Infrastructure is the centralized management layer for all AI providers used across the platform. It allows administrators to register, configure, monitor, and route AI tasks to different providers (OpenAI, Google, Anthropic, etc.) without changing application code.

**Key benefits:**
- Single place to manage all AI provider credentials and configurations
- Intelligent routing of AI tasks to the best available provider
- Real-time health monitoring and automatic failover
- Complete audit trail of every AI task execution
- Cost optimization through provider selection strategies`,
  },
  {
    id: 'providers',
    title: 'Providers — Managing AI Services',
    icon: Server,
    content: `The **Providers** page is where you register and configure AI service providers.

**How to add a provider:**
1. Click "Add Provider" button
2. Fill in the provider details:
   - **Name**: Display name (e.g., "OpenAI Production")
   - **Slug**: Unique identifier (e.g., "openai-prod")
   - **Provider Type**: The underlying service (openai, google, anthropic, etc.)
   - **Category**: Classification (llm, image, embedding, etc.)
   - **Base URL**: API endpoint (optional, uses default if blank)
   - **Auth Type**: How to authenticate (api_key, oauth, etc.)
3. Configure capabilities (chat, text, images, structured output, workflows)
4. Save the provider

**Managing secrets:**
- Each provider can have API keys stored securely in the vault
- Keys are never exposed in the UI — only references are stored
- Click "Manage Secrets" on any provider to add/rotate keys

**Best practices:**
- Register at least 2 providers for redundancy
- Mark one provider as "Default" for each category
- Disable providers during maintenance instead of deleting them`,
  },
  {
    id: 'routes',
    title: 'Routes — Task Routing Configuration',
    icon: GitBranch,
    content: `**Routes** define how AI tasks are distributed across providers. Each route maps a task type to a primary provider with optional fallback.

**Route configuration:**
- **Task Type**: The kind of work (e.g., "text_generation", "image_analysis", "campaign_analysis")
- **Primary Provider**: First choice for handling this task type
- **Fallback Provider**: Used if primary is unavailable or fails
- **Priority**: Determines order when multiple routes match (lower = higher priority)
- **Timeout**: Maximum seconds to wait for a response
- **Retry Limit**: How many times to retry on failure
- **Is Active**: Toggle to enable/disable a route

**How routing works:**
1. An AI task is submitted with a specific task type
2. The router finds all active routes matching that task type
3. Routes are sorted by priority
4. The primary provider of the highest-priority route is selected
5. If it fails, the fallback provider is tried
6. If all routes fail, the task is marked as failed

**Tips:**
- Create separate routes for different task types to optimize cost vs quality
- Use faster/cheaper providers for simple tasks (classification, summarization)
- Use premium providers for complex reasoning tasks
- Set appropriate timeouts — image generation needs longer than text`,
  },
  {
    id: 'tasks',
    title: 'Tasks — Execution Queue & History',
    icon: ListTodo,
    content: `The **Tasks** page shows all AI task executions — pending, running, completed, and failed.

**Task lifecycle:**
1. **Queued** — Task submitted, waiting for processing
2. **Running** — Currently being processed by a provider
3. **Completed** — Successfully finished with output
4. **Failed** — All attempts exhausted, error recorded

**Task details include:**
- Task type and source module
- Selected provider and route
- Input/output payloads
- Attempt count and timing
- Error messages (if failed)

**Filtering & monitoring:**
- Filter by status, task type, provider, or date range
- Click any task to see full execution details
- Use this page to diagnose why specific AI operations failed

**Common issues:**
- Tasks stuck in "queued" — check if the edge function \`ai-router\` is deployed
- High failure rate — check provider health and API key validity
- Slow completion — review timeout settings in routes`,
  },
  {
    id: 'logs',
    title: 'Logs — Detailed Execution Trace',
    icon: ScrollText,
    content: `**Logs** provide step-by-step execution traces for every AI task.

**Log levels:**
- **Info** — Normal execution steps (provider selected, request sent, response received)
- **Warning** — Non-fatal issues (retry triggered, fallback used)
- **Error** — Fatal issues (provider unreachable, invalid response, timeout)

**Each log entry contains:**
- Timestamp
- Step type (route_selection, provider_call, response_parse, etc.)
- Associated provider
- Message describing what happened
- Optional metadata payload

**Using logs for debugging:**
1. Find the failed task in the Tasks page
2. Click to open its details
3. Review the log entries chronologically
4. Look for the first error entry — that's usually the root cause

**Log retention:**
- Logs are stored indefinitely by default
- Consider implementing cleanup for logs older than 90 days in production`,
  },
  {
    id: 'health',
    title: 'Health — Provider Monitoring',
    icon: HeartPulse,
    content: `The **Health** page shows real-time connectivity and latency status for all registered providers.

**Health statuses:**
- 🟢 **Healthy** — Provider responding normally, latency within acceptable range
- 🟡 **Degraded** — Provider responding but with higher-than-normal latency
- 🔴 **Unhealthy** — Provider not responding or returning errors
- ⚪ **Unknown** — No health check has been performed yet

**Running health checks:**
- Click "Run Health Check" on any provider card to test connectivity
- The check sends a minimal request to verify the API key and endpoint
- Results include latency in milliseconds and any error messages

**Automated monitoring:**
- Health checks can be scheduled via the \`scheduled-gos-health\` edge function
- Configure frequency based on your SLA requirements
- Unhealthy providers are automatically deprioritized in routing

**Best practices:**
- Run health checks after adding or rotating API keys
- Monitor latency trends — increasing latency may indicate rate limiting
- Set up alerts for providers that stay unhealthy for extended periods`,
  },
  {
    id: 'security',
    title: 'Security & Access Control',
    icon: Shield,
    content: `AI Infrastructure is restricted to administrators only.

**Access control:**
- Module is guarded by \`can_access_ai_infra\` permission
- Only AgencyAdmin role has access by default
- Provider secrets are stored in Supabase Vault (encrypted at rest)
- API keys are never exposed in the frontend — only secret references

**Security best practices:**
- Rotate API keys regularly
- Use separate API keys for production and development
- Monitor the audit log for unauthorized access attempts
- Review provider access patterns in the Logs page`,
  },
  {
    id: 'quickstart',
    title: 'Quick Start Guide',
    icon: Zap,
    content: `**Get started in 5 minutes:**

1. **Add a provider**
   - Go to Providers → Add Provider
   - Enter name, slug, and provider type
   - Add your API key via "Manage Secrets"

2. **Create a route**
   - Go to Routes → Add Route
   - Select task type (e.g., "text_generation")
   - Assign your provider as primary
   - Set timeout to 30 seconds and retry limit to 2

3. **Verify health**
   - Go to Health page
   - Run a health check on your new provider
   - Confirm status shows "healthy"

4. **Test it**
   - Go to AI Ads Copilot or any module that uses AI
   - Run an analysis — it will automatically use your configured provider
   - Check Tasks page to see the execution result

**That's it!** The AI router will now use your configured providers for all AI operations across the platform.`,
  },
];

export default function AiInfraGuidePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[hsl(200,70%,55%)]" /> AI Infrastructure Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete documentation for configuring and managing AI providers, routing, and monitoring
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Providers', desc: 'Register & configure', icon: Server },
          { label: 'Routes', desc: 'Task routing', icon: GitBranch },
          { label: 'Tasks', desc: 'Execution queue', icon: ListTodo },
          { label: 'Health', desc: 'Monitoring', icon: HeartPulse },
        ].map(item => (
          <Card key={item.label} className="text-center">
            <CardContent className="pt-4 pb-3 px-3">
              <item.icon className="h-6 w-6 mx-auto text-[hsl(200,70%,55%)] mb-1.5" />
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Accordion type="multiple" defaultValue={['overview', 'quickstart']} className="space-y-2">
        {sections.map(section => (
          <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2.5">
                <section.icon className="h-4 w-4 text-[hsl(200,70%,55%)]" />
                <span className="text-sm font-semibold">{section.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content.split('\n').map((line, i) => {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                    return <h4 key={i} className="text-foreground font-semibold mt-3 mb-1 text-sm">{trimmed.replace(/\*\*/g, '')}</h4>;
                  }
                  if (trimmed.startsWith('- **')) {
                    const match = trimmed.match(/^- \*\*(.+?)\*\*\s*[—–-]?\s*(.*)$/);
                    if (match) {
                      return <p key={i} className="ml-4 text-xs my-0.5">• <span className="font-medium text-foreground">{match[1]}</span> — {match[2]}</p>;
                    }
                  }
                  if (trimmed.startsWith('- ')) {
                    return <p key={i} className="ml-4 text-xs my-0.5">• {trimmed.slice(2)}</p>;
                  }
                  if (/^\d+\./.test(trimmed)) {
                    return <p key={i} className="ml-2 text-xs my-0.5">{trimmed}</p>;
                  }
                  if (trimmed === '') return <br key={i} />;
                  return <p key={i} className="text-xs my-1">{trimmed}</p>;
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
