import { useEffect, useState } from 'react';
import { Book } from '../types';

interface SuccessViewProps {
  bookId: number;
  onFinish: () => void;
}

export default function SuccessView({ bookId, onFinish }: SuccessViewProps) {
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(setBook);
  }, [bookId]);

  if (!book) return null;

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10 animate-pulse"></div>

      <div className="mb-12 animate-bounce">
        <span className="material-symbols-outlined text-[80px] text-tertiary">celebration</span>
      </div>

      <p className="font-label text-xs uppercase tracking-[0.3em] font-bold text-on-surface-variant mb-6">Volume Archived</p>
      <h2 className="serif-text text-6xl md:text-7xl text-on-surface mb-4 leading-tight">Wisdom Acquired.</h2>
      <p className="font-label text-xl italic text-primary/80 mb-16 max-w-lg">“{book.title}” has been successfully recorded into your eternal sanctuary.</p>

      <div className="bg-surface-container-low/40 border border-outline-variant/10 rounded-2xl p-10 backdrop-blur-sm mb-16 flex flex-col md:flex-row gap-10 items-center">
        <div className="w-32 h-48 bg-surface-container-highest rounded-lg shadow-2xl overflow-hidden flex-shrink-0">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
              <span className="material-symbols-outlined text-4xl">menu_book</span>
            </div>
          )}
        </div>
        <div className="text-left space-y-4">
          <div className="flex gap-4">
             <div className="bg-surface-container-lowest px-4 py-2 rounded-lg">
                <span className="block font-label text-[9px] uppercase tracking-widest text-outline-variant">Total Content</span>
                <span className="serif-text text-xl italic text-on-surface">{book.total_pages} Pages</span>
             </div>
             <div className="bg-surface-container-lowest px-4 py-2 rounded-lg">
                <span className="block font-label text-[9px] uppercase tracking-widest text-outline-variant">Duration</span>
                <span className="serif-text text-xl italic text-on-surface">Level Achieved</span>
             </div>
          </div>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed italic opacity-70">This record is now locked in your library. Its wisdom remains a part of your journey forever.</p>
        </div>
      </div>

      <button 
        onClick={onFinish}
        className="px-12 py-5 bg-on-background text-background rounded-full font-label text-xs uppercase tracking-[0.25em] font-bold hover:bg-on-surface-variant transition-all shadow-xl active:scale-95"
      >
        Return to Library
      </button>
    </div>
  );
}
