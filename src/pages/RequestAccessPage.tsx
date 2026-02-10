import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import logoAfm from '@/assets/logo-afm.png';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import AuthLanguageSwitcher from '@/components/auth/AuthLanguageSwitcher';

export default function RequestAccessPage() {
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      toast.error(t('auth.allFieldsRequired'));
      return;
    }

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast.error('Name must be 2-100 characters');
      return;
    }

    if (!trimmedEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || trimmedEmail.length > 255) {
      toast.error(t('auth.invalidEmail'));
      return;
    }

    if (message.length > 1000) {
      toast.error('Message must be less than 1000 characters');
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('access_requests')
      .insert({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim() || null,
      });

    setIsLoading(false);

    if (error) {
      toast.error(t('auth.requestError'));
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <AuthLanguageSwitcher />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t('auth.requestSent')}</h1>
          <p className="text-muted-foreground mb-6">{t('auth.requestSentDescription')}</p>
          <Link to="/auth">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('auth.backToLogin')}
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

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
            <div className="h-16 w-auto bg-primary/10 rounded-2xl p-3 flex items-center justify-center">
              <img src={logoAfm} alt="AFM DIGITAL" className="h-10 w-auto invert dark:invert-0" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{t('auth.requestAccess')}</h1>
          </div>
          <p className="text-muted-foreground">{t('auth.requestAccessSubtitle')}</p>
        </div>

        <Card className="glass-card-elevated">
          <CardHeader>
            <CardTitle className="text-lg">{t('auth.requestAccess')}</CardTitle>
            <CardDescription>{t('auth.requestAccessDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={fullName}
                   onChange={(e) => setFullName(e.target.value)}
                   required
                   maxLength={100}
                 />
              </div>
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
                <Label htmlFor="message">{t('auth.messageOptional')}</Label>
                <Textarea
                  id="message"
                  placeholder={t('auth.messagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                   rows={3}
                   maxLength={1000}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.sendRequest')
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                to="/auth"
                className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                {t('auth.backToLogin')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
