import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Upload, File, X, AlertCircle, Rocket } from 'lucide-react';
import { toast } from 'sonner';

interface StepField { key: string; label: string; type: string; required: boolean; }
interface FlowStep { id: string; title: string; description: string; fields: StepField[]; }
interface UploadedFile { path: string; name: string; size: number; mime_type: string; uploaded_at: string; }

/**
 * Client-facing onboarding portal.
 * Accessed via /embed/onboarding/:token — no auth required.
 * Token validated against gos_onboarding_tokens table.
 */
export default function EmbedOnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [flow, setFlow] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');

  const loadSession = useCallback(async () => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('gos_onboarding_tokens')
      .select('session_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) { setError('Invalid or expired link'); setLoading(false); return; }
    if (new Date(tokenData.expires_at) < new Date()) { setError('This link has expired'); setLoading(false); return; }

    // Load session — no join to clients table (anon user has no access to clients)
    const { data: sess, error: sessError } = await supabase
      .from('gos_onboarding_sessions')
      .select('*')
      .eq('id', tokenData.session_id)
      .single();

    if (sessError || !sess) { setError('Session not found'); setLoading(false); return; }

    // Client name not available to anon users — skip

    if (sess.status === 'completed') {
      setSession(sess);
      setCompleted(true);
      setLoading(false);
      return;
    }

    if (sess.flow_id) {
      const { data: flowData } = await supabase
        .from('gos_onboarding_flows')
        .select('*')
        .eq('id', sess.flow_id)
        .single();
      setFlow(flowData);
    }

    setSession(sess);
    setFormData((typeof sess.data === 'object' && sess.data !== null && !Array.isArray(sess.data)) ? sess.data as Record<string, any> : {});
    setLoading(false);
  }, [token]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const steps: FlowStep[] = flow?.steps || [];
  const currentStep = session?.current_step || 0;
  const totalSteps = steps.length;
  const step = steps[currentStep];
  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  const updateField = (key: string, value: any) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleFileUpload = async (fieldKey: string, file: globalThis.File) => {
    if (!session) return;
    const clientId = session.client_id || 'unknown';
    const filePath = `${clientId}/${session.id}/${fieldKey}/${file.name}`;
    setUploading(fieldKey);
    try {
      const { error: uploadError } = await supabase.storage
        .from('gos-onboarding-files')
        .upload(filePath, file, { upsert: true });
      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); return; }
      updateField(fieldKey, { path: filePath, name: file.name, size: file.size, mime_type: file.type, uploaded_at: new Date().toISOString() });
      toast.success(`${file.name} uploaded`);
    } catch { toast.error('Upload failed'); } finally { setUploading(null); }
  };

  const removeFile = async (fieldKey: string) => {
    const fileInfo = formData[fieldKey] as UploadedFile | undefined;
    if (fileInfo?.path) await supabase.storage.from('gos-onboarding-files').remove([fileInfo.path]);
    updateField(fieldKey, null);
  };

  const validateCurrentStep = (): string[] => {
    if (!step) return [];
    const errors: string[] = [];
    for (const field of step.fields || []) {
      if (field.required) {
        const val = formData[field.key];
        if (field.type === 'file') {
          if (!val || !val.path) errors.push(`${field.label} is required`);
        } else if (val === undefined || val === null || String(val).trim() === '') {
          errors.push(`${field.label} is required`);
        }
      }
    }
    return errors;
  };

  const saveProgress = async (nextStep: number, status = 'in_progress', markComplete = false) => {
    if (!session) return false;
    setSaving(true);
    const update: any = { current_step: nextStep, data: formData, status, updated_at: new Date().toISOString() };
    if (markComplete) update.completed_at = new Date().toISOString();
    const { error } = await supabase.from('gos_onboarding_sessions').update(update).eq('id', session.id);
    setSaving(false);
    if (error) { toast.error('Failed to save'); return false; }
    setSession((prev: any) => ({ ...prev, ...update }));
    return true;
  };

  const handleNext = async () => {
    const errors = validateCurrentStep();
    if (errors.length > 0) { toast.error(errors[0]); return; }
    if (currentStep >= totalSteps - 1) {
      const ok = await saveProgress(currentStep, 'completed', true);
      if (ok) { setCompleted(true); toast.success('Onboarding completed!'); }
    } else {
      await saveProgress(currentStep + 1);
    }
  };

  const handleBack = async () => { if (currentStep > 0) await saveProgress(currentStep - 1); };
  const handleSaveDraft = async () => { await saveProgress(currentStep); toast.success('Progress saved'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center"><AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">{error}</p></div>
    </div>
  );

  if (completed) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="border-emerald-500/30 bg-emerald-500/5 max-w-lg w-full">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-400 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Onboarding Complete!</h2>
          <p className="text-sm text-muted-foreground">Thank you{clientName ? `, ${clientName}` : ''}. Your information has been saved.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (!step) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">No steps defined for this onboarding flow.</p>
    </div>
  );

  const renderField = (field: StepField) => {
    const value = formData[field.key];
    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="flex items-center gap-3">
          <Checkbox checked={!!value} onCheckedChange={checked => updateField(field.key, !!checked)} />
          <label className="text-sm text-foreground">{field.label}</label>
          {field.required && <span className="text-destructive text-xs">*</span>}
        </div>
      );
    }
    if (field.type === 'file') {
      const fileInfo = value as UploadedFile | null;
      const isUp = uploading === field.key;
      return (
        <div key={field.key}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label} {field.required && <span className="text-destructive">*</span>}</label>
          {fileInfo?.path ? (
            <div className="rounded-lg border border-border p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0"><File className="h-4 w-4 text-primary flex-shrink-0" /><div className="min-w-0"><p className="text-sm text-foreground truncate">{fileInfo.name}</p><p className="text-[10px] text-muted-foreground">{(fileInfo.size / 1024).toFixed(1)} KB</p></div></div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFile(field.key)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          ) : (
            <label className="rounded-lg border border-dashed border-border p-4 text-center block cursor-pointer hover:border-primary/50 transition-colors">
              {isUp ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" /> : <><Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" /><p className="text-xs text-muted-foreground">Click to upload (max 10MB)</p></>}
              <input type="file" className="hidden" disabled={isUp} onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 10485760) { toast.error('File too large'); return; } handleFileUpload(field.key, f); }}} />
            </label>
          )}
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label} {field.required && <span className="text-destructive">*</span>}</label>
        <Input type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text'} value={String(value ?? '')} onChange={e => updateField(field.key, e.target.value)} placeholder={field.label} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[hsl(160,70%,40%)] to-[hsl(200,80%,45%)]">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{flow?.name || 'Onboarding'}</h1>
            {clientName && <p className="text-xs text-muted-foreground">{clientName}</p>}
          </div>
          <div className="ml-auto"><Badge variant="outline" className="text-xs">Step {currentStep + 1} of {totalSteps}</Badge></div>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
              {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
            </div>
            <div className="space-y-4">{(step.fields || []).map(renderField)}</div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0 || saving} className="gap-1.5"><ChevronLeft className="h-4 w-4" /> Back</Button>
          <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}</Button>
          <Button onClick={handleNext} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
            {currentStep < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
