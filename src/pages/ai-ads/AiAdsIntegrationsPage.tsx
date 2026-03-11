import PlatformIntegrationsPanel from '@/components/integrations/PlatformIntegrationsPanel';
import { Link2 } from 'lucide-react';

export default function AiAdsIntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage platform connections: Meta Ads Management, Freepik AI, and other services.
        </p>
      </div>
      <PlatformIntegrationsPanel />
    </div>
  );
}
