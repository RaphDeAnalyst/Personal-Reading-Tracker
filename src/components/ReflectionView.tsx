import { useState, useEffect, FormEvent } from 'react';
import { Book } from '../types';

interface ReflectionViewProps {
  bookId: number;
  onBack: () => void;
  onComplete: (bookId: number) => void;
}

export default function ReflectionView({ bookId, onBack, onComplete }: ReflectionViewProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [reflection, setReflection] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(setBook);
  }, [bookId]);

  const handleSaveReflection = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reflection, rating })
      });
      if (res.ok) {
        // Implicitly mark as completed when reflecting at the end
        await fetch(`/api/books/${bookId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' })
        });
        onComplete(bookId);
      }
    } catch (e) {
      console.error("Reflection save error", e);
    } finally {
      setLoading(false);
    }
  };

  if (!book) return <div className="text-center font-serif py-20 italic">Preparing your reflection sanctuary...</div>;

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 md:px-0 scroll-mt-24">
      <div className="mb-16">
        <button onClick={onBack} className="flex items-center gap-2 group text-on-surface-variant hover:text-on-surface transition-colors mb-8">
          <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span className="font-label text-xs uppercase tracking-[0.15em] font-semibold">Volume Record</span>
        </button>
        <h2 className="serif-text text-5xl text-on-surface mb-4 leading-tight">Wisdom Reflection</h2>
        <p className="font-label text-sm text-on-surface-variant italic max-w-md">Distill your thoughts and feelings about this journey. What remains with you?</p>
      </div>

      <form onSubmit={handleSaveReflection} className="space-y-16">
        <div className="space-y-12">
          <div className="group">
            <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant block mb-6">Archive Insights</span>
            <textarea 
              required
              rows={8}
              placeholder="Record your final synthesis of this work..."
              className="w-full bg-surface-container-low/30 border border-outline-variant/10 rounded-2xl p-8 serif-text text-2xl italic leading-relaxed placeholder:text-outline-variant/20 focus:bg-background transition-all outline-none resize-none"
              value={reflection}
              onChange={e => setReflection(e.target.value)}
            />
          </div>

          <div>
             <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant block mb-10 text-center">Inherent Value Scale</span>
             <div className="flex justify-center gap-6">
               {[1, 2, 3, 4, 5].map((s) => (
                 <button 
                   key={s}
                   type="button"
                   onClick={() => setRating(s)}
                   className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${rating >= s ? 'bg-primary text-on-primary shadow-lg scale-110' : 'bg-surface-container-high text-outline-variant hover:bg-surface-container-highest'}`}
                 >
                   <span className="material-symbols-outlined text-lg">{rating >= s ? 'star' : 'star_outline'}</span>
                 </button>
               ))}
             </div>
             <p className="text-center font-label text-[10px] uppercase tracking-widest text-outline-variant mt-6 italic">Current Rating: {rating} stars</p>
          </div>
        </div>

        <div className="pt-8 flex flex-col items-center gap-8 border-t border-outline-variant/5">
          <button 
            type="submit"
            disabled={loading}
            className="w-full max-w-xs py-5 bg-primary text-on-primary rounded-xl font-label text-sm uppercase tracking-[0.2em] font-bold hover:bg-primary-dim transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-4 group"
          >
            {loading ? 'Archiving...' : (
              <>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:rotate-12">auto_awesome</span>
                Finalize Record
              </>
            )}
          </button>
          <p className="font-label text-[11px] text-on-surface-variant/70 italic text-center max-w-xs">By finalizing, this volume will be added to your permanent archives.</p>
        </div>
      </form>
    </div>
  );
}
