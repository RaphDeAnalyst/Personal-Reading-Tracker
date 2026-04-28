import { useState, useEffect } from 'react';
import { Book, Log, Reflection, BookDetail, Tag } from '../types';
import TagSelector from './TagSelector';
import Icon from './Icon';
import {
  Trash2, FileText, CheckCircle2, Clock, BookOpen,
  Edit, Loader2, Star
} from 'lucide-react';


interface BookDetailViewProps {
  bookId: number;
  onBack: () => void;
  onLogProgress: (bookId: number) => void;
  onWriteReflection: (bookId: number) => void;
  onOpenReader: (bookId: number) => void;
  onDelete: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function BookDetailView({ bookId, onBack, onLogProgress, onWriteReflection, onOpenReader, onDelete, showToast }: BookDetailViewProps) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [quickLogValue, setQuickLogValue] = useState<string>('');
  const [logging, setLogging] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showTagEditor, setShowTagEditor] = useState(false);

  const fetchBookTags = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/tags`);
      if (res.ok) {
        const tags: Tag[] = await res.json();
        setSelectedTagIds(tags.map(t => t.id));
      }
    } catch (e) {
      console.error("Fetch tags error:", e);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      setBookDetail(data);
    } catch (e) {
      console.error("Fetch detail error:", e);
      showToast?.("Failed to load book details.", "error");
    }
  };

  useEffect(() => {
    fetchData();
    fetchBookTags();
  }, [bookId]);

  const handleToggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleQuickLog = async (pages?: number) => {
    let pagesToLog = pages;
    if (!pages && quickLogValue) {
      pagesToLog = parseInt(quickLogValue, 10);
    }
    if (!pagesToLog || pagesToLog <= 0) {
      showToast?.("Please enter valid pages", "error");
      return;
    }

    setLogging(true);
    try {
      const newPage = Math.min((bookDetail.current_page || 0) + pagesToLog, bookDetail.total_pages);
      const res = await fetch(`/api/books/${bookId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPage: newPage,
          pagesRead: pagesToLog,
          date: new Date().toISOString()
        })
      });
      if (res.ok) {
        setQuickLogValue('');
        fetchData();
        showToast?.(`Logged ${pagesToLog} pages`, "success");
      } else {
        showToast?.("Failed to log pages", "error");
      }
    } catch (e) {
      console.error("Quick log error:", e);
      showToast?.("Network error", "error");
    } finally {
      setLogging(false);
    }
  };

  const handleMarkAsCompleted = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.ok) {
        showToast?.("Book marked as completed", "success");
        fetchData();
      } else {
        showToast?.("Failed to mark as completed", "error");
      }
    } catch (e) {
      console.error("Mark completed error:", e);
      showToast?.("Network error", "error");
    }
  };

  const handleSaveTags = async () => {
    if (logging) return;
    setLogging(true);
    try {
      const res = await fetch(`/api/books/${bookId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: selectedTagIds })
      });
      if (res.ok) {
        showToast?.("Tags updated", "success");
        setShowTagEditor(false);
      } else {
        const data = await res.json();
        showToast?.(data.error || "Failed to update tags", "error");
      }
    } catch (e) {
      console.error("Save tags error:", e);
      showToast?.("Network error while saving tags", "error");
    } finally {
      setLogging(false);
    }
  };

  const handleDelete = async () => {
    setLogging(true);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast?.("Book removed from your library", "success");
        onDelete();
      } else {
        showToast?.("Failed to remove book", "error");
      }
    } catch (e) {
      console.error("Delete error:", e);
      showToast?.("Network error", "error");
    } finally {
      setLogging(false);
    }
  };

  if (!bookDetail) return <div className="text-center font-headline italic py-24 text-on-surface-variant flex flex-col items-center gap-4">
    <div className="flex justify-center"><Icon icon={Loader2} size="lg" variant="primary" className="animate-spin" /></div>
    Loading...
  </div>;

  const progress = Math.round(((bookDetail.current_page || 0) / bookDetail.total_pages) * 100);
  const pagesLeft = bookDetail.total_pages - (bookDetail.current_page || 0);
  const statusLabel = bookDetail.status === 'COMPLETED' ? 'Completed' : (bookDetail.current_page > 0 ? 'Now Reading' : 'Up Next');


  return (
    <div className="max-w-4xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row gap-12 items-start">
        {/* Book Cover & Meta */}
        <aside className="w-full md:w-1/3 md:sticky md:top-24">
          <div className="relative group">
            <div className="absolute -inset-1 bg-primary/10 rounded-lg blur-xl opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative w-full rounded-lg shadow-2xl overflow-hidden aspect-[1/1.5] bg-surface-container">
              {bookDetail.cover_url ? (
                <img src={bookDetail.cover_url} alt={bookDetail.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Icon icon={BookOpen} size="xl" variant="muted" /></div>
              )}
            </div>
          </div>
          <div className="mt-8 space-y-6">
            <div className="flex flex-wrap gap-2">
              <span className="px-4 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">{bookDetail.mode}</span>
              <span className="px-4 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-[10px] font-bold tracking-widest uppercase">{statusLabel}</span>
            </div>

            {/* Tags Section */}
            <div className="pt-4 border-t border-outline-variant/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tags</span>
                <button 
                  onClick={() => {
                    if (showTagEditor) {
                      handleSaveTags();
                    } else {
                      setShowTagEditor(true);
                    }
                  }}
                  disabled={logging}
                  className="text-[10px] text-primary hover:underline font-bold disabled:opacity-50"
                >
                  {showTagEditor ? (logging ? 'Saving...' : 'Save') : 'Edit'}
                </button>
              </div>
              
              <TagSelector 
                selectedTagIds={selectedTagIds}
                onToggleTag={handleToggleTag}
                showToast={showToast}
                isEditing={showTagEditor}
              />
              
              {showTagEditor && (
                <button
                  onClick={() => {
                    setShowTagEditor(false);
                    fetchBookTags(); // Revert changes
                  }}
                  className="w-full mt-2 text-[10px] text-outline-variant hover:text-on-surface transition-colors font-bold uppercase tracking-widest"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Metadata Summary */}
            <div className="pt-4 border-t border-outline-variant/10 space-y-3">
              {bookDetail.isbn && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">ISBN</span>
                  <span className="text-[11px] font-medium text-on-surface-variant select-all">{bookDetail.isbn}</span>
                </div>
              )}
              {bookDetail.publisher && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">Publisher</span>
                  <span className="text-[11px] font-medium text-on-surface-variant">{bookDetail.publisher}</span>
                </div>
              )}
              {bookDetail.publication_year && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-outline-variant uppercase tracking-widest">Released</span>
                  <span className="text-[11px] font-medium text-on-surface-variant">{bookDetail.publication_year}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <p className="text-on-surface-variant text-sm leading-relaxed italic">
                Your book details and reading progress are tracked below.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 text-outline-variant hover:text-error transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  <Icon icon={Trash2} size="sm" variant="danger" />
                  Remove Book
                </button>
              ) : (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <p className="text-[10px] text-error font-bold uppercase tracking-[0.1em] border-l-2 border-error pl-3 py-1">
                    This will permanently delete this book and all its data. This cannot be undone.
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleDelete}
                      disabled={logging}
                      className="text-[10px] font-bold uppercase tracking-widest text-error hover:underline disabled:opacity-50"
                    >
                      {logging ? 'Removing...' : 'Yes, Remove'}
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-[10px] font-bold uppercase tracking-widest text-outline-variant hover:text-on-surface transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Book Content & Tracking */}
        <section className="flex-1 space-y-10 w-full min-w-0">
          {/* Title & Header */}
          <header className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-on-surface leading-tight font-semibold break-words hyphens-auto">{bookDetail.title}</h2>
              <p className="text-base sm:text-lg md:text-xl text-on-surface-variant font-headline italic break-words">by {bookDetail.author}</p>
            </div>
            
            {bookDetail.description && (
              <div className="relative">
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full"></div>
                <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed font-body italic pl-2">
                  {bookDetail.description}
                </p>
              </div>
            )}
          </header>

          {/* Progress Section */}
          <div className="p-8 rounded-xl bg-surface-container-low border border-outline-variant/10 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-end mb-6 relative z-10">
              <div>
                <span className="text-xs font-label text-on-surface-variant uppercase tracking-[0.2em] font-bold">Reading Progress</span>
                <div className="mt-2 font-headline text-3xl font-semibold">
                  Page {bookDetail.current_page || 0} <span className="text-outline-variant font-light px-1 text-xl">/</span> {bookDetail.total_pages}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-tertiary">{progress}%</span>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-1">{pagesLeft} pages left</p>
              </div>
            </div>
            
            {/* Thick Prominent Progress Bar */}
            <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden shadow-inner relative z-10 border border-outline-variant/5">
              <div className="h-full bg-tertiary transition-all duration-700 ease-out flex items-center justify-end pr-2 overflow-hidden" style={{ width: `${progress}%` }}>
                <div className="w-1 h-2 bg-white/20 rounded-full blur-[1px]"></div>
              </div>
            </div>

            {/* Quick Log Section */}
            {bookDetail.status !== 'COMPLETED' && bookDetail.mode === 'PHYSICAL' && (
              <div className="mt-10 pt-8 border-t border-outline-variant/20 relative z-10">
                <h4 className="text-xs font-bold text-on-surface mb-6 uppercase tracking-widest">Quick Log</h4>
                <div className="space-y-6">
                  {/* Main Input Row */}
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="number"
                        value={quickLogValue}
                        onChange={(e) => setQuickLogValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleQuickLog()}
                        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-md px-4 py-3.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-on-surface font-medium placeholder:text-outline-variant/60 placeholder:text-sm"
                        placeholder="Pages read today"
                      />
                    </div>
                    <button 
                      onClick={() => handleQuickLog()}
                      disabled={logging || !quickLogValue}
                      className="bg-primary text-on-primary px-8 py-3.5 rounded-md font-bold text-sm hover:bg-primary-dim transition-all active:scale-95 shadow-sm disabled:opacity-50"
                    >
                      {logging ? '...' : 'Log'}
                    </button>
                  </div>
                  {/* Fast Tap Buttons */}
                  <div className="flex gap-3">
                    <button onClick={() => handleQuickLog(5)} className="flex-1 py-3.5 rounded-md bg-surface-container-high border border-outline-variant/20 text-on-surface font-semibold text-sm hover:bg-surface-variant active:bg-outline-variant/40 transition-colors shadow-sm">+5</button>
                    <button onClick={() => handleQuickLog(10)} className="flex-1 py-3.5 rounded-md bg-surface-container-high border border-outline-variant/20 text-on-surface font-semibold text-sm hover:bg-surface-variant active:bg-outline-variant/40 transition-colors shadow-sm">+10</button>
                    <button onClick={() => handleQuickLog(20)} className="flex-1 py-3.5 rounded-md bg-surface-container-high border border-outline-variant/20 text-on-surface font-semibold text-sm hover:bg-surface-variant active:bg-outline-variant/40 transition-colors shadow-sm">+20</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Cluster */}
          <div className="flex flex-col gap-4 py-4">
            {bookDetail.mode === 'DIGITAL' && (
              <button
                onClick={() => onOpenReader(bookId)}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-primary text-on-primary rounded-md font-bold text-lg transition-all hover:bg-primary-dim shadow-md active:scale-[0.99] group"
              >
                <Icon icon={FileText} size="lg" variant="inverted" />
                Open PDF Reader
              </button>
            )}
            {bookDetail.status !== 'COMPLETED' && (
              <button
                onClick={handleMarkAsCompleted}
                className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-on-surface text-surface rounded-md font-bold text-lg transition-all hover:bg-primary-dim shadow-md active:scale-[0.99] group"
              >
                <Icon icon={CheckCircle2} size="lg" variant="inverted" />
                Mark as Completed
              </button>
            )}
            {bookDetail.mode === 'PHYSICAL' && (
              <button
                onClick={() => onLogProgress(bookId)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 border border-outline-variant/30 text-primary rounded-md font-semibold hover:bg-surface-container-low transition-colors"
              >
                <Icon icon={Clock} size="md" />
                {bookDetail.status === 'COMPLETED' ? 'View Reading History' : 'Detailed Log'}
              </button>
            )}
          </div>

          {/* Reading History (Timeline) */}
          <div className="space-y-8 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-2xl italic font-semibold">Reading History</h3>
              {bookDetail.mode === 'PHYSICAL' && (
                <button onClick={() => onLogProgress(bookId)} className="text-primary text-sm font-bold hover:underline">View All</button>
              )}
            </div>
            
            <div className="relative pl-8 space-y-12">
              {/* Timeline Line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-[1px] bg-outline-variant/30"></div>
              
              {bookDetail.logs && bookDetail.logs.length > 0 ? bookDetail.logs.map((log, index) => (
                <div key={log.id} className="relative">
                  <div className={`absolute -left-[29px] top-1.5 w-[13px] h-[13px] rounded-full border-2 bg-surface ring-4 ring-surface ${index === 0 ? 'border-tertiary' : 'border-outline-variant'}`}></div>
                  <div className="flex flex-col md:flex-row md:justify-between md:items-baseline gap-2">
                    <div>
                      <span className="text-xs font-bold text-on-surface uppercase tracking-widest block mb-1">
                        {new Date(log.date).toLocaleString(undefined, { 
                          month: 'short', 
                          day: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }).replace(',', ' —')}
                        {index === 0 && <span className="ml-2 text-tertiary normal-case italic font-headline">Recent</span>}
                      </span>
                      <p className="font-medium text-on-surface">"Gained insights up to page {log.current_page}"</p>
                    </div>
                    <span className="w-fit text-sm font-bold text-tertiary bg-tertiary-container/40 px-4 py-1.5 rounded-full border border-tertiary-dim/10">
                      +{log.pages_read} pages read
                    </span>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-on-surface-variant italic font-headline opacity-60">No history discovered yet.</div>
              )}
            </div>
          </div>

          {/* Notes / Reflections */}
          {bookDetail.reflection ? (
            <div className="pt-12 pb-10">
              <h3 className="font-headline text-2xl italic mb-6 font-semibold">Your Reflections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-surface-container-lowest rounded-lg shadow-sm border border-outline-variant/10 group hover:border-tertiary/20 transition-colors">
                  <p className="text-sm text-on-surface leading-relaxed font-label italic line-clamp-4">"{bookDetail.reflection.content}"</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-outline-variant">Your Reflection</span>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Icon key={i} icon={Star} size="md" className={i < (bookDetail.reflection.rating || 0) ? 'fill-tertiary text-tertiary' : 'text-outline-variant/30'} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="pt-12 pb-10">
                <h3 className="font-headline text-2xl italic mb-6 font-semibold opacity-30">Your Reflections</h3>
                <button 
                  onClick={() => onWriteReflection(bookId)}
                  className="w-full py-8 border-2 border-dashed border-outline-variant/20 rounded-xl text-on-surface-variant/50 hover:text-primary hover:border-primary/20 transition-all font-headline italic text-lg"
                >
                  Your reflections wait to be recorded...
                </button>
             </div>
          )}
        </section>
      </div>
    </div>
  );
}
