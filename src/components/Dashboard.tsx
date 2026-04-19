import { useState, useEffect } from 'react';
import { Book } from '../types';

interface DashboardProps {
  onSelectBook: (id: number) => void;
  onAddBook: () => void;
  onLogCurrent: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface BookCardProps {
  book: Book;
  onSelect: (id: number) => void;
  key?: any;
}

function BookCard({ book, onSelect }: BookCardProps) {
  const bookProgress = Math.round(((book.current_page || 0) / book.total_pages) * 100);
  const statusLabel = book.status === 'COMPLETED' ? 'Completed' : (book.current_page > 0 ? 'Now Reading' : 'Up Next');

  return (
    <article className="group cursor-pointer" onClick={() => onSelect(book.id)}>
      <div className="flex gap-5 items-start">
        <div className="w-24 h-36 flex-shrink-0 bg-surface-container-low overflow-hidden rounded shadow-[2px_6px_16px_rgba(48,51,49,0.06)] transition-transform duration-500 group-hover:-translate-y-1">
           {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
                <span className="material-symbols-outlined text-sm">book</span>
              </div>
            )}
        </div>
        <div className="flex flex-col h-full py-0.5 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${book.status === 'COMPLETED' ? 'bg-outline' : book.status === 'IN_PROGRESS' && book.current_page > 0 ? 'bg-tertiary shadow-[0_0_4px_rgba(89,99,66,0.3)]' : 'bg-outline-variant/40'}`}></span>
            <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">{statusLabel}</span>
          </div>
          <h3 className="serif-text text-xl text-on-surface leading-tight mb-1 group-hover:text-primary transition-colors truncate">{book.title}</h3>
          <p className="font-label text-[11px] text-on-surface-variant mb-4 italic truncate">{book.author}</p>
          <div className="mt-auto">
            <div className="h-[4px] w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div className="h-full bg-tertiary rounded-full progress-bar-fill transition-all duration-700" style={{ width: `${bookProgress}%` }}></div>
            </div>
            <p className="font-label text-[10px] text-on-surface-variant mt-2 font-medium">{bookProgress}% completed</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard({ onSelectBook, onAddBook, onLogCurrent, showToast }: DashboardProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState({ pagesReadToday: 0, totalBooks: 0, completedBooks: 0 });
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<'now' | 'next' | 'completed'>('now');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const booksRes = await fetch('/api/books');
        if (!booksRes.ok) throw new Error(`Books fetch failed: ${booksRes.status}`);
        
        const booksData: Book[] = await booksRes.json();
        setBooks(booksData);
        
        const active = booksData.find(b => b.status === 'IN_PROGRESS' && (b.current_page || 0) > 0);
        setCurrentBook(active || null);

        const statsRes = await fetch('/api/dashboard/status');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            pagesReadToday: statsData.pagesReadToday || 0,
            totalBooks: statsData.libraryStats?.total || booksData.length,
            completedBooks: statsData.libraryStats?.completed || 0
          });
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
        showToast?.("Failed to fetch archive. Checking connections...", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const progress = currentBook 
    ? Math.round(((currentBook.current_page || 0) / currentBook.total_pages) * 100) 
    : 0;

  const isSearching = searchQuery.trim().length > 0;

  // Global search filtering
  const searchResults = books.filter(b => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.author || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tab filtering (only used when not searching)
  const tabBooks = books.filter(b => {
    const pages = b.current_page || 0;
    if (activeTab === 'now') {
      return b.status === 'IN_PROGRESS' && pages > 0 && b.status !== 'COMPLETED';
    }
    if (activeTab === 'next') {
      return (b.status === 'NOT_STARTED') || (b.status === 'IN_PROGRESS' && pages === 0);
    }
    if (activeTab === 'completed') {
      return b.status === 'COMPLETED';
    }
    return false;
  });

  const getGroupedResults = () => {
    const groups = {
      'Now Reading': searchResults.filter(b => b.status === 'IN_PROGRESS' && (b.current_page || 0) > 0 && b.status !== 'COMPLETED'),
      'Up Next': searchResults.filter(b => (b.status === 'NOT_STARTED') || (b.status === 'IN_PROGRESS' && (b.current_page || 0) === 0)),
      'Completed': searchResults.filter(b => b.status === 'COMPLETED')
    };
    return groups;
  };

  const grouped = getGroupedResults();

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        <p className="font-headline italic text-on-surface-variant">Opening the archives...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Today's Progress Section */}
      <section className="mb-10 flex items-center justify-between bg-surface-container-low/50 border border-outline-variant/10 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-tertiary">history_edu</span>
          <span className="font-label text-[12px] font-medium text-on-surface-variant tracking-wide">
            Today: <span className="text-on-surface font-semibold">{stats.pagesReadToday > 0 ? `${stats.pagesReadToday} pages read` : 'No reading logged today'}</span>
          </span>
        </div>
        <button onClick={onLogCurrent} className="font-label text-[10px] uppercase tracking-widest text-primary font-bold hover:underline transition-all">Log Now</button>
      </section>

      {/* Current Focus Section - Hide when searching */}
      {!isSearching && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <span className="font-label text-on-surface-variant text-[0.75rem] uppercase tracking-widest font-semibold">Active Selection</span>
            <button onClick={onAddBook} className="flex items-center gap-1.5 text-primary hover:text-primary-dim transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="font-label text-[11px] font-semibold uppercase tracking-widest">New Entry</span>
            </button>
          </div>

          {currentBook ? (
            <div className="bg-surface-container-highest rounded-[1.5rem] p-6 md:p-10 flex flex-col md:flex-row gap-10 items-center md:items-start shadow-md border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div 
                onClick={() => onSelectBook(currentBook.id)}
                className="w-56 h-80 flex-shrink-0 bg-surface-container-highest overflow-hidden rounded-lg shadow-[0_20px_50px_rgba(48,51,49,0.18)] z-10 cursor-pointer transition-transform duration-500 group-hover:scale-[1.02]"
              >
                 {currentBook.cover_url ? (
                    <img src={currentBook.cover_url} alt={currentBook.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
                      <span className="material-symbols-outlined text-6xl">menu_book</span>
                    </div>
                  )}
              </div>
              <div className="flex flex-col flex-grow w-full z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(89,99,66,0.4)]"></span>
                  <span className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Focusing on</span>
                </div>
                <h2 className="serif-text text-5xl text-on-surface mb-3 leading-tight">{currentBook.title}</h2>
                <p className="font-label text-lg text-on-surface-variant mb-10 italic">{currentBook.author}</p>
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-end mb-4">
                      <span className="font-label text-[11px] text-on-surface-variant uppercase tracking-[0.15em] font-medium">Reading Progress</span>
                      <span className="serif-text italic text-3xl text-primary">{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-surface-container-highest/60 rounded-full overflow-hidden border border-outline-variant/10">
                      <div className="h-full bg-tertiary rounded-full progress-bar-fill transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-4">
                      <p className="font-label text-[12px] text-on-surface-variant">{(currentBook.current_page || 0)} of {currentBook.total_pages} pages</p>
                      <p className="font-label text-[12px] text-primary/70 font-medium">{currentBook.total_pages - (currentBook.current_page || 0)} pages left</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onLogCurrent()}
                    className="w-full px-8 py-5 bg-primary text-on-primary rounded-xl font-label font-semibold text-sm tracking-[0.15em] uppercase hover:bg-primary-dim transition-all shadow-lg active:scale-[0.97] flex items-center justify-center gap-4 group"
                  >
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">menu_book</span>
                    Resume Reading
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-highest/30 rounded-[1.5rem] p-16 text-center border-2 border-dashed border-outline-variant/20">
              <p className="serif-text text-xl text-on-surface-variant">Your sanctum is quiet.</p>
              <button onClick={onAddBook} className="mt-4 font-label text-[11px] uppercase tracking-widest font-bold text-primary">New Entry</button>
            </div>
          )}
        </section>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 border-b border-outline-variant/10 pb-4 sticky top-16 bg-background z-30 pt-4">
        <div className={`flex gap-8 text-on-surface-variant font-label text-sm overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0 transition-opacity duration-300 ${isSearching ? 'opacity-30 pointer-events-none' : ''}`}>
          <button 
            onClick={() => setActiveTab('now')}
            className={`whitespace-nowrap ${activeTab === 'now' ? 'text-on-surface font-semibold underline underline-offset-[14px] decoration-primary decoration-2' : 'hover:text-on-surface'} transition-all`}
          >
            Now Reading
          </button>
          <button 
            onClick={() => setActiveTab('next')}
            className={`whitespace-nowrap ${activeTab === 'next' ? 'text-on-surface font-semibold underline underline-offset-[14px] decoration-primary decoration-2' : 'hover:text-on-surface'} transition-all`}
          >
            Up Next
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            className={`whitespace-nowrap ${activeTab === 'completed' ? 'text-on-surface font-semibold underline underline-offset-[14px] decoration-primary decoration-2' : 'hover:text-on-surface'} transition-all`}
          >
            Completed
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto px-4 py-2 bg-surface-container-low rounded-lg border border-outline-variant/5 group focus-within:border-primary/40 transition-all">
          <span className="material-symbols-outlined text-outline-variant text-[20px] group-focus-within:text-primary transition-colors">search</span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archive..." 
            className="bg-transparent border-none outline-none text-xs font-label w-full sm:w-48 placeholder:text-outline-variant/50"
          />
          {isSearching && (
            <button onClick={() => setSearchQuery('')} className="text-outline-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Book Rendering Logic */}
      <div className="space-y-16">
        {isSearching ? (
          /* Grouped Search Results */
          Object.entries(grouped).some(([_, items]) => items.length > 0) ? (
            Object.entries(grouped).map(([label, items]) => items.length > 0 && (
              <section key={label} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h3 className="font-label text-[10px] uppercase tracking-[0.3em] font-bold text-on-surface-variant/40 border-b border-outline-variant/5 pb-2">
                  {label} <span className="ml-2 opacity-50">({items.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
                  {items.map(book => <BookCard key={book.id} book={book} onSelect={onSelectBook} />)}
                </div>
              </section>
            ))
          ) : (
            <div className="py-24 text-center border-2 border-dashed border-outline-variant/10 rounded-3xl bg-surface-container-low/20 animate-in zoom-in-95 duration-300">
              <span className="material-symbols-outlined text-5xl text-outline-variant/30 mb-4">search_off</span>
              <p className="font-headline italic text-2xl text-on-surface-variant">No matches in the archive.</p>
              <p className="text-sm text-outline-variant mt-2">" {searchQuery} " yielded no results. Try another volume or author.</p>
            </div>
          )
        ) : (
          /* Regular Tab View */
          tabBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12 animate-in fade-in duration-500">
              {tabBooks.map(book => <BookCard key={book.id} book={book} onSelect={onSelectBook} />)}
            </div>
          ) : (
            <div className="py-24 text-center border-2 border-dashed border-outline-variant/10 rounded-3xl bg-surface-container-low/20">
              <span className="material-symbols-outlined text-5xl text-outline-variant/30 mb-4">inventory_2</span>
              <p className="font-headline italic text-2xl text-on-surface-variant">Empty Section.</p>
              <p className="text-sm text-outline-variant mt-2">No volumes found in this section of the archive.</p>
              <button onClick={onAddBook} className="mt-6 text-primary font-label text-[10px] uppercase tracking-widest font-bold hover:underline">Add New Entry</button>
            </div>
          )
        )}
      </div>

      {/* Asymmetric Detail Section - Only show when not searching */}
      {!isSearching && (
        <section className="mt-24 bg-surface-container-low p-10 md:p-12 rounded-2xl flex flex-col md:flex-row gap-12 items-center">
          <div className="w-full md:w-1/2">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant block mb-4">Reading Stats</span>
            <h3 className="serif-text text-3xl mb-4 leading-tight">Your focused sanctuary.</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">Record your thoughts as you progress through your library. Wisdom is meant to be archived.</p>
            <button onClick={() => setActiveTab('completed')} className="font-label text-xs font-semibold tracking-widest uppercase text-primary hover:underline underline-offset-4 transition-all">View Completed →</button>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-6 flex flex-col items-center justify-center rounded-xl shadow-sm w-32 h-32">
                <span className="serif-text text-3xl text-primary">{stats.totalBooks}</span>
                <span className="font-label text-[9px] uppercase tracking-widest text-outline mt-1">Books</span>
              </div>
              <div className="bg-surface-container-lowest p-6 flex flex-col items-center justify-center rounded-xl shadow-sm w-32 h-32 mt-6">
                <span className="serif-text text-3xl text-primary">{stats.completedBooks}</span>
                <span className="font-label text-[9px] uppercase tracking-widest text-outline mt-1">Finished</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


