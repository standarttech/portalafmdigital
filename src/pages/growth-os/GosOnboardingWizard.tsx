import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface StepField {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

interface FlowStep {
  id: string;
  title: string;
  description: string;
  fields: StepField[];
}

export default function GosOnboardingWizard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [flow, setFlow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data: sess, error } = await supabase
      .from('gos_onboarding_sessions')
      .select('*, clients(name)')
      .eq('id', sessionId)
      .single();

    if (error || !sess) {
      toast.error('Session not found');
      navigate('/growth-os/onboarding');
      return;
    }

    if (sess.status === 'completed') {
      setSession(sess);
      setCompleted(true);
      setLoading(false);
      return;
    }

    // Load the flow
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
  }, [sessionId, navigate]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const steps: FlowStep[] = flow?.steps || [];
  const currentStep = session?.current_step || 0;
  const totalSteps = steps.length;
  const step = steps[currentStep];
  const progressPercent = totalSteps > 0 ? ((currentStep) / totalSteps) * 100 : 0;

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateCurrentStep = (): string[] => {
    if (!step) return [];
    const errors: string[] = [];
    for (const field of step.fields || []) {
      if (field.required) {
        const val = formData[field.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          errors.push(`${field.label} is required`);
        }
      }
    }
    return errors;
  };

  const saveProgress = async (nextStep: number, status: string = 'in_progress', markComplete: boolean = false) => {
    if (!session) return false;
    setSaving(true);
    const update: any = {
      current_step: nextStep,
      data: formData,
      status,
      updated_at: new Date().toISOString(),
    };
    if (markComplete) {
      update.completed_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('gos_onboarding_sessions')
      .update(update)
      .eq('id', session.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save progress');
      return false;
    }
    setSession((prev: any) => ({ ...prev, ...update }));
    return true;
  };

  const handleNext = async () => {
    const errors = validateCurrentStep();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    if (currentStep >= totalSteps - 1) {
      // Last step — complete
      const ok = await saveProgress(currentStep, 'completed', true);
      if (ok) {
        setCompleted(true);
        toast.success('Onboarding completed!');
      }
    } else {
      await saveProgress(currentStep + 1);
    }
  };

  const handleBack = async () => {
    if (currentStep > 0) {
      await saveProgress(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    await saveProgress(currentStep);
    toast.success('Progress saved');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-400 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Onboarding Complete!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Client: {(session as any)?.clients?.name || 'Unknown'}
            </p>
            {session?.completed_at && (
              <p className="text-xs text-muted-foreground">
                Completed on {new Date(session.completed_at).toLocaleDateString()}
              </p>
            )}
            <Button className="mt-6" onClick={() => navigate('/growth-os/onboarding')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Onboarding
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No steps defined in this flow.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/growth-os/onboarding')}>Back</Button>
      </div>
    );
  }

  const renderField = (field: StepField) => {
    const value = formData[field.key] ?? '';

    if (field.type === 'checkbox') {
      return (
        <div key={field.key} className="flex items-center gap-3">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => updateField(field.key, !!checked)}
          />
          <label className="text-sm text-foreground">{field.label}</label>
          {field.required && <span className="text-destructive text-xs">*</span>}
        </div>
      );
    }

    if (field.type === 'file') {
      return (
        <div key={field.key}>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </label>
          <div className="rounded-lg border border-dashed border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">File upload not yet supported. Use URL field instead.</p>
          </div>
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          {field.label} {field.required && <span className="text-destructive">*</span>}
        </label>
        <Input
          type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : field.type === 'url' ? 'url' : 'text'}
          value={String(value)}
          onChange={(e) => updateField(field.key, e.target.value)}
          placeholder={field.label}
        />
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/growth-os/onboarding')} className="gap-1.5 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-lg font-bold text-foreground">
            {flow?.name || 'Onboarding'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Client: {(session as any)?.clients?.name || 'Unknown'}
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Step {currentStep + 1} of {totalSteps}
        </Badge>
      </div>

      {/* Progress */}
      <Progress value={progressPercent} className="h-2" />

      {/* Step Content */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
            {step.description && <p className="text-sm text-muted-foreground mt-1">{step.description}</p>}
          </div>

          <div className="space-y-4">
            {(step.fields || []).map(renderField)}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || saving}
          className="gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>

        <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Draft'}
        </Button>

        <Button
          onClick={handleNext}
          disabled={saving}
          className="gap-1.5"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {currentStep >= totalSteps - 1 ? 'Complete' : 'Next'}
          {currentStep < totalSteps - 1 && <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
