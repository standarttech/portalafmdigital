import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  BookOpen, Bot, MonitorSmartphone, BrainCircuit, Lightbulb, FileStack,
  Rocket, TrendingUp, Brain, Zap, ImageIcon, Settings, Users, Target
} from 'lucide-react';

const sections = [
  {
    id: 'overview',
    title: 'What is AI Ads Copilot?',
    icon: Bot,
    content: `AI Ads Copilot is an intelligent advertising management system that uses AI to analyze campaign performance, generate optimization recommendations, create campaign drafts, and execute changes across ad platforms (Meta, Google, TikTok).

**Core workflow:**
1. Connect ad accounts → 2. AI analyzes performance → 3. Get recommendations → 4. Create hypotheses → 5. Draft campaigns → 6. Launch & monitor → 7. Optimize continuously

**Key capabilities:**
- Automated performance analysis across all connected ad accounts
- AI-generated optimization recommendations with priority scoring
- Hypothesis-driven testing framework
- Campaign draft builder with validation
- One-click campaign launching to ad platforms
- Real-time performance monitoring
- Automated optimization presets`,
  },
  {
    id: 'accounts',
    title: 'Ad Accounts — Connecting Platforms',
    icon: MonitorSmartphone,
    content: `The **Ad Accounts** page manages connections to advertising platforms.

**Connecting an ad account:**
1. Navigate to Ad Accounts
2. Click "Connect Account"
3. Select the client and platform connection
4. Enter the platform account ID
5. The account will start syncing performance data

**Supported platforms:**
- Meta (Facebook/Instagram) — via Meta Marketing API
- Google Ads — via Google Ads API
- TikTok Ads — via TikTok Marketing API

**Data sync:**
- Performance metrics sync automatically every hour
- Manual sync available via the Sync Monitor
- Historical data imported on first connection (up to 90 days)

**Troubleshooting:**
- "No data" — check if the platform connection token is valid
- "Sync failed" — verify the account ID and permissions
- "Stale data" — trigger a manual sync from the Sync Monitor page`,
  },
  {
    id: 'analysis',
    title: 'AI Analysis — Performance Intelligence',
    icon: BrainCircuit,
    content: `The **AI Analysis** page runs AI-powered analysis on your advertising data.

**How to run an analysis:**
1. Select a client from the dropdown
2. Choose analysis type:
   - **Performance Review** — overall account health assessment
   - **Campaign Audit** — detailed campaign-level analysis
   - **Audience Analysis** — targeting effectiveness review
   - **Creative Analysis** — ad creative performance comparison
   - **Budget Optimization** — spend allocation recommendations
3. Optionally select specific ad account
4. Click "Run Analysis"

**What the AI analyzes:**
- Spend efficiency (CPC, CPM, CPL trends)
- Conversion funnel health (CTR → Lead rate → Purchase rate)
- Budget allocation across campaigns
- Creative fatigue signals
- Audience overlap and saturation
- Day/time performance patterns

**Analysis sessions:**
- Each analysis creates a session that groups related insights
- Sessions are saved and can be revisited
- Results include structured data + natural language summary`,
  },
  {
    id: 'recommendations',
    title: 'Recommendations — AI Insights',
    icon: TrendingUp,
    content: `**Recommendations** are AI-generated action items based on analysis results.

**Recommendation types:**
- **Budget** — Reallocate spend to better-performing campaigns
- **Targeting** — Adjust audiences based on conversion data
- **Creative** — Refresh or rotate ad creatives
- **Bid** — Adjust bidding strategy or amounts
- **Schedule** — Optimize ad scheduling based on performance patterns

**Priority levels:**
- 🔴 **High** — Significant impact, act immediately
- 🟡 **Medium** — Important but not urgent
- 🟢 **Low** — Nice to have, optimize when convenient

**Working with recommendations:**
1. Review the recommendation details and rationale
2. Accept → creates a hypothesis for testing
3. Dismiss → marks as not relevant (with reason)
4. Defer → keeps for later review

**Recommendations feed into the hypothesis system, creating a structured testing pipeline from insight to execution.**`,
  },
  {
    id: 'hypotheses',
    title: 'Hypotheses — Testing Framework',
    icon: Lightbulb,
    content: `The **Hypotheses** page manages your testing ideas and validates them through structured experiments.

**Creating a hypothesis:**
1. Click "New Hypothesis"
2. Define:
   - **Title**: Clear, testable statement
   - **Description**: What you expect to happen and why
   - **Type**: Budget, targeting, creative, bid, etc.
   - **Expected Impact**: Quantify the expected improvement
3. Link to a recommendation (optional)

**Hypothesis lifecycle:**
1. **Draft** — Initial idea, being refined
2. **Ready** — Validated and ready for testing
3. **Testing** — Active experiment running
4. **Validated** — Results confirm the hypothesis
5. **Invalidated** — Results disprove the hypothesis
6. **Archived** — No longer relevant

**Best practices:**
- One variable per hypothesis (don't test multiple changes simultaneously)
- Set clear success criteria before starting the test
- Run tests for a statistically significant duration (usually 7-14 days)
- Document learnings regardless of outcome`,
  },
  {
    id: 'drafts',
    title: 'Campaign Drafts — Building Campaigns',
    icon: FileStack,
    content: `**Campaign Drafts** is where you build and configure campaigns before launching them.

**Creating a draft:**
1. Click "New Draft"
2. Select client and platform
3. Configure campaign settings:
   - **Campaign Name**: Descriptive name for the campaign
   - **Objective**: Conversions, Traffic, Awareness, etc.
   - **Budget**: Total budget and distribution mode (daily/lifetime)
   - **Bid Strategy**: Lowest cost, cost cap, bid cap, etc.
   - **Buying Type**: Auction or Reach & Frequency
4. Add ad sets with targeting configuration
5. Add ads with creative assets

**Draft validation:**
- Drafts are automatically validated against platform requirements
- Validation checks: budget limits, targeting completeness, creative specs
- Errors are shown inline with clear fix instructions

**Draft sources:**
- Manual creation
- From a recommendation
- From a hypothesis
- AI-generated (from analysis results)

**Once validated, drafts can be sent for approval and then launched to the ad platform.**`,
  },
  {
    id: 'creatives',
    title: 'Creatives — Asset Library',
    icon: ImageIcon,
    content: `The **Creatives** page is your centralized library for all advertising assets.

**Supported asset types:**
- Images (JPG, PNG, WebP)
- Videos (MP4, MOV)
- External URLs (hosted media)
- Text-only references

**Managing creatives:**
- Upload new assets with drag-and-drop
- Tag assets for easy filtering
- Link assets to specific clients
- Track which ads use each creative
- Archive outdated assets

**Creative best practices:**
- Use consistent naming conventions
- Tag assets by campaign, theme, and format
- Regularly audit asset performance
- Archive low-performing creatives`,
  },
  {
    id: 'executions',
    title: 'Executions — Launch & Monitor',
    icon: Rocket,
    content: `The **Executions** page manages campaign launches and tracks their status.

**Launch workflow:**
1. Select an approved campaign draft
2. Review the launch preview (what will be created on the platform)
3. Confirm the launch
4. Monitor the execution status

**Execution statuses:**
- **Pending** — Waiting for approval
- **Approved** — Ready to launch
- **Launching** — Being pushed to the ad platform
- **Active** — Successfully launched and running
- **Failed** — Launch failed (check error details)
- **Paused** — Manually paused after launch

**Post-launch monitoring:**
- Performance snapshots are synced automatically
- Compare actual vs expected performance
- AI recommendations update based on live data`,
  },
  {
    id: 'intelligence',
    title: 'Intelligence — Market Insights',
    icon: Brain,
    content: `The **Intelligence** page provides AI-powered market and competitive insights.

**Available intelligence:**
- Performance benchmarking against industry standards
- Trend analysis for your advertising vertical
- Seasonal patterns and planning insights
- Cross-client performance comparisons (anonymized)

**How to use intelligence data:**
- Use benchmarks to set realistic KPI targets
- Identify seasonal opportunities before competitors
- Spot emerging trends in ad creative formats
- Compare client performance against peer group`,
  },
  {
    id: 'optimization',
    title: 'Optimization — Automated Actions',
    icon: Zap,
    content: `The **Optimization** page manages automated optimization actions on live campaigns.

**Optimization action types:**
- **Pause** — Stop underperforming ads/adsets
- **Budget adjust** — Increase/decrease budgets based on performance
- **Bid adjust** — Modify bid amounts or strategy
- **Schedule change** — Adjust ad scheduling
- **Status change** — Enable/disable campaign elements

**Action workflow:**
1. AI or presets generate optimization proposals
2. Each action shows rationale and expected impact
3. Review and approve (or reject with reason)
4. Approved actions execute via the ad platform API
5. Results are logged and tracked

**Safety features:**
- All actions require explicit approval (no auto-execution by default)
- Maximum budget change limits prevent runaway spending
- Cooldown periods between consecutive optimizations
- Full audit trail of every action taken`,
  },
  {
    id: 'presets',
    title: 'Presets — Automation Rules',
    icon: Settings,
    content: `**Presets** define reusable optimization rules that trigger automatically.

**Creating a preset:**
1. Click "New Preset"
2. Define the rule condition:
   - **No impressions** — Campaign has no impressions after X hours
   - **High spend no leads** — Spend exceeds threshold with zero leads
   - **Low CTR** — CTR below threshold with minimum impressions
   - **High CPC** — CPC exceeds threshold with minimum clicks
3. Set the proposed action (pause, budget adjust, etc.)
4. Set priority level (high, medium, low)
5. Activate the preset

**How presets work:**
- Presets scan campaign data periodically
- When conditions are met, they generate optimization actions
- Actions still require manual approval unless auto-execute is enabled
- Trigger count and last triggered time are tracked

**Preset examples:**
- "Pause ads with 0 leads after $50 spend" — catches non-converting ads
- "Alert if CTR < 0.5% after 1000 impressions" — flags poor creatives
- "Reduce budget if CPC > $5 after 100 clicks" — controls costs`,
  },
  {
    id: 'client-report',
    title: 'Client Report — Shareable Performance Reports',
    icon: Users,
    content: `The **Client Report** page generates client-facing performance summaries.

**Report contents:**
- Key performance metrics (spend, leads, CPC, CTR, ROAS)
- Performance trends over the selected period
- Campaign-level breakdown
- AI-generated insights and recommendations (client-safe language)
- Next steps and planned optimizations

**Generating a report:**
1. Select the client
2. Choose the reporting period
3. Review and customize the content
4. Export as PDF or share via the client portal

**Best practices:**
- Generate reports weekly or bi-weekly for active clients
- Highlight wins and improvements, not just raw data
- Include actionable next steps
- Use the client portal for self-service report access`,
  },
  {
    id: 'quickstart',
    title: 'Quick Start — Get Running in 10 Minutes',
    icon: Target,
    content: `**Step-by-step setup:**

1. **Connect an ad account**
   - Go to Ad Accounts → Connect Account
   - Link your Meta/Google/TikTok ad account

2. **Wait for initial sync**
   - Data syncs automatically (may take a few minutes)
   - Check Sync Monitor for progress

3. **Run your first analysis**
   - Go to AI Analysis
   - Select client and run a "Performance Review"
   - Review the AI-generated insights

4. **Review recommendations**
   - Go to Recommendations
   - Accept high-priority items
   - These create hypotheses automatically

5. **Create a campaign draft**
   - Go to Campaign Drafts → New Draft
   - Configure based on the recommendation
   - Validate and submit for approval

6. **Set up optimization presets**
   - Go to Presets
   - Enable the default "No leads after $50 spend" rule
   - Customize thresholds for your clients

7. **Generate a client report**
   - Go to Client Report
   - Select client and period
   - Export or share via portal

**You're now running an AI-powered advertising operation!**`,
  },
];

export default function AiAdsGuidePage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[hsl(270,70%,55%)]" /> AI Ads Copilot Guide
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete documentation for using AI-powered advertising management
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Analyze', desc: 'AI performance review', icon: BrainCircuit },
          { label: 'Recommend', desc: 'Smart suggestions', icon: TrendingUp },
          { label: 'Build', desc: 'Campaign drafts', icon: FileStack },
          { label: 'Optimize', desc: 'Auto-actions', icon: Zap },
        ].map(item => (
          <Card key={item.label} className="text-center">
            <CardContent className="pt-4 pb-3 px-3">
              <item.icon className="h-6 w-6 mx-auto text-[hsl(270,70%,55%)] mb-1.5" />
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
                <section.icon className="h-4 w-4 text-[hsl(270,70%,55%)]" />
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
