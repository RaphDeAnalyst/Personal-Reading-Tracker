import { useEffect, useState } from 'react';
import { BookDetail } from '../types';

interface SuccessViewProps {
  bookId: number;
  onFinish: () => void;
  onViewJournal?: () => void;
}

export default function SuccessView({ bookId, onFinish, onViewJournal }: SuccessViewProps) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(setBookDetail);
  }, [bookId]);

  if (!bookDetail) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  const isFullReflection = 
    bookDetail.reflection &&
    bookDetail.reflection.learning?.trim() &&
    bookDetail.reflection.application?.trim() &&
    bookDetail.reflection.disagreement?.trim();

  const isPartialReflection = 
    bookDetail.reflection && !isFullReflection;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      {/* Success Container */}
      <div className="max-w-md w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Visual Anchor: Asymmetric bookmark aesthetic */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-tertiary-container rounded-full blur-3xl opacity-20 transform -translate-y-4"></div>
          <div className="relative flex items-center justify-center w-24 h-24 mx-auto bg-surface-container-low rounded-full shadow-sm border border-outline-variant/5">
            <span className="material-symbols-outlined text-tertiary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
          </div>
          {/* Decorative Bookmark Element */}
          <div className="absolute -right-2 top-0 w-4 h-12 bg-tertiary opacity-80 rounded-b-sm shadow-sm transition-transform duration-500 hover:scale-y-110"></div>
        </div>

        {/* Editorial Content Cluster */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-headline font-medium tracking-tight text-on-surface">
            {bookDetail.status === 'COMPLETED' ? 'Volume Archived' : 'Book completed'}
          </h1>
          <div className="flex flex-col gap-1">
            <p className="text-on-surface-variant font-body text-lg leading-relaxed italic opacity-80">
              Your journey has been recorded
            </p>
            <p className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-tertiary/60">
              {isFullReflection ? 'Reflection saved successfully' : 
               isPartialReflection ? 'Reflection draft saved' : 
               'No reflection saved'}
            </p>
          </div>
        </div>

        {/* The Reading Card: Achievement Summary */}
        <div className="bg-surface-container-low/60 backdrop-blur-sm rounded-xl p-8 space-y-6 text-left relative overflow-hidden group border border-outline-variant/10 shadow-sm">
          <div className="absolute top-0 right-0 p-4 transition-transform group-hover:rotate-12 duration-500">
            <span className="material-symbols-outlined text-tertiary opacity-20 text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
          </div>
          
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4">Last Archive Entry</p>
            <div className="flex items-start gap-5">
              <div className="w-16 h-24 bg-surface-container-highest shadow-md rounded flex-shrink-0 overflow-hidden transform transition-transform group-hover:scale-105 duration-500">
                {bookDetail.cover_url ? (
                  <img src={bookDetail.cover_url} alt={bookDetail.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
                    <span className="material-symbols-outlined text-2xl">menu_book</span>
                  </div>
                )}
              </div>
              <div className="space-y-1 py-1 min-w-0">
                <h3 className="font-headline text-xl text-on-surface italic font-semibold line-clamp-2 break-words leading-tight">{bookDetail.title}</h3>
                <p className="text-sm text-on-surface-variant/80 break-words">{bookDetail.total_pages} pages archived</p>
                {/* Progress Filament */}
                <div className="pt-5">
                  <div className="w-32 h-[2px] bg-surface-container-highest relative">
                    <div className="absolute inset-0 bg-tertiary w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cluster */}
        <div className="flex flex-col items-center gap-6 pt-4">
          <button 
            onClick={onFinish}
            className="w-full px-12 py-5 bg-primary text-on-primary rounded-md font-body font-bold text-sm tracking-widest uppercase shadow-xl hover:bg-primary-dim transition-all active:scale-95 duration-200"
          >
            Return to Dashboard
          </button>
          
          <button 
            onClick={onViewJournal}
            className="text-on-surface-variant font-body text-sm font-semibold hover:text-on-surface transition-colors border-b border-transparent hover:border-outline-variant pb-1 flex items-center gap-2 group"
          >
            View Reflection Journal
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </div>
    </main>
  );
}
