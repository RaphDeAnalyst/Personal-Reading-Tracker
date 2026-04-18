import { useState, useEffect, FormEvent } from 'react';
import { Book } from '../types';

interface LogProgressViewProps {
  bookId: number;
  onBack: () => void;
  onSaved: () => void;
}

export default function LogProgressView({ bookId, onBack, onSaved }: LogProgressViewProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(data => {
        setBook(data);
        setCurrentPage((data.current_page || 0).toString());
      });
  }, [bookId]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPage: parseInt(currentPage) })
      });
      if (res.ok) onSaved();
    } catch (e) {
      console.error("Log error", e);
    } finally {
      setLoading(false);
    }
  };

  const adjustPage = (amount: number) => {
    if (!book) return;
    const next = Math.min(parseInt(currentPage || '0') + amount, book.total_pages);
    setCurrentPage(next.toString());
  };

  if (!book) return <div className="text-center font-serif py-20 italic">Retrieving volume details...</div>;

  return (
    <div className="w-full max-w-sm mx-auto py-8">
      {/* Book Context */}
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-24 h-32 mb-6 rounded shadow-xl bg-surface-container overflow-hidden border border-outline-variant/10">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
              <span className="material-symbols-outlined text-4xl">menu_book</span>
            </div>
          )}
        </div>
        <h2 className="serif-text text-xl font-medium text-on-surface">{book.title}</h2>
        <p className="font-label text-xs text-on-surface-variant/70 uppercase tracking-widest mt-1">Currently at page {book.current_page || 0}</p>
      </div>

      {/* Frictionless Input Area */}
      <div className="bg-surface-container-lowest p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(48,51,49,0.06)] border border-surface-container/50">
        <form onSubmit={handleSave} className="space-y-10">
          <div className="text-center">
            <label className="block text-[10px] uppercase tracking-[0.3em] font-bold text-on-surface-variant/60 mb-8">Enter Current Page</label>
            <div className="flex flex-col items-center gap-6">
              <div className="relative inline-flex items-center justify-center">
                <input 
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  pattern="\d*"
                  required
                  min={0}
                  max={book.total_pages}
                  className="bg-transparent border-none p-0 focus:ring-0 serif-text text-7xl font-medium text-center placeholder:text-surface-container-highest w-40 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_drop_up</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => adjustPage(-1)}
                    className="text-outline-variant hover:text-primary transition-colors flex items-center justify-center h-6"
                  >
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>arrow_drop_down</span>
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
