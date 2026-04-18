import { useState, useEffect } from 'react';
import { Book, Log } from '../types';

interface BookDetailViewProps {
  bookId: number;
  onBack: () => void;
  onLogProgress: (bookId: number) => void;
  onWriteReflection: (bookId: number) => void;
  onDelete: () => void;
}

export default function BookDetailView({ bookId, onBack, onLogProgress, onWriteReflection, onDelete }: BookDetailViewProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const bookRes = await fetch(`/api/books/${bookId}`);
        if (!bookRes.ok) throw new Error(`Book fetch failed with status: ${bookRes.status}`);
        
        const contentType = bookRes.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await bookRes.text();
          console.error("Non-JSON response received:", text.substring(0, 100));
          throw new Error("Expected JSON from API but received something else.");
        }

        const data = await bookRes.json();
        setBook(data);
        // data.logs should already be populated by the combined /api/books/:id endpoint
        if (data.logs) setLogs(data.logs);
      } catch (e) {
        console.error("Fetch detail error:", e);
      }
    };
    fetchBookDetails();
  }, [bookId]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to remove this entry from your archive?')) {
      try {
        const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
        if (res.ok) onDelete();
      } catch (e) {
        console.error("Delete error", e);
      }
    }
  };

  if (!book) return <div className="text-center font-serif py-20 italic">Loading from archives...</div>;

  const progress = Math.round(((book.current_page || 0) / book.total_pages) * 100);

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4 md:px-0">
      {/* Detail Header */}
      <div className="flex items-center justify-between mb-16 px-4 md:px-0">
        <button onClick={onBack} className="flex items-center gap-2 group text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span className="font-label text-xs uppercase tracking-[0.15em] font-semibold">Library</span>
        </button>
        <button onClick={handleDelete} className="text-outline-variant hover:text-error transition-all p-2 rounded-full hover:bg-error/5">
          <span className="material-symbols-outlined text-xl">delete</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left: Identity Card */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 space-y-12">
            <div className="bg-surface-container-highest shadow-2xl rounded-2xl overflow-hidden aspect-[1/1.5] border border-outline-variant/10">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
                  <span className="material-symbols-outlined text-[120px]">menu_book</span>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <span className="font-label text-[10px] uppercase font-bold tracking-[0.25em] text-on-surface-variant block mb-3">Currently Reviewing</span>
                <h1 className="serif-text text-5xl text-on-surface leading-tight mb-2">{book.title}</h1>
                <p className="font-label text-xl italic text-on-surface-variant">{book.author}</p>
              </div>

              <div className="pt-8 border-t border-outline-variant/10">
                <div className="flex justify-between items-end mb-4">
                  <span className="font-label text-[11px] text-on-surface-variant uppercase tracking-[0.15em] font-medium">Completion status</span>
                  <span className="serif-text italic text-4xl text-primary">{progress}%</span>
                </div>
                <div className="h-2.5 w-full bg-surface-container-highest/60 rounded-full overflow-hidden">
                  <div className="h-full bg-tertiary rounded-full progress-bar-fill transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between mt-4">
                  <p className="font-label text-[12px] text-on-surface-variant">{book.current_page || 0} of {book.total_pages} pages</p>
                  <p className="font-label text-[12px] text-primary/70 font-medium">Started in {new Date(book.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-8">
                <button 
                  onClick={() => onLogProgress(book.id)}
                  className="w-full py-5 bg-primary text-on-primary rounded-xl font-label text-sm uppercase tracking-widest font-bold hover:bg-primary-dim transition-all shadow-lg active:scale-[0.97] flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Record Progress
                </button>
                <button 
                  onClick={() => onWriteReflection(book.id)}
                  className="w-full py-5 border border-primary/20 bg-background text-primary rounded-xl font-label text-sm uppercase tracking-widest font-bold hover:bg-primary/5 transition-all active:scale-[0.97] flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                  Add Reflection
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity & Detail */}
        <div className="lg:col-span-7 space-y-20">
          <section>
            <h2 className="serif-text text-3xl mb-12 flex items-center gap-4">
              <span className="inline-block w-8 h-[1px] bg-primary/30"></span>
              The Progress Archive
            </h2>

            <div className="space-y-12 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/10">
              {logs.length > 0 ? logs.map((log, index) => (
                <div key={log.id} className="relative pl-12 flex flex-col gap-2 group">
                  {/* Timeline Node */}
                  <div className="absolute left-0 top-1 w-10 h-10 flex items-center justify-center bg-background z-10 transition-transform group-hover:scale-110">
                    <div className="w-2.5 h-2.5 rounded-full border-2 border-primary bg-background shadow-[0_0_8px_rgba(97,94,87,0.3)]"></div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-label text-[10px] uppercase font-bold tracking-[0.1em] text-on-surface-variant">
                        {new Date(log.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      {index === 0 && <span className="bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest">Recent</span>}
                    </div>
                    <p className="serif-text text-xl italic text-on-surface">“Learned {log.pages_read} more pages”</p>
                    <p className="font-label text-[11px] text-on-surface-variant/70 italic mt-1">Found insights up to page {log.current_page}</p>
                  </div>
                </div>
              )) : (
                <div className="py-20 text-center text-outline-variant/50 serif-text text-xl italic pl-12 border-l border-outline-variant/5">
                   No reading history found for this entry.
                </div>
              )}
            </div>
          </section>

          <section className="bg-surface-container-low/30 border border-outline-variant/10 rounded-2xl p-8 md:p-12 space-y-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">info</span>
              <h3 className="font-label text-[11px] uppercase tracking-widest font-bold text-on-surface">Manifest Metadata</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-6">
              <div>
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2">Subject Category</span>
                <p className="serif-text text-lg italic text-on-surface">Non-Fiction & Research</p>
              </div>
              <div>
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2">Physical Scope</span>
                <p className="serif-text text-lg italic text-on-surface">{book.total_pages} pages</p>
              </div>
              <div className="md:col-span-2">
                <span className="font-label text-[10px] uppercase tracking-[0.1em] text-on-surface-variant block mb-2">Repository Note</span>
                <p className="font-body text-sm leading-relaxed text-on-surface-variant italic">
                  This work is currently under active archiving. Every recorded progress is a step towards completing the collection's wisdom.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
