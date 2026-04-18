import { useState, useEffect, FormEvent } from 'react';
import { BookDetail } from '../types';

interface ReflectionViewProps {
  bookId: number;
  onBack: () => void;
  onComplete: (bookId: number) => void;
}

export default function ReflectionView({ bookId, onBack, onComplete }: ReflectionViewProps) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [learning, setLearning] = useState('');
  const [application, setApplication] = useState('');
  const [disagreement, setDisagreement] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(data => {
        setBookDetail(data);
        if (data.reflection) {
          setLearning(data.reflection.learning || '');
          setApplication(data.reflection.application || '');
          setDisagreement(data.reflection.disagreement || '');
        }
      });
  }, [bookId]);

  const handleSaveReflection = async (isCompleting: boolean) => {
    setLoading(true);
    try {
      // Combine for the general 'content' field if needed, but keeping separate columns is better.
      const content = `Learning: ${learning}\nApplication: ${application}\nDisagreement: ${disagreement}`;
      
      const res = await fetch(`/api/books/${bookId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          rating: 5, // Default rating 
          learning, 
          application, 
          disagreement 
        })
      });
      
      if (res.ok) {
        if (isCompleting) {
          await fetch(`/api/books/${bookId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'COMPLETED' })
          });
          onComplete(bookId);
        } else {
          // Just saving - go back or show some feedback?
          // The user's request says "added reflection should be shown" and "added and saved"
          onBack(); 
        }
      }
    } catch (error) {
      console.error("Reflection save error", error);
    } finally {
      setLoading(false);
    }
  };

  if (!bookDetail) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <main className="pt-12 pb-48 px-6 max-w-3xl mx-auto min-h-screen flex flex-col gap-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Context */}
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
            <span className="text-[10px] uppercase tracking-widest font-bold font-label">Deep Reading Session</span>
          </div>
        </div>
        <div>
          <h2 className="font-headline text-5xl md:text-6xl text-primary leading-tight">
            Current Reflections
          </h2>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] font-bold font-label text-outline italic">
            Keep it short and practical
          </p>
        </div>
        <p className="font-headline italic text-xl text-on-surface-variant max-w-xl border-l border-outline-variant/30 pl-6 py-1">
          Synthesizing the ideas of "{bookDetail.title}"
        </p>
      </header>

      {/* Reflection Prompts */}
      <div className="flex flex-col gap-28">
        {/* Prompt 1 */}
        <div className="relative group">
          <div className="flex flex-col gap-6">
            <label className="font-headline text-2xl text-primary flex items-center gap-4">
              <span className="text-tertiary opacity-40 italic">01.</span>
              What did I learn?
            </label>
            <div className="relative px-1">
              <textarea 
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl font-headline leading-relaxed text-on-surface placeholder:opacity-50 min-h-[140px] resize-none" 
                placeholder="Example: Discipline is more reliable than motivation"
                value={learning}
                onChange={e => setLearning(e.target.value)}
              />
              <div className="absolute -bottom-2 left-0 w-12 h-[1.5px] bg-outline-variant opacity-40 group-focus-within:w-full group-focus-within:bg-primary group-focus-within:opacity-60 transition-all duration-700 ease-in-out"></div>
            </div>
          </div>
        </div>

        {/* Prompt 2 */}
        <div className="relative group">
          <div className="flex flex-col gap-6">
            <label className="font-headline text-2xl text-primary flex items-center gap-4">
              <span className="text-tertiary opacity-40 italic">02.</span>
              What will I apply?
            </label>
            <div className="relative px-1">
              <textarea 
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl font-headline leading-relaxed text-on-surface placeholder:opacity-50 min-h-[140px] resize-none" 
                placeholder="Example: I will read 10 pages every morning"
                value={application}
                onChange={e => setApplication(e.target.value)}
              />
              <div className="absolute -bottom-2 left-0 w-12 h-[1.5px] bg-outline-variant opacity-40 group-focus-within:w-full group-focus-within:bg-primary group-focus-within:opacity-60 transition-all duration-700 ease-in-out"></div>
            </div>
          </div>
        </div>

        {/* Prompt 3 */}
        <div className="relative group">
          <div className="flex flex-col gap-6">
            <label className="font-headline text-2xl text-primary flex items-center gap-4">
              <span className="text-tertiary opacity-40 italic">03.</span>
              What did I disagree with?
            </label>
            <div className="relative px-1">
              <textarea 
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl font-headline leading-relaxed text-on-surface placeholder:opacity-50 min-h-[140px] resize-none" 
                placeholder="Example: The author overgeneralized habits"
                value={disagreement}
                onChange={e => setDisagreement(e.target.value)}
              />
              <div className="absolute -bottom-2 left-0 w-12 h-[1.5px] bg-outline-variant opacity-40 group-focus-within:w-full group-focus-within:bg-primary group-focus-within:opacity-60 transition-all duration-700 ease-in-out"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Meta Interaction */}
      <section className="mt-8 flex flex-col gap-5">
        <button 
          onClick={() => handleSaveReflection(true)}
          disabled={loading}
          className="w-full bg-primary text-on-primary h-14 rounded-md font-label text-[11px] tracking-[0.15em] uppercase font-bold transition-all duration-300 hover:bg-primary-dim active:scale-[0.98] shadow-lg shadow-primary/10 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Complete Book'}
        </button>
        <button 
          onClick={() => handleSaveReflection(false)}
          disabled={loading}
          className="w-full border border-outline-variant text-on-surface-variant h-14 rounded-md font-label text-[11px] tracking-[0.15em] uppercase font-bold transition-all duration-300 hover:bg-surface-container-low active:scale-[0.98] disabled:opacity-50"
        >
          Commit to Archive
        </button>
      </section>
    </main>
  );
}
