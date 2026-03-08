import { useLanguage } from '@/i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { FileCode2, FormInput, ClipboardCheck, Plug, GitBranch, ArrowRight } from 'lucide-react';
import type { TranslationKey } from '@/i18n/translations';

const modules = [
  { key: 'gos.landingTemplates' as TranslationKey, desc: 'gos.landingTemplatesDesc' as TranslationKey, icon: FileCode2, path: '/growth-os/landing-templates', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30', iconColor: 'text-blue-400' },
  { key: 'gos.formBuilder' as TranslationKey, desc: 'gos.formBuilderDesc' as TranslationKey, icon: FormInput, path: '/growth-os/forms', color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30', iconColor: 'text-violet-400' },
  { key: 'gos.onboarding' as TranslationKey, desc: 'gos.onboardingDesc' as TranslationKey, icon: ClipboardCheck, path: '/growth-os/onboarding', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30', iconColor: 'text-amber-400' },
  { key: 'gos.integrations' as TranslationKey, desc: 'gos.integrationsDesc' as TranslationKey, icon: Plug, path: '/growth-os/integrations', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30', iconColor: 'text-emerald-400' },
  { key: 'gos.leadRouting' as TranslationKey, desc: 'gos.leadRoutingDesc' as TranslationKey, icon: GitBranch, path: '/growth-os/lead-routing', color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30', iconColor: 'text-rose-400' },
];

export default function GosOverviewPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Growth OS</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('gos.overviewDesc' as TranslationKey)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map(mod => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.path}
              className={`cursor-pointer group bg-gradient-to-br ${mod.color} border hover:scale-[1.02] transition-all duration-200`}
              onClick={() => navigate(mod.path)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-background/50 ${mod.iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{t(mod.key)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{t(mod.desc)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
