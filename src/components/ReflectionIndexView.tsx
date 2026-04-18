import { useState, useEffect } from 'react';
import { Book } from '../types';
import { motion } from 'motion/react';

interface ReflectionIndexViewProps {
  onSelectBook: (bookId: number) => void;
}

export default function ReflectionIndexView({ onSelectBook }: ReflectionIndexViewProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        setBooks(data);
        setLoading(false);
      });
  }, []);

  const pendingBooks = books.filter(b => b.status === 'COMPLETED' && !b.has_reflection);
  const reflectedBooks = books.filter(b => b.has_reflection);
  
  const displayBooks = activeTab === 'pending' ? pendingBooks : reflectedBooks;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="pt-12 pb-48 px-6 max-w-3xl mx-auto min-h-screen flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
          <span className="text-[10px] uppercase tracking-widest font-bold font-label">The Archivist</span>
        </div>
        <h2 className="font-headline text-5xl md:text-6xl text-primary leading-tight">
          Reflection Journal
        </h2>
      </header>

      {/* Segmented Tabs */}
      <div className="flex flex-col gap-8">
        <div className="flex gap-8 border-b border-outline-variant/10">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`pb-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative ${activeTab === 'pending' ? 'text-primary' : 'text-outline-variant hover:text-on-surface-variant'}`}
          >
            To Reflect
            {activeTab === 'pending' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-[2px] bg-primary" />
            )}
            {pendingBooks.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary/10 text-[9px]">{pendingBooks.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`pb-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative ${activeTab === 'completed' ? 'text-primary' : 'text-outline-variant hover:text-on-surface-variant'}`}
          >
            My Reflections
            {activeTab === 'completed' && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 w-full h-[2px] bg-primary" />
            )}
          </button>
        </div>

        {/* Book List */}
        <section className="flex flex-col gap-6">
          {displayBooks.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low/30">
              <span className="material-symbols-outlined text-4xl text-outline-variant/40 mb-4">
                {activeTab === 'pending' ? 'history_edu' : 'edit_off'}
              </span>
              <p className="font-headline italic text-xl text-on-surface-variant">
                {activeTab === 'pending' ? 'All volumes have been synthesized.' : 'Your archive of reflections is currently empty.'}
              </p>
              <p className="text-sm text-outline-variant mt-2 max-w-xs mx-auto">
                {activeTab === 'pending' 
                  ? 'Complete a book to unlock its reflection sanctuary.' 
                  : 'Synthesize your first reading experience to begin your journal.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {displayBooks.map((book) => (
                <motion.button
                  key={book.id}
                  layout
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectBook(book.id)}
                  className="w-full bg-surface-container-low/50 backdrop-blur-sm border border-outline-variant/10 rounded-xl p-5 text-left flex items-center gap-6 hover:bg-surface-container transition-all group"
                >
                  {/* Book Cover Small */}
                  <div className="w-12 h-18 bg-surface-container-highest rounded shadow-sm flex-shrink-0 overflow-hidden group-hover:shadow-md transition-shadow">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
                        <span className="material-symbols-outlined text-xl">menu_book</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-headline text-lg text-on-surface truncate pr-4 group-hover:italic transition-all">
                      {book.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest italic opacity-70">
                        {book.author || 'Anonymous'}
                      </span>
                    </div>
                  </div>

                  {/* Action Reveal */}
                  <div className="flex items-center gap-3 text-outline-variant group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 0" }}>chevron_right</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Atmospheric detail */}
      <footer className="pt-12 border-t border-outline-variant/10 mt-auto">
        <p className="text-[10px] text-center text-outline-variant uppercase tracking-[0.2em] font-bold italic">
          Distillation of wisdom is the end of all archived journeys.
        </p>
      </footer>
    </main>
  );
}
