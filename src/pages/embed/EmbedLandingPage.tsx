import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

interface Section {
  type: string;
  config: Record<string, any>;
}

/**
 * Public embed page for GOS landing templates.
 * Renders a published landing template from gos_landing_templates.sections.
 * No auth required. Only published templates are rendered.
 */
export default function EmbedLandingPage() {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    loadTemplate();
  }, [id]);

  const loadTemplate = async () => {
    const { data, error } = await supabase
      .from('gos_landing_templates')
      .select('id, name, description, sections, settings, status')
      .eq('id', id!)
      .single();

    if (error || !data || data.status !== 'published') {
      setNotFound(true);
    } else {
      setTemplate(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">This page is not available.</p>
        </div>
      </div>
    );
  }

  const sections = (template?.sections || []) as Section[];

  return (
    <div className="min-h-screen bg-[#111] text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {sections.map((section, idx) => (
        <RenderSection key={idx} section={section} />
      ))}
    </div>
  );
}

function RenderSection({ section }: { section: Section }) {
  const { type, config } = section;

  switch (type) {
    case 'hero':
      return (
        <section
          className="py-16 px-5 text-center"
          style={{
            background: config.bg_image
              ? `url(${config.bg_image}) center/cover no-repeat, #111`
              : '#111',
          }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{config.headline || ''}</h1>
          <p className="text-lg text-gray-400 mb-6 max-w-2xl mx-auto">{config.subheadline || ''}</p>
          {config.cta && (
            <a
              href="#"
              className="inline-block px-8 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              {config.cta}
            </a>
          )}
        </section>
      );

    case 'features':
      return (
        <section className="py-12 px-5 bg-[#1a1a1a]">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {((config.items || []) as any[]).map((item, i) => (
              <div key={i} className="p-5 bg-[#222] rounded-xl">
                <h3 className="text-base font-semibold text-white mb-2">{item.title || ''}</h3>
                <p className="text-sm text-gray-400">{item.description || ''}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'testimonials':
      return (
        <section className="py-12 px-5 bg-[#111]">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Testimonials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {((config.items || []) as any[]).map((item, i) => (
              <div key={i} className="p-5 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <p className="text-sm text-gray-300 italic mb-3">"{item.text || ''}"</p>
                <p className="text-xs text-gray-500 font-medium">— {item.name || 'Anonymous'}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'pricing':
      return (
        <section className="py-12 px-5 bg-[#1a1a1a]">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {((config.plans || []) as any[]).map((plan, i) => (
              <div key={i} className="p-6 bg-[#222] rounded-xl text-center">
                <h3 className="text-lg font-bold text-white mb-2">{plan.name || ''}</h3>
                <p className="text-3xl font-bold text-emerald-400 mb-4">{plan.price || ''}</p>
              </div>
            ))}
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="py-12 px-5 bg-[#111] max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">FAQ</h2>
          <div className="space-y-3">
            {((config.items || []) as any[]).map((item, i) => (
              <details key={i} className="p-4 bg-[#1a1a1a] rounded-lg border border-gray-800">
                <summary className="cursor-pointer font-medium text-white text-sm">{item.question || ''}</summary>
                <p className="text-sm text-gray-400 mt-3">{item.answer || ''}</p>
              </details>
            ))}
          </div>
        </section>
      );

    case 'cta':
      return (
        <section className="py-14 px-5 text-center bg-emerald-700">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{config.text || ''}</h2>
          {config.button && (
            <a
              href={config.url || '#'}
              className="inline-block px-8 py-3 bg-white text-emerald-700 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              {config.button}
            </a>
          )}
        </section>
      );

    case 'form':
      if (config.form_id) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        return (
          <section className="py-12 px-5">
            {config.title && <h2 className="text-xl font-bold text-white text-center mb-6">{config.title}</h2>}
            <iframe
              src={`${origin}/embed/form/${config.form_id}`}
              className="w-full max-w-lg mx-auto border-0 rounded-lg"
              style={{ minHeight: '400px' }}
              title="Form"
            />
          </section>
        );
      }
      return null;

    case 'custom_html':
      return (
        <section
          className="py-8 px-5"
          dangerouslySetInnerHTML={{ __html: config.html || '' }}
        />
      );

    default:
      return (
        <section className="py-8 px-5 text-center text-gray-500">
          [{type}]
        </section>
      );
  }
}
