import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Instagram, Facebook, Phone, Mail, MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoAfm from '@/assets/logo-afm-new.png';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollToTop from '@/components/website/ScrollToTop';
import { WebsiteLangProvider, useWebsiteLang } from '@/i18n/WebsiteLangContext';
import type { WebsiteLang } from '@/i18n/websiteTranslations';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const langs: { code: WebsiteLang; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useWebsiteLang();
  const current = langs.find(l => l.code === lang)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn('flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm', className)}>
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{lang}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[hsl(228,30%,10%)] border-white/10">
        {langs.map(l => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}
            className={cn('text-white/70 hover:text-white focus:text-white focus:bg-white/10', lang === l.code && 'text-[hsl(42,87%,55%)]')}>
            {l.flag} {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { t } = useWebsiteLang();

  const navLinks = [
    { label: t('nav.home'), path: '/home' },
    { label: t('nav.about'), path: '/about' },
    { label: t('nav.services'), path: '/services' },
    { label: t('nav.caseStudies'), path: '/case-studies' },
    { label: t('nav.contact'), path: '/contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[hsl(228,30%,6%)]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <img src={logoAfm} alt="AFM Digital" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
          <div className="flex flex-col">
            <span className="font-bold text-white text-xs sm:text-sm tracking-[0.2em]">AFM</span>
            <span className="text-[9px] sm:text-[10px] tracking-[0.25em] text-[hsl(42,87%,55%)] font-medium -mt-0.5">DIGITAL</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map(l => (
            <Link key={l.path} to={l.path}
              className={cn(
                'text-sm font-medium transition-colors',
                location.pathname === l.path ? 'text-[hsl(42,87%,55%)]' : 'text-white/70 hover:text-white'
              )}>
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2">
            <a href="https://www.instagram.com/digital.afm/" target="_blank" rel="noopener noreferrer"
              className="text-white/50 hover:text-[hsl(42,87%,55%)] transition-colors">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="https://www.facebook.com/people/AFM-Digital-Agency/61567471285327/" target="_blank" rel="noopener noreferrer"
              className="text-white/50 hover:text-[hsl(42,87%,55%)] transition-colors">
              <Facebook className="h-4 w-4" />
            </a>
          </div>
          <LanguageSwitcher />
          <a href="https://app.afmdigital.com" target="_blank" rel="noopener noreferrer"
            className="px-5 py-2 rounded-lg bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] text-sm font-bold hover:bg-[hsl(42,87%,65%)] transition-colors">
            {t('nav.clientPortal')}
          </a>
        </nav>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <LanguageSwitcher />
          <button onClick={() => setOpen(!open)} className="text-white p-1">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[hsl(228,30%,6%)] border-t border-white/5 overflow-hidden"
          >
            <div className="flex flex-col px-4 py-4 gap-1">
              {navLinks.map(l => (
                <Link key={l.path} to={l.path} onClick={() => setOpen(false)}
                  className={cn(
                    'text-sm font-medium py-2.5 px-3 rounded-lg transition-colors',
                    location.pathname === l.path ? 'text-[hsl(42,87%,55%)] bg-[hsl(42,87%,55%)]/5' : 'text-white/70 active:bg-white/5'
                  )}>
                  {l.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <a href="https://www.instagram.com/digital.afm/" target="_blank" rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="text-white/70 flex items-center gap-2 text-sm active:bg-white/5">
                  <Instagram className="h-4 w-4" /> Instagram
                </a>
                <a href="https://www.facebook.com/people/AFM-Digital-Agency/61567471285327/" target="_blank" rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="text-white/70 flex items-center gap-2 text-sm active:bg-white/5">
                  <Facebook className="h-4 w-4" /> Facebook
                </a>
              </div>
              <a href="https://app.afmdigital.com" target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="mt-2 px-5 py-2.5 rounded-lg bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] text-sm font-bold text-center">
                {t('nav.clientPortal')}
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  const { t } = useWebsiteLang();

  const navLinks = [
    { label: t('nav.home'), path: '/home' },
    { label: t('nav.about'), path: '/about' },
    { label: t('nav.services'), path: '/services' },
    { label: t('nav.caseStudies'), path: '/case-studies' },
    { label: t('nav.contact'), path: '/contact' },
  ];

  return (
    <footer className="bg-[hsl(228,30%,4%)] border-t border-white/5 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoAfm} alt="AFM Digital" className="h-8 w-8 object-contain" />
              <div>
                <span className="font-bold text-white tracking-[0.2em] text-sm">AFM</span>
                <span className="text-[hsl(42,87%,55%)] tracking-[0.25em] text-[10px] font-medium ml-1">DIGITAL</span>
              </div>
            </div>
            <p className="text-white/50 text-sm max-w-sm leading-relaxed mb-4">
              {t('footer.desc')}
            </p>
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/digital.afm/" target="_blank" rel="noopener noreferrer"
                className="text-white/50 hover:text-[hsl(42,87%,55%)] transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.facebook.com/people/AFM-Digital-Agency/61567471285327/" target="_blank" rel="noopener noreferrer"
                className="text-white/50 hover:text-[hsl(42,87%,55%)] transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t('footer.navigation')}</h4>
            <div className="flex flex-col gap-2">
              {navLinks.map(l => (
                <Link key={l.path} to={l.path} className="text-white/50 text-sm hover:text-[hsl(42,87%,55%)] transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>

          {/* Legal + Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t('footer.legal')}</h4>
            <div className="flex flex-col gap-2 text-white/50 text-sm">
              <Link to="/privacy" className="hover:text-[hsl(42,87%,55%)] transition-colors">{t('footer.privacy')}</Link>
              <Link to="/terms" className="hover:text-[hsl(42,87%,55%)] transition-colors">{t('footer.terms')}</Link>
              <Link to="/cookies" className="hover:text-[hsl(42,87%,55%)] transition-colors">{t('footer.cookies')}</Link>
            </div>
            <h4 className="text-white font-semibold text-sm mt-6 mb-2">{t('footer.platform')}</h4>
            <a href="https://app.afmdigital.com" target="_blank" rel="noopener noreferrer"
              className="text-white/50 text-sm hover:text-[hsl(42,87%,55%)] transition-colors">{t('nav.clientPortal')} →</a>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{t('footer.contactInfo')}</h4>
            <div className="flex flex-col gap-3 text-white/50 text-sm">
              <a href="tel:+13056459979" className="flex items-center gap-2 hover:text-[hsl(42,87%,55%)] transition-colors">
                <Phone className="h-4 w-4 shrink-0" /> +1 305 645-99-79
              </a>
              <a href="mailto:office@afmdigital.com" className="flex items-center gap-2 hover:text-[hsl(42,87%,55%)] transition-colors">
                <Mail className="h-4 w-4 shrink-0" /> office@afmdigital.com
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                <span>1100 Cleveland st,<br />Clearwater, FL 33755, USA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} AFM Digital. {t('footer.rights')}</p>
          <div className="flex gap-4 sm:gap-6">
            <Link to="/privacy" className="text-white/30 text-xs hover:text-white/60 transition-colors">{t('footer.privacy')}</Link>
            <Link to="/terms" className="text-white/30 text-xs hover:text-white/60 transition-colors">{t('footer.terms')}</Link>
            <Link to="/contact" className="text-white/30 text-xs hover:text-white/60 transition-colors">{t('footer.contactUs')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function WebsiteLayout() {
  return (
    <WebsiteLangProvider>
      <div className="min-h-screen bg-[hsl(228,30%,6%)] text-white">
        <ScrollToTop />
        <Navbar />
        <main className="pt-14 sm:pt-16">
          <Outlet />
        </main>
        <Footer />
      </div>
    </WebsiteLangProvider>
  );
}
