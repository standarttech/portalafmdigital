import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const schema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  company: z.string().max(200).optional(),
  website: z.string().max(500).optional(),
  budget: z.string().max(100).optional(),
  message: z.string().trim().min(1, 'Message is required').max(2000),
});

const budgetOptions = ['Under $5,000/mo', '$5,000 - $15,000/mo', '$15,000 - $50,000/mo', '$50,000 - $100,000/mo', '$100,000+/mo'];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', website: '', budget: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = schema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach(i => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('contact_requests' as any).insert([{
      name: form.name.trim(),
      email: form.email.trim(),
      company: form.company.trim(),
      website: form.website.trim(),
      budget: form.budget,
      message: form.message.trim(),
    }]);

    setSubmitting(false);
    if (!error) setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-[hsl(42,87%,55%)] mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Thank You!</h2>
          <p className="text-white/50">We've received your application. Our team will review it and get back to you within 24-48 hours.</p>
        </motion.div>
      </div>
    );
  }

  const inputClass = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[hsl(42,87%,55%)]/50 focus:ring-1 focus:ring-[hsl(42,87%,55%)]/30 transition-colors";

  return (
    <div>
      <section className="py-32 px-6 text-center">
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={0}
          className="text-[hsl(42,87%,55%)] text-sm font-semibold tracking-[0.3em] uppercase mb-4">Get Started</motion.p>
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold max-w-3xl mx-auto">
          Book a <span className="text-[hsl(42,87%,55%)]">Free Audit</span>
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
          className="text-white/50 text-lg max-w-xl mx-auto mt-6">
          Fill out the form below and our team will get in touch to discuss how we can scale your business.
        </motion.p>
      </section>

      <section className="pb-24 px-6">
        <motion.form initial="hidden" animate="visible" variants={fadeUp} custom={3}
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto bg-white/[0.03] border border-white/5 rounded-2xl p-8 sm:p-10 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Name *</label>
              <input className={inputClass} placeholder="Your name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Email *</label>
              <input className={inputClass} placeholder="your@email.com" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Company</label>
              <input className={inputClass} placeholder="Company name" value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <label className="text-white/60 text-xs font-medium mb-1.5 block">Website</label>
              <input className={inputClass} placeholder="https://yourwebsite.com" value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Monthly Ad Budget</label>
            <select className={inputClass + ' appearance-none'} value={form.budget}
              onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}>
              <option value="" className="bg-[hsl(228,30%,10%)]">Select a range</option>
              {budgetOptions.map(b => (
                <option key={b} value={b} className="bg-[hsl(228,30%,10%)]">{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium mb-1.5 block">Message *</label>
            <textarea className={inputClass + ' min-h-[120px] resize-none'} placeholder="Tell us about your business and goals..."
              value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message}</p>}
          </div>
          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[hsl(42,87%,55%)] text-[hsl(228,30%,6%)] font-bold hover:bg-[hsl(42,87%,65%)] transition-all disabled:opacity-60 hover:shadow-[0_0_30px_rgba(217,170,58,0.2)]">
            {submitting ? 'Submitting...' : <><Send className="h-4 w-4" /> Submit Application</>}
          </button>
        </motion.form>
      </section>
    </div>
  );
}
