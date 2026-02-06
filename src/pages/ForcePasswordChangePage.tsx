import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm.png';
import { motion } from 'framer-motion';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';

interface ForcePasswordChangePageProps {
  onPasswordChanged: () => void;
}

export default function ForcePasswordChangePage({ onPasswordChanged }: ForcePasswordChangePageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordMismatch'));
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setIsLoading(false);
      toast.error(error.message);
      return;
    }

    // Clear force_password_change flag
    if (user) {
      await supabase
        .from('user_settings')
        .update({ force_password_change: false, temp_password_expires_at: null })
        .eq('user_id', user.id);
    }

    setIsLoading(false);
    toast.success(t('profile.passwordChanged'));
    onPasswordChanged();
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
          <div className="flex items-center justify-center gap-2 mb-2 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-xl font-bold text-foreground">{t('profile.forcePasswordChangeTitle')}</h1>
          </div>
          <p className="text-muted-foreground text-sm">{t('profile.forcePasswordChangeDesc')}</p>
        </div>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {t('profile.setNewPassword')}
            </CardTitle>
            <CardDescription>{t('profile.forcePasswordChangeHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('profile.newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('profile.updatePassword')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
