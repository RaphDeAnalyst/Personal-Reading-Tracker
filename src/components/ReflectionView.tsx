import { useState, useEffect, FormEvent } from 'react';
import { ChevronLeft, Save, Sparkles } from 'lucide-react';
import { Reflection } from '../types';

interface ReflectionViewProps {
  bookId: number;
  onBack: () => void;
  onSave: () => void;
}

export default function ReflectionView({ bookId, onBack, onSave }: ReflectionViewProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    learning: '',
    application: '',
    disagreement: ''
  });

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(data => {
        if (data.reflection) {
          setFormData({
            learning: data.reflection.learning || '',
            application: data.reflection.application || '',
            disagreement: data.reflection.disagreement || ''
          });
        }
        setLoading(false);
      });
  }, [bookId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await fetch(`/api/books/${bookId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      onSave();
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20 font-mono text-sm opacity-50">LOADING FORM...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-muted hover:text-ink mb-10 transition-colors text-xs font-bold uppercase tracking-widest"
      >
        <ChevronLeft className="w-4 h-4" />
        Return to details
      </button>

      <div className="space-y-12">
        <div className="space-y-4">
          <h2 className="bold-title text-6xl">Reflection</h2>
          <p className="text-muted font-bold uppercase tracking-widest text-xs">Knowledge Synthesis // Operational Summary</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-12 pb-20">
          <div className="space-y-4">
            <label className="label-caps font-black text-ink">1. Core Intelligence</label>
            <p className="text-xs text-muted uppercase font-bold tracking-tight">Summarize the essential insights acquired.</p>
            <textarea 
              rows={4}
              value={formData.learning}
              onChange={e => setFormData({...formData, learning: e.target.value})}
              className="w-full text-xl font-serif italic py-4 bg-transparent border-b-2 border-line focus:border-accent outline-none transition-all resize-none placeholder:text-ink/10"
              placeholder="Record learnings..."
            />
          </div>

          <div className="space-y-4">
            <label className="label-caps font-black text-ink">2. Strategic Application</label>
            <p className="text-xs text-muted uppercase font-bold tracking-tight">Define the integration of knowledge into practice.</p>
            <textarea 
              rows={4}
              value={formData.application}
              onChange={e => setFormData({...formData, application: e.target.value})}
              className="w-full text-xl font-serif italic py-4 bg-transparent border-b-2 border-line focus:border-accent outline-none transition-all resize-none placeholder:text-ink/10"
              placeholder="Record applications..."
            />
          </div>

          <div className="space-y-4">
            <label className="label-caps font-black text-ink">3. Critical Counter-Point</label>
            <p className="text-xs text-muted uppercase font-bold tracking-tight">Identify points of divergence or theoretical flaws.</p>
            <textarea 
              rows={4}
              value={formData.disagreement}
              onChange={e => setFormData({...formData, disagreement: e.target.value})}
              className="w-full text-xl font-serif italic py-4 bg-transparent border-b-2 border-line focus:border-accent outline-none transition-all resize-none placeholder:text-ink/10"
              placeholder="Record disagreements..."
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-bg py-6 font-bold text-xs uppercase tracking-[3px] hover:opacity-80 transition-all disabled:opacity-50 mt-10"
          >
            {submitting ? 'COMMITTING...' : 'Commit to Persistent Memory'}
          </button>
        </form>
      </div>
    </div>
  );
}
