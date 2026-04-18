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

  if (!book) return <div className="text-center font-serif py-20 italic">Retrieving volume details...</div>;

  return (
    <div className="max-w-xl mx-auto py-12 px-4 md:px-0">
      <div className="mb-16">
        <button onClick={onBack} className="flex items-center gap-2 group text-on-surface-variant hover:text-on-surface transition-colors mb-8">
          <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span className="font-label text-xs uppercase tracking-[0.15em] font-semibold">Volume Details</span>
        </button>
        <h2 className="serif-text text-5xl text-on-surface mb-2 leading-tight">Sync Progress</h2>
        <p className="font-label text-sm text-on-surface-variant italic">Record your current location within the archives.</p>
      </div>

      <div className="bg-surface-container-highest/40 border border-outline-variant/10 rounded-2xl p-8 mb-12 flex gap-8 items-center">
        <div className="w-16 h-24 bg-surface-container-low overflow-hidden rounded shadow-sm flex-shrink-0">
           {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
                <span className="material-symbols-outlined text-2xl">menu_book</span>
              </div>
            )}
        </div>
        <div className="min-w-0">
          <h3 className="serif-text text-xl text-on-surface leading-tight truncate">{book.title}</h3>
          <p className="font-label text-[11px] text-on-surface-variant mt-1">Currently on page {book.current_page || 0} of {book.total_pages}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-16">
        <div className="relative group">
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant block mb-4">Current Page Marker</span>
          <div className="flex items-center gap-6">
            <input 
              type="number" 
              required
              min={book.current_page || 0}
              max={book.total_pages}
              className="w-full form-input-line serif-text text-6xl text-center italic placeholder:text-outline-variant/20"
              placeholder="000"
              value={currentPage}
              onChange={e => setCurrentPage(e.target.value)}
            />
          </div>
          <div className="flex justify-center mt-4">
             <span className="font-label text-[10px] text-outline-variant uppercase tracking-widest italic">Target Page: {book.total_pages}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 pt-4">
          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-primary text-on-primary rounded-xl font-label text-sm uppercase tracking-[0.2em] font-bold hover:bg-primary-dim transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-4 group"
          >
            {loading ? 'Recording...' : (
              <>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-y-[-2px]">history_edu</span>
                Store Progress
              </>
            )}
          </button>
          <button 
            type="button"
            onClick={onBack}
            className="font-label text-xs uppercase tracking-widest font-bold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
