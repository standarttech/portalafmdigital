import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm-new.png';
import { motion } from 'framer-motion';
import { Loader2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthLanguageSwitcher from '@/components/auth/AuthLanguageSwitcher';

export default function AuthPage() {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error(t('auth.invalidEmail'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(t('auth.loginError'));
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <AuthLanguageSwitcher />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img src={logoAfm} alt="AFM DIGITAL" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('auth.loginTitle')}</h1>
          <p className="text-muted-foreground mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">{t('auth.login')}</CardTitle>
            <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  t('auth.login')
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-center text-sm text-muted-foreground mb-3">
                {t('auth.noAccountYet')}
              </p>
              <Link to="/request-access">
                <Button variant="outline" className="w-full gap-2">
                  <Mail className="h-4 w-4" />
                  {t('auth.requestAccess')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
