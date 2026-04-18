import { useState, useEffect } from 'react';
import { ChevronLeft, Plus, History, CheckCircle2, Trophy, ArrowRight, Zap } from 'lucide-react';
import { BookDetail } from '../types';
import { clsx } from 'clsx';

interface BookDetailViewProps {
  bookId: number;
  onBack: () => void;
  onReflect: () => void;
  onUpdate: () => void;
}

export default function BookDetailView({ bookId, onBack, onReflect, onUpdate }: BookDetailViewProps) {
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [logAmount, setLogAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBook = async () => {
    const res = await fetch(`/api/books/${bookId}`);
    const data = await res.json();
    setBook(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBook();
  }, [bookId]);

  const handleLogProgress = async () => {
    if (!logAmount || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await fetch(`/api/books/${bookId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagesRead: parseInt(logAmount),
          date: new Date().toISOString().split('T')[0]
        })
      });
      setLogAmount('');
      await fetchBook();
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'COMPLETED',
          current_page: book?.total_pages 
        })
      });
      await fetchBook();
      onReflect();
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !book) return <div className="flex justify-center py-20 font-mono text-sm opacity-50">SYNCING DATA...</div>;

  const progress = Math.round((book.current_page / book.total_pages) * 100);
  const pagesRemaining = book.total_pages - book.current_page;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-muted hover:text-ink transition-colors text-xs font-bold uppercase tracking-widest"
      >
        <ChevronLeft className="w-4 h-4" />
        Return to command center
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-20">
        {/* Main Info */}
        <div className="space-y-16 border-r border-ink/10 pr-10">
          <div className="space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={clsx(
                  "text-[10px] font-bold px-2 py-0.5 border border-ink rounded-full uppercase tracking-wider",
                  book.status === 'COMPLETED' ? "bg-ink text-bg" : "text-ink"
                )}>
                  {book.status.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-bold border border-ink/20 text-muted px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {book.mode}
                </span>
              </div>
              <h2 className="bold-title">{book.title}</h2>
              <p className="text-xl text-muted font-serif italic tracking-tight">{book.author || 'Unknown Author'}</p>
            </div>

            <div className="space-y-10">
              <div className="flex items-end gap-10">
                <div className="massive-stat text-[140px] leading-[0.8]">
                  {progress}%
                </div>
                <div className="pb-4">
                  <p className="text-xl font-bold uppercase tracking-widest leading-none mb-2">{book.current_page} of {book.total_pages} pages</p>
                  <p className="text-sm font-bold uppercase tracking-widest text-accent">{pagesRemaining} pages remaining</p>
                </div>
              </div>
              
              <div className="h-2 w-full bg-ink/5 relative">
                <div 
                  className={clsx(
                    "absolute h-full transition-all duration-1000 ease-out",
                    book.status === 'COMPLETED' ? "bg-emerald-500" : "bg-accent"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex gap-4">
              {book.status !== 'COMPLETED' ? (
                <div className="flex-1 flex gap-4 p-8 bg-ink/5 items-center">
                  <div className="flex-1">
                    <label className="label-caps mb-2 block">Log Progress</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={logAmount}
                      onChange={(e) => setLogAmount(e.target.value)}
                      className="bg-transparent text-3xl font-bold w-full outline-none border-b-2 border-ink/10 focus:border-ink transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleLogProgress}
                    disabled={!logAmount || isSubmitting}
                    className="bg-ink text-bg px-10 py-5 font-bold text-xs uppercase tracking-[2px] hover:opacity-80 transition-all disabled:opacity-20"
                  >
                    Commit
                  </button>
                </div>
              ) : (
                <div className="flex-1 p-8 bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xl text-emerald-900">Record Finalized</h4>
                    <p className="text-emerald-700 text-sm">Target reached. Operational objective complete.</p>
                  </div>
                  {!book.reflection && (
                    <button 
                      onClick={onReflect}
                      className="bg-emerald-600 text-white px-8 py-3 font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                    >
                      Summarize
                    </button>
                  )}
                </div>
              )}
              
              {book.status !== 'COMPLETED' && (
                <button 
                  onClick={handleMarkCompleted}
                  className="px-6 border-2 border-ink text-ink font-bold text-[10px] uppercase tracking-widest hover:bg-ink hover:text-bg transition-all"
                >
                  Finalize
                </button>
              )}
            </div>
          </div>

          {book.reflection && (
            <div className="space-y-12 pt-10 border-t border-ink/10">
              <span className="label-caps tracking-[0.3em] font-black text-ink">Cognitive Reflection</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-4">
                  <label className="label-caps text-[9px]">The Core Insight</label>
                  <p className="font-serif leading-relaxed text-ink/80 italic">{book.reflection.learning || 'N/A'}</p>
                </div>
                <div className="space-y-4">
                  <label className="label-caps text-[9px]">The Application</label>
                  <p className="font-serif leading-relaxed text-ink/80 italic">{book.reflection.application || 'N/A'}</p>
                </div>
                <div className="space-y-4">
                  <label className="label-caps text-[9px]">The Counter-Point</label>
                  <p className="font-serif leading-relaxed text-ink/80 italic">{book.reflection.disagreement || 'N/A'}</p>
                </div>
              </div>
              
              <button 
                onClick={onReflect}
                className="label-caps text-[9px] hover:text-ink underline underline-offset-4"
              >
                Modify Reflection
              </button>
            </div>
          )}
        </div>

        {/* Sidebar History */}
        <aside className="space-y-10">
          <div>
            <span className="label-caps mb-8 block">Pulse Stream</span>
            
            <div className="space-y-6">
              {book.logs.length === 0 ? (
                <div className="text-muted text-[11px] font-bold uppercase tracking-widest">No pulses recorded</div>
              ) : (
                book.logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-end border-b border-ink/5 pb-4">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
                        {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="font-serif italic text-lg">Daily session</div>
                    </div>
                    <div className="massive-stat text-3xl">+{log.pages_read}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
