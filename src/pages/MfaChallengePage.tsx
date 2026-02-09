import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm.png';
import { motion } from 'framer-motion';
import { Loader2, Shield } from 'lucide-react';

interface MfaChallengePageProps {
  onVerified: () => void;
  onCancel: () => void;
}

export default function MfaChallengePage({ onVerified, onCancel }: MfaChallengePageProps) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);

    try {
      // Get the user's verified TOTP factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      
      if (totpFactors.length === 0) {
        toast.error('No MFA factor found');
        setLoading(false);
        return;
      }

      const factorId = totpFactors[0].id;

      // Create challenge
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        toast.error(challengeError.message);
        setLoading(false);
        return;
      }

      // Verify
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (verifyError) {
        toast.error(verifyError.message);
        setCode('');
        setLoading(false);
        return;
      }

      onVerified();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-auto bg-primary/10 rounded-2xl p-3 flex items-center justify-center">
              <img src={logoAfm} alt="AFM DIGITAL" className="h-10 w-auto invert dark:invert-0" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('profile.mfa')}</h1>
          <p className="text-muted-foreground mt-1">{t('profile.mfaEnterCode')}</p>
        </div>

        <Card className="glass-card-elevated">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('profile.mfa')}</CardTitle>
            </div>
            <CardDescription>{t('profile.mfaEnterCode')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>TOTP Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="font-mono text-center text-2xl tracking-[0.5em]"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) handleVerify(); }}
              />
            </div>
            <Button onClick={handleVerify} disabled={loading || code.length !== 6} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('common.confirm')
              )}
            </Button>
            <Button variant="ghost" onClick={onCancel} className="w-full text-muted-foreground">
              {t('auth.logout')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
