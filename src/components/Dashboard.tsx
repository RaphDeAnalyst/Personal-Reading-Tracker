import { useState, useEffect } from 'react';
import { Book, ReadingGoal, Tag } from '../types';
import { Book, Clock, Plus, BookOpen, Search, X, SearchX } from 'lucide-react';


interface DashboardProps {
  onSelectBook: (id: number) => void;
  onAddBook: () => void;
  onLogCurrent: (book: Book) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface BookCardProps {
  book: Book;
  onSelect: (id: number) => void;
  key?: any;
}

function ReadingGoalCard({ completedCount, showToast }: { completedCount: number, showToast?: (message: string, type: 'success' | 'error' | 'info') => void }) {
  const currentYear = new Date().getFullYear();
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/goals/${currentYear}`)
      .then(res => res.json())
      .then(data => {
        setGoal(data);
        setEditValue(data.target_value?.toString() || '0');
      })
      .catch(err => console.error("Failed to fetch goal:", err));
  }, [currentYear]);

  const handleSave = async () => {
    const value = parseInt(editValue);
    if (isNaN(value) || value < 0) {
      showToast?.("Invalid goal value", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: currentYear, target_value: value })
      });
      if (res.ok) {
        const updatedGoal = await res.json();
        setGoal(updatedGoal);
        setIsEditing(false);
        showToast?.(`Annual goal updated to ${value} books`, "success");
      }
    } catch (err) {
      console.error("Failed to save goal:", err);
      showToast?.("Network error while saving goal", "error");
    } finally {
      setLoading(false);
    }
  };

  const target = goal?.target_value || 0;
  const progress = target > 0 ? Math.min(100, Math.round((completedCount / target) * 100)) : 0;

  return (
    <div className="bg-surface-container-lowest p-6 flex flex-col items-center justify-center rounded-xl shadow-sm w-full md:w-64 relative group border border-outline-variant/10">
      <div className="flex flex-col items-center w-full">
        <span className="font-label text-[10px] uppercase tracking-widest text-outline-variant font-bold mb-4">{currentYear} Reading Goal</span>
        
        {isEditing ? (
          <div className="flex flex-col items-center gap-4 w-full animate-in fade-in zoom-in-95 duration-200">
            <input 
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-20 text-center bg-surface border-b-2 border-primary outline-none serif-text text-3xl py-1 text-on-surface"
              autoFocus
            />
            <div className="flex gap-4">
              <button 
                onClick={handleSave} 
                disabled={loading}
                className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                {loading ? '...' : 'Save'}
              </button>
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-[10px] font-bold uppercase tracking-widest text-outline-variant hover:text-on-surface"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="serif-text text-5xl text-primary">{completedCount}</span>
              <span className="serif-text text-xl text-outline-variant italic">/</span>
              <span className="serif-text text-2xl text-on-surface-variant">{target}</span>
            </div>
            
            <div className="w-full space-y-3">
              <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-tertiary transition-all duration-1000" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{progress}% complete</span>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-widest"
                >
                  Set Goal
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
                <Book className="w-6 h-6" />
              </div>
            )}
        </div>
        <div className="flex flex-col h-full py-0.5 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${book.status === 'COMPLETED' ? 'bg-outline' : book.status === 'IN_PROGRESS' && book.current_page > 0 ? 'bg-tertiary shadow-[0_0_4px_rgba(89,99,66,0.3)]' : 'bg-outline-variant/40'}`}></span>
            <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">{statusLabel}</span>
          </div>
          <h3 className="serif-text text-xl text-on-surface leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2 break-words">{book.title}</h3>
          <p className="font-label text-[11px] text-on-surface-variant mb-4 italic line-clamp-2 break-words">{book.author}</p>
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
  const [activeTab, setActiveTab] = useState<'all' | 'now' | 'next' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'date' | 'title' | 'author' | 'progress'>('date');
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [booksRes, tagsRes, statsRes] = await Promise.all([
          fetch('/api/books'),
          fetch('/api/tags'),
          fetch('/api/dashboard/status')
        ]);

        if (!booksRes.ok) throw new Error(`Books fetch failed: ${booksRes.status}`);

        const booksData: Book[] = await booksRes.json();
        setBooks(booksData);

        const active = booksData.find(b => b.status === 'IN_PROGRESS' && (b.current_page || 0) > 0);
        setCurrentBook(active || null);

        if (tagsRes.ok) {
          const tagsData: Tag[] = await tagsRes.json();
          setAllTags(tagsData);
        }

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

  // Tag filtering helper
  const matchesTags = (book: Book) => {
    if (selectedTagIds.length === 0) return true;
    const bookTagIds = (book.tags || []).map(t => t.id);
    return selectedTagIds.some(tagId => bookTagIds.includes(tagId));
  };

  // Tab filtering (only used when not searching)
  const tabBooks = books.filter(b => {
    const pages = b.current_page || 0;
    const tabMatch = activeTab === 'all'
      ? true
      : activeTab === 'now'
      ? b.status === 'IN_PROGRESS' && pages > 0 && b.status !== 'COMPLETED'
      : activeTab === 'next'
      ? (b.status === 'NOT_STARTED') || (b.status === 'IN_PROGRESS' && pages === 0)
      : activeTab === 'completed'
      ? b.status === 'COMPLETED'
      : false;

    return tabMatch && matchesTags(b);
  });

  // Sort function
  const applySorting = (booksToSort: Book[]) => {
    const sorted = [...booksToSort];
    switch (sortOrder) {
      case 'title':
        sorted.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        break;
      case 'author':
        sorted.sort((a, b) => (a.author || '').toLowerCase().localeCompare((b.author || '').toLowerCase()));
        break;
      case 'progress':
        sorted.sort((a, b) => {
          const progressA = (a.current_page || 0) / a.total_pages;
          const progressB = (b.current_page || 0) / b.total_pages;
          return progressB - progressA; // Descending (highest progress first)
        });
        break;
      case 'date':
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    return sorted;
  };

  const sortedTabBooks = applySorting(tabBooks);

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
          <Clock className="w-6 h-6" />
          <span className="font-label text-[12px] font-medium text-on-surface-variant tracking-wide">
            Today: <span className="text-on-surface font-semibold">{stats.pagesReadToday > 0 ? `${stats.pagesReadToday} pages read` : 'No reading logged today'}</span>
          </span>
        </div>
        <button 
          onClick={() => currentBook && onLogCurrent(currentBook)} 
          className="font-label text-[10px] uppercase tracking-widest text-primary font-bold hover:underline transition-all"
        >
          Log Now
        </button>
      </section>

      {/* Current Focus Section - Hide when searching */}
      {!isSearching && (
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <span className="font-label text-on-surface-variant text-[0.75rem] uppercase tracking-widest font-semibold">Active Selection</span>
            <button onClick={onAddBook} className="flex items-center gap-1.5 text-primary hover:text-primary-dim transition-colors">
              <Plus className="w-6 h-6" />
              <span className="font-label text-[11px] font-semibold uppercase tracking-widest">New Entry</span>
            </button>
          </div>

          {currentBook ? (
            <div className="bg-surface-container-highest rounded-[1.5rem] p-6 md:p-10 flex flex-col md:flex-row gap-10 items-center md:items-start shadow-md border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div 
                onClick={() => onSelectBook(currentBook.id)}
                className="w-48 h-72 sm:w-56 sm:h-80 flex-shrink-0 bg-surface-container-highest overflow-hidden rounded-lg shadow-[0_20px_50px_rgba(48,51,49,0.18)] z-10 cursor-pointer transition-transform duration-500 group-hover:scale-[1.02]"
              >
                 {currentBook.cover_url ? (
                    <img src={currentBook.cover_url} alt={currentBook.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-outline-variant/30">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  )}
              </div>
              <div className="flex flex-col flex-grow w-full z-10 min-w-0">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(89,99,66,0.4)]"></span>
                  <span className="font-label text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">Focusing on</span>
                </div>
                <h2 className="serif-text text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-on-surface mb-3 leading-tight break-words">{currentBook.title}</h2>
                <p className="font-label text-base sm:text-lg text-on-surface-variant mb-10 italic break-words">{currentBook.author}</p>
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
                    onClick={() => currentBook && onLogCurrent(currentBook)}
                    className="w-full px-8 py-5 bg-primary text-on-primary rounded-xl font-label font-semibold text-sm tracking-[0.15em] uppercase hover:bg-primary-dim transition-all shadow-lg active:scale-[0.97] flex items-center justify-center gap-4 group"
                  >
                    <BookOpen className="w-6 h-6" />
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
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap ${activeTab === 'all' ? 'text-on-surface font-semibold underline underline-offset-[14px] decoration-primary decoration-2' : 'hover:text-on-surface'} transition-all`}
          >
            All Books
          </button>
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
          <Search className="w-6 h-6" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search archive..." 
            className="bg-transparent border-none outline-none text-xs font-label w-full sm:w-48 placeholder:text-outline-variant/50"
          />
          {isSearching && (
            <button onClick={() => setSearchQuery('')} className="text-outline-variant hover:text-on-surface">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Sort Controls & Tag Filters - Show only when not searching */}
      {!isSearching && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Sort by:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'date' | 'title' | 'author' | 'progress')}
              className="px-3 py-1.5 bg-surface-container-low border border-outline-variant/10 rounded-lg text-[11px] font-label uppercase tracking-widest text-on-surface-variant focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
            >
              <option value="date">Date Added</option>
              <option value="title">Title (A–Z)</option>
              <option value="author">Author (A–Z)</option>
              <option value="progress">Progress</option>
            </select>
          </div>

          {/* Tag Filter Pills */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Filter by tag:</span>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setSelectedTagIds(prev =>
                        prev.includes(tag.id)
                          ? prev.filter(id => id !== tag.id)
                          : [...prev, tag.id]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      selectedTagIds.includes(tag.id)
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/10'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={() => setSelectedTagIds([])}
                    className="px-2 py-1 text-[9px] text-outline-variant hover:text-on-surface transition-colors uppercase tracking-widest font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
              <SearchX className="w-6 h-6" />
              <p className="font-headline italic text-2xl text-on-surface-variant">No matches in the archive.</p>
              <p className="text-sm text-outline-variant mt-2">" {searchQuery} " yielded no results. Try another volume or author.</p>
            </div>
          )
        ) : (
          /* Regular Tab View */
          sortedTabBooks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12 animate-in fade-in duration-500">
              {sortedTabBooks.map(book => <BookCard key={book.id} book={book} onSelect={onSelectBook} />)}
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
        <section className="mt-24 bg-surface-container-low p-10 md:p-12 rounded-2xl flex flex-col lg:flex-row gap-12 items-center">
          <div className="w-full lg:w-1/2">
            <span className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant block mb-4">Reading Stats</span>
            <h3 className="serif-text text-3xl mb-4 leading-tight">Your focused sanctuary.</h3>
            <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-6">Record your thoughts as you progress through your library. Wisdom is meant to be archived.</p>
            <button onClick={() => setActiveTab('completed')} className="font-label text-xs font-semibold tracking-widest uppercase text-primary hover:underline underline-offset-4 transition-all">View Completed →</button>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col md:flex-row gap-6 items-center justify-center lg:justify-end">
            <div className="grid grid-cols-2 gap-6 h-fit">
              <div className="bg-surface-container-lowest p-6 flex flex-col items-center justify-center rounded-xl shadow-sm w-32 h-32 border border-outline-variant/10">
                <span className="serif-text text-3xl text-primary">{stats.totalBooks}</span>
                <span className="font-label text-[9px] uppercase tracking-widest text-outline mt-1">Books</span>
              </div>
              <div className="bg-surface-container-lowest p-6 flex flex-col items-center justify-center rounded-xl shadow-sm w-32 h-32 mt-6 border border-outline-variant/10">
                <span className="serif-text text-3xl text-primary">{stats.completedBooks}</span>
                <span className="font-label text-[9px] uppercase tracking-widest text-outline mt-1">Finished</span>
              </div>
            </div>
            <ReadingGoalCard completedCount={stats.completedBooks} showToast={showToast} />
          </div>
        </section>
      )}
    </div>
  );
}


