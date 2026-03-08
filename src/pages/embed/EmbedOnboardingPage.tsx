import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Upload, File, X, AlertCircle, Rocket, Save } from 'lucide-react';
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
  const [clientLabel, setClientLabel] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadSession = useCallback(async () => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }

    // Validate token — also check revoked_at
    const { data: tokenData, error: tokenError } = await supabase
      .from('gos_onboarding_tokens')
      .select('session_id, expires_at, revoked_at, client_label')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) { setError('Invalid or expired link'); setLoading(false); return; }
    if (tokenData.revoked_at) { setError('This link has been revoked'); setLoading(false); return; }
    if (new Date(tokenData.expires_at) < new Date()) { setError('This link has expired'); setLoading(false); return; }

    if (tokenData.client_label) setClientLabel(tokenData.client_label);

    // Load session
    const { data: sess, error: sessError } = await supabase
      .from('gos_onboarding_sessions')
      .select('*')
      .eq('id', tokenData.session_id)
      .single();

    if (sessError || !sess) { setError('Session not found'); setLoading(false); return; }

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
  const progressPercent = totalSteps > 0 ? ((currentStep + (completed ? 1 : 0)) / totalSteps) * 100 : 0;

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

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

  const validateCurrentStep = (): Record<string, string> => {
    if (!step) return {};
    const errors: Record<string, string> = {};
    for (const field of step.fields || []) {
      if (field.required) {
        const val = formData[field.key];
        if (field.type === 'file') {
          if (!val || !val.path) errors[field.key] = `${field.label} is required`;
        } else if (val === undefined || val === null || String(val).trim() === '') {
          errors[field.key] = `${field.label} is required`;
        }
      }
      // Basic email validation
      if (field.type === 'email' && formData[field.key]) {
        const emailVal = String(formData[field.key]).trim();
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          errors[field.key] = 'Please enter a valid email';
        }
      }
      // Basic URL validation
      if (field.type === 'url' && formData[field.key]) {
        const urlVal = String(formData[field.key]).trim();
        if (urlVal && !/^https?:\/\/.+/i.test(urlVal)) {
          errors[field.key] = 'Please enter a valid URL (https://...)';
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
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); toast.error('Please fill in all required fields'); return; }
    if (currentStep >= totalSteps - 1) {
      const ok = await saveProgress(currentStep, 'completed', true);
      if (ok) { setCompleted(true); toast.success('Onboarding completed!'); }
    } else {
      await saveProgress(currentStep + 1);
    }
  };

  const handleBack = async () => { if (currentStep > 0) await saveProgress(currentStep - 1); };
  const handleSaveDraft = async () => { await saveProgress(currentStep); toast.success('Progress saved'); };

  // --- Render states ---

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your onboarding...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Unable to Access</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground/60 mt-4">If you believe this is an error, please contact your account manager.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (completed) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="border-emerald-500/30 bg-emerald-500/5 max-w-lg w-full">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">All Done!</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Thank you{clientLabel ? `, ${clientLabel}` : ''}! Your onboarding information has been saved successfully. Our team will review it shortly.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-6">You can safely close this page.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (!step) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <p className="text-muted-foreground text-sm">No steps defined for this onboarding flow.</p>
    </div>
  );

  const renderField = (field: StepField) => {
    const value = formData[field.key];
    const hasError = !!fieldErrors[field.key];
    
    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="flex items-start gap-3 py-1">
          <Checkbox checked={!!value} onCheckedChange={checked => updateField(field.key, !!checked)} className="mt-0.5" />
          <div>
            <label className="text-sm text-foreground leading-tight">{field.label}</label>
            {field.required && <span className="text-destructive text-xs ml-1">*</span>}
          </div>
        </div>
      );
    }
    if (field.type === 'file') {
      const fileInfo = value as UploadedFile | null;
      const isUp = uploading === field.key;
      return (
        <div key={field.key}>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </label>
          {fileInfo?.path ? (
            <div className={`rounded-lg border p-3 flex items-center justify-between ${hasError ? 'border-destructive' : 'border-border'}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <File className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{fileInfo.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(fileInfo.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFile(field.key)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          ) : (
            <label className={`rounded-lg border-2 border-dashed p-6 text-center block cursor-pointer hover:border-primary/50 transition-colors ${hasError ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
              {isUp ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Click to upload</p>
                  <p className="text-[10px] text-muted-foreground/60">Max 10MB</p>
                </div>
              )}
              <input type="file" className="hidden" disabled={isUp} onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 10485760) { toast.error('File too large (max 10MB)'); return; } handleFileUpload(field.key, f); }}} />
            </label>
          )}
          {hasError && <p className="text-xs text-destructive mt-1">{fieldErrors[field.key]}</p>}
        </div>
      );
    }
    return (
      <div key={field.key}>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          {field.label} {field.required && <span className="text-destructive">*</span>}
        </label>
        <Input 
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text'} 
          value={String(value ?? '')} 
          onChange={e => updateField(field.key, e.target.value)} 
          placeholder={field.label}
          className={hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
        {hasError && <p className="text-xs text-destructive mt-1">{fieldErrors[field.key]}</p>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/70 shadow-lg">
            <Rocket className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground truncate">{flow?.name || 'Onboarding'}</h1>
            {clientLabel && <p className="text-xs text-muted-foreground truncate">{clientLabel}</p>}
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">Step {currentStep + 1} of {totalSteps}</Badge>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
            {steps.map((s, i) => (
              <span key={i} className={i <= currentStep ? 'text-primary font-medium' : ''}>
                {i < currentStep ? '✓' : i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Step Card */}
        <Card className="shadow-sm">
          <CardContent className="p-5 md:p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
              {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
            </div>
            <div className="space-y-4">{(step.fields || []).map(renderField)}</div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0 || saving} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={saving} className="gap-1.5 text-muted-foreground">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </Button>
          <Button onClick={handleNext} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
            {currentStep < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40">Powered by Growth OS</p>
      </div>
    </div>
  );
}
