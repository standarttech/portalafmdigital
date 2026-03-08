import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export default function EmbedFormPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    loadForm();
  }, [id]);

  const loadForm = async () => {
    const { data, error } = await supabase
      .from('gos_forms')
      .select('id, name, description, fields, status, settings, client_id')
      .eq('id', id!)
      .single();

    if (error || !data || (data.status !== 'published' && data.status !== 'active')) {
      setNotFound(true);
    } else {
      setForm(data);
      const initial: Record<string, any> = {};
      for (const field of (data.fields as unknown as FormField[]) || []) {
        initial[field.id] = field.type === 'checkbox' ? false : '';
      }
      setFormData(initial);
      // Write analytics: form_view
      supabase.from('gos_analytics_events').insert({
        event_type: 'form_view',
        entity_type: 'form',
        entity_id: data.id,
        client_id: data.client_id,
        referrer: document.referrer?.substring(0, 500) || null,
      }).then(() => {});
    }
    setLoading(false);
  };

  const validate = (): boolean => {
    const errors: string[] = [];
    const fields = (form?.fields || []) as FormField[];
    for (const field of fields) {
      if (field.required) {
        const val = formData[field.id];
        if (val === undefined || val === null || String(val).trim() === '' || val === false) {
          errors.push(`${field.label} is required`);
        }
      }
      if (field.type === 'email' && formData[field.id]) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData[field.id]))) {
          errors.push(`${field.label} must be a valid email`);
        }
      }
      if (field.type === 'url' && formData[field.id]) {
        try { new URL(String(formData[field.id])); } catch { errors.push(`${field.label} must be a valid URL`); }
      }
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !validate()) return;
    setSubmitting(true);
    setError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/gos-form-submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
          body: JSON.stringify({
            form_id: form.id,
            data: formData,
            source: 'embed',
            _hp_check: honeypot,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          setError('Too many submissions. Please try again later.');
        } else {
          setError(result.error || 'Submission failed');
          if (result.details) setValidationErrors(result.details);
        }
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (validationErrors.length > 0) setValidationErrors([]);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    switch (field.type) {
      case 'textarea':
        return <Textarea value={value || ''} onChange={e => updateField(field.id, e.target.value)} placeholder={field.placeholder} rows={3} className="bg-background" />;
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox checked={!!value} onCheckedChange={v => updateField(field.id, v)} />
            <span className="text-sm text-foreground">{field.label}</span>
          </div>
        );
      case 'select':
        return (
          <Select value={value || ''} onValueChange={v => updateField(field.id, v)}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
            <SelectContent>{(field.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
          </Select>
        );
      default:
        return <Input type={field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'} value={value || ''} onChange={e => updateField(field.id, e.target.value)} placeholder={field.placeholder} className="bg-background" />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (notFound) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center"><AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">This form is not available.</p></div></div>;
  if (submitted) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="text-center"><CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" /><h2 className="text-lg font-semibold text-foreground mb-1">Thank you!</h2><p className="text-sm text-muted-foreground">Your submission has been received.</p></div></div>;

  const fields = (form?.fields || []) as FormField[];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">{form?.name}</h1>
          {form?.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(field => (
            <div key={field.id}>
              {field.type !== 'checkbox' && (
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
                </label>
              )}
              {renderField(field)}
            </div>
          ))}
          {/* Honeypot field — hidden from real users, bots fill it */}
          <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
            <input type="text" name="_hp_check" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
          </div>
          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              {validationErrors.map((err, i) => <p key={i} className="text-xs text-destructive">{err}</p>)}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Submit
          </Button>
        </form>
      </div>
    </div>
  );
}
