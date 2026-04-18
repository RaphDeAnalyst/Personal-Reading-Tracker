import { useState, useEffect } from 'react';
import { Book } from '../types';
import { BookOpen, CheckCircle2, CircleDashed, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardProps {
  onSelectBook: (id: number) => void;
  onAddBook: () => void;
}

export default function Dashboard({ onSelectBook, onAddBook }: DashboardProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/books')
      .then(res => res.json())
      .then(data => {
        setBooks(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-20 font-mono text-sm opacity-50">INITIALIZING SYSTEMS...</div>;

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-white border border-[#dadada] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <BookOpen className="w-8 h-8 text-[#8e8e8e]" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No books found</h2>
        <p className="text-[#8e8e8e] mb-8 max-w-xs">Start your reading journey by adding your first book to the tracker.</p>
        <button 
          onClick={onAddBook}
          className="px-6 py-2.5 bg-[#141414] text-white rounded-full text-sm font-medium hover:bg-opacity-90 transition-all"
        >
          Add My First Book
        </button>
      </div>
    );
  }

  const currentlyReading = books.find(b => b.status === 'IN_PROGRESS') || books[0];
  const libraryBooks = books.filter(b => b.id !== currentlyReading?.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-20">
      {/* Left Column: Hero Section */}
      <section className="flex flex-col justify-between border-r border-ink/10 pr-20 min-h-[600px]">
        {currentlyReading ? (
          <div>
            <span className="label-caps mb-8 block">Currently Reading</span>
            <h2 className="bold-title mb-10 group cursor-pointer" onClick={() => onSelectBook(currentlyReading.id)}>
              {currentlyReading.title}
            </h2>
            
            <div className="flex items-center gap-10">
              <div className="massive-stat text-[120px]">
                {Math.round((currentlyReading.current_page / currentlyReading.total_pages) * 100)}%
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold uppercase tracking-widest">{currentlyReading.current_page} of {currentlyReading.total_pages} pages</p>
                <p className="text-sm font-bold uppercase tracking-widest text-accent">{currentlyReading.total_pages - currentlyReading.current_page} pages left</p>
                <p className="text-muted italic">{currentlyReading.author}</p>
              </div>
            </div>

            <div className="w-full h-2 bg-ink/5 mt-10 relative">
              <div 
                className="absolute h-full bg-accent transition-all duration-1000"
                style={{ width: `${(currentlyReading.current_page / currentlyReading.total_pages) * 100}%` }}
              />
            </div>

            <div className="mt-20">
              <span className="label-caps mb-6 block">Historical View</span>
              <div className="flex items-end gap-3 h-32">
                {[30, 50, 20, 80, 45, 60, 10].map((h, i) => (
                  <div 
                    key={i} 
                    className={clsx(
                      "flex-1 transition-all duration-500",
                      i === 3 ? "bg-accent" : "bg-ink"
                    )}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-muted italic">Initialize a project to view the command center.</div>
        )}
      </section>

      {/* Right Column: Library Sidebar */}
      <aside className="flex flex-col gap-10">
        <div>
          <span className="label-caps mb-6 block">Your Library</span>
          <ul className="space-y-4">
            {(libraryBooks.length > 0 ? libraryBooks : books).map(book => (
              <li 
                key={book.id} 
                onClick={() => onSelectBook(book.id)}
                className="group flex justify-between items-center py-4 border-b border-ink/10 cursor-pointer hover:border-ink transition-all"
              >
                <div className="book-info">
                  <h4 className="font-bold text-base leading-tight group-hover:text-accent transition-colors">{book.title}</h4>
                  <p className="text-xs text-muted font-medium">{book.author}</p>
                </div>
                <span className={clsx(
                  "text-[9px] px-2 py-0.5 border border-ink rounded-full uppercase font-bold tracking-widest",
                  book.status === 'COMPLETED' ? "bg-ink text-bg" : "text-ink"
                )}>
                  {book.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <span className="label-caps mb-6 block">Performance Stats</span>
          <div className="flex gap-10">
            <div className="stat-box flex-1">
              <p className="label-caps text-[9px] mb-2">Reading Streak</p>
              <span className="text-2xl font-bold tracking-tight">12 Days</span>
            </div>
            <div className="stat-box flex-1">
              <p className="label-caps text-[9px] mb-2">Avg Daily</p>
              <span className="text-2xl font-bold tracking-tight">24 Pgs</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onAddBook}
          className="bg-ink text-bg w-full py-5 font-bold text-xs uppercase tracking-[2px] mt-auto hover:opacity-80 transition-all shadow-xl shadow-black/10"
        >
          Initialize New Record
        </button>
      </aside>
    </div>
  );
}
