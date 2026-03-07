import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoAfm from '@/assets/logo-afm-new.png';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { label: 'Home', path: '/home' },
  { label: 'About', path: '/about' },
  { label: 'Services', path: '/services' },
  { label: 'Case Studies', path: '/case-studies' },
  { label: 'Contact', path: '/contact' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

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
          <a href="https://www.instagram.com/digital.afm/" target="_blank" rel="noopener noreferrer"
            className="text-white/50 hover:text-[hsl(42,87%,55%)] transition-colors">
            <Instagram className="h-4 w-4" />
          </a>
          <a href="https://app.afmdigital.com" target="_blank" rel="noopener noreferrer"
            className="px-5 py-2 rounded-lg bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] text-sm font-bold hover:bg-[hsl(42,87%,65%)] transition-colors">
            Client Portal
          </a>
        </nav>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-white p-1">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
              <a href="https://www.instagram.com/digital.afm/" target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="text-white/70 text-sm font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 active:bg-white/5">
                <Instagram className="h-4 w-4" /> Instagram
              </a>
              <a href="https://app.afmdigital.com" target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="mt-2 px-5 py-2.5 rounded-lg bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] text-sm font-bold text-center">
                Client Portal
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-[hsl(228,30%,4%)] border-t border-white/5 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img src={logoAfm} alt="AFM Digital" className="h-8 w-8 object-contain" />
              <div>
                <span className="font-bold text-white tracking-[0.2em] text-sm">AFM</span>
                <span className="text-[hsl(42,87%,55%)] tracking-[0.25em] text-[10px] font-medium ml-1">DIGITAL</span>
              </div>
            </div>
            <p className="text-white/50 text-sm max-w-sm leading-relaxed mb-4">
              Authorized partners of Meta, Google, and TikTok. We operate through exclusive whitelisted agency ad accounts — giving our clients privileges unavailable to regular advertisers.
            </p>
            <a href="https://www.instagram.com/digital.afm/" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white/50 text-sm hover:text-[hsl(42,87%,55%)] transition-colors">
              <Instagram className="h-4 w-4" /> @digital.afm
            </a>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Navigation</h4>
            <div className="flex flex-col gap-2">
              {navLinks.map(l => (
                <Link key={l.path} to={l.path} className="text-white/50 text-sm hover:text-[hsl(42,87%,55%)] transition-colors">{l.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
            <div className="flex flex-col gap-2 text-white/50 text-sm">
              <Link to="/privacy" className="hover:text-[hsl(42,87%,55%)] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[hsl(42,87%,55%)] transition-colors">Terms of Service</Link>
              <Link to="/cookies" className="hover:text-[hsl(42,87%,55%)] transition-colors">Cookie Policy</Link>
            </div>
            <h4 className="text-white font-semibold text-sm mt-6 mb-2">Platform</h4>
            <a href="https://app.afmdigital.com" target="_blank" rel="noopener noreferrer"
              className="text-white/50 text-sm hover:text-[hsl(42,87%,55%)] transition-colors">Client Portal →</a>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/30 text-xs">© {new Date().getFullYear()} AFM Digital. All rights reserved.</p>
          <div className="flex gap-4 sm:gap-6">
            <Link to="/privacy" className="text-white/30 text-xs hover:text-white/60 transition-colors">Privacy</Link>
            <Link to="/terms" className="text-white/30 text-xs hover:text-white/60 transition-colors">Terms</Link>
            <Link to="/contact" className="text-white/30 text-xs hover:text-white/60 transition-colors">Contact Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function WebsiteLayout() {
  return (
    <div className="min-h-screen bg-[hsl(228,30%,6%)] text-white">
      <Navbar />
      <main className="pt-14 sm:pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
