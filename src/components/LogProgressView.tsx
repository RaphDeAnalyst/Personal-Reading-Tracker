import { useState, useEffect, FormEvent } from 'react';
import { Book } from '../types';
import SuccessView from './SuccessView';
import Icon from './Icon';
import { ChevronUp, ChevronDown, BookOpen, Loader2 } from 'lucide-react';


interface LogProgressViewProps {
  bookId: number;
  onBack: () => void;
  onSaved: () => void;
  onViewJournal?: (bookId: number) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function LogProgressView({ bookId, onBack, onSaved, onViewJournal, showToast }: LogProgressViewProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(data => {
        setBook(data);
        setCurrentPage((data.current_page || 0).toString());
        if (data.status === 'COMPLETED' || (data.current_page === data.total_pages && data.total_pages > 0)) {
          setShowSuccess(true);
        }
      })
      .catch(err => {
        console.error("Fetch book error", err);
        showToast?.("Failed to load book details.", "error");
      });
  }, [bookId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const targetPage = parseInt(currentPage);
    if (isNaN(targetPage)) {
      showToast?.("Please enter a valid page number", "error");
      return;
    }

    if (book && (targetPage < 0 || targetPage > book.total_pages)) {
      showToast?.(`Page must be between 0 and ${book.total_pages}`, "error");
      return;
    }

    if (book && targetPage < (book.current_page || 0)) {
      showToast?.(`You're on page ${book.current_page}. Enter a higher page to log progress.`, "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: targetPage })
      });
      if (res.ok) {
        showToast?.("Progress saved", "success");
        if (book && targetPage === book.total_pages) {
          setShowSuccess(true);
        } else {
          onSaved();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast?.(errData.error || "Failed to save progress", "error");
      }
    } catch (e) {
      console.error("Log error", e);
      showToast?.("Network error. Progress was not saved.", "error");
    } finally {
      setLoading(false);
    }
  };


  const adjustPage = (amount: number) => {
    if (!book) return;
    // Fall back to the book's saved page if the input has been cleared
    const base = parseInt(currentPage) || book.current_page || 0;
    const next = Math.max(0, Math.min(base + amount, book.total_pages));
    setCurrentPage(next.toString());
  };

  if (!book) return (
    <div className="text-center font-headline italic py-24 text-on-surface-variant flex flex-col items-center gap-4">
      <Icon icon={Loader2} size="lg" variant="primary" className="animate-spin" />
      Loading...
    </div>
  );

  if (showSuccess) {
    return <SuccessView bookId={bookId} onFinish={onSaved} onViewJournal={() => onViewJournal?.(bookId)} />;
  }

  return (
    <div className="w-full max-w-sm mx-auto py-8">
      {/* Book Context */}
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-24 h-32 mb-6 rounded shadow-xl bg-surface-container overflow-hidden border border-outline-variant/10">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon={BookOpen} size="xl" variant="muted" />
            </div>
          )}
        </div>
        <h2 className="serif-text text-xl font-medium text-on-surface break-words px-4">{book.title}</h2>
        <p className="font-label text-xs text-on-surface-variant/70 uppercase tracking-widest mt-1 break-words px-4">{book.author}</p>
      </div>

      {/* Frictionless Input Area */}
      <div className="bg-surface-container-lowest p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(48,51,49,0.06)] border border-surface-container/50">
        <form onSubmit={handleSave} className="space-y-10">
          <div className="text-center">
            <label className="block text-[10px] uppercase tracking-[0.3em] font-bold text-on-surface-variant/60 mb-8">Enter Current Page</label>
            <div className="flex flex-col items-center gap-6">
              <div className="relative inline-flex items-center justify-center max-w-full">
                <input 
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  pattern="\d*"
                  required
                  min={0}
                  max={book.total_pages}
                  className="bg-transparent border-none p-0 focus:ring-0 serif-text text-6xl sm:text-7xl font-medium text-center text-on-surface placeholder:text-outline-variant/40 w-32 sm:w-40 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder={(book.current_page || 0).toString()}
                  value={currentPage}
                  onChange={e => setCurrentPage(e.target.value)}
                />
                
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    type="button"
                    onClick={() => adjustPage(1)}
                    className="text-outline-variant hover:text-primary transition-colors flex items-center justify-center h-6"
                  >
                    <Icon icon={ChevronUp} size="lg" variant="inherit" />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustPage(-1)}
                    className="text-outline-variant hover:text-primary transition-colors flex items-center justify-center h-6"
                  >
                    <Icon icon={ChevronDown} size="lg" variant="inherit" />
                  </button>
                </div>
                
                <span className="text-on-surface-variant/30 text-xl serif-text italic absolute bottom-4 -right-16 select-none">/ {book.total_pages}</span>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button 
                  type="button"
                  onClick={() => adjustPage(5)}
                  className="px-4 py-2 rounded-full border border-outline-variant text-[11px] font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors tracking-widest btn-active-scale"
                >
                  +5
                </button>
                <button 
                  type="button"
                  onClick={() => adjustPage(10)}
                  className="px-4 py-2 rounded-full border border-outline-variant text-[11px] font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors tracking-widest btn-active-scale"
                >
                  +10
                </button>
                <button 
                  type="button"
                  onClick={() => adjustPage(20)}
                  className="px-4 py-2 rounded-full border border-outline-variant text-[11px] font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors tracking-widest btn-active-scale"
                >
                  +20
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dim text-on-primary py-6 rounded-xl text-xs font-semibold uppercase tracking-[0.3em] transition-all duration-300 shadow-xl shadow-primary/20 btn-active-scale disabled:opacity-50"
          >
            {loading ? 'Archiving...' : 'Log Progress'}
          </button>
        </form>
      </div>

      <div className="mt-8 flex justify-center">
        <button 
          onClick={onBack}
          className="text-on-surface-variant/40 hover:text-on-surface font-label text-[10px] uppercase tracking-[0.2em] font-bold transition-colors underline-offset-4 hover:underline"
        >
          Cancel & Return
        </button>
      </div>
    </div>
  );
}
