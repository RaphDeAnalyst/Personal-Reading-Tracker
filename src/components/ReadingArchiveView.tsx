import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import Icon from './Icon';
import { Archive, BookOpen, Star, Search, X } from 'lucide-react';

interface ArchiveEntry {
  id: number;
  year: number;
  book_id: number;
  completed_at: string;
  title: string;
  author: string;
  cover_url: string | null;
  mode: 'PHYSICAL' | 'DIGITAL' | null;
  pdf_file_path: string | null;
  book_exists: number;
  reflection_id: number | null;
  rating: number | null;
  content: string | null;
  learning: string | null;
  application: string | null;
  disagreement: string | null;
}

interface ReadingArchiveViewProps {
  onSelectBook?: (bookId: number) => void;
  onOpenReader?: (bookId: number) => void;
  onWriteReflection?: (bookId: number) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function ReadingArchiveView({
  onSelectBook,
  onOpenReader,
  onWriteReflection,
  showToast,
}: ReadingArchiveViewProps) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/goals/reading-list')
      .then(r => {
        if (!r.ok) throw new Error('Failed');
        return r.json();
      })
      .then((data: ArchiveEntry[]) => {
        setEntries(data);
        // Default to the most recent year that has data
        if (data.length > 0) {
          const years = [...new Set(data.map(e => e.year))].sort((a, b) => b - a);
          setSelectedYear(years[0]);
        }
      })
      .catch(() => showToast?.('Could not load reading archive', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const availableYears = useMemo(
    () => [...new Set(entries.map(e => e.year))].sort((a, b) => b - a),
    [entries]
  );

  const filtered = useMemo(() => {
    const byYear = entries.filter(e => e.year === selectedYear);
    if (!search.trim()) return byYear;
    const q = search.toLowerCase();
    return byYear.filter(
      e => e.title.toLowerCase().includes(q) || e.author.toLowerCase().includes(q)
    );
  }, [entries, selectedYear, search]);

  const yearTotal = useMemo(
    () => entries.filter(e => e.year === selectedYear).length,
    [entries, selectedYear]
  );

  const allTimeTotal = entries.length;

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        <p className="font-headline italic text-on-surface-variant text-lg">Opening the archive...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Icon icon={Archive} size="lg" variant="primary" />
          <h2 className="serif-text text-3xl sm:text-4xl text-on-surface">Reading Archive</h2>
        </div>
        <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest">
          Every book you have ever completed — preserved permanently
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
          <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">All-Time</span>
          <span className="serif-text text-3xl text-on-surface font-medium">{allTimeTotal}</span>
          <span className="block font-label text-[9px] text-on-surface-variant mt-0.5">Books completed</span>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10">
          <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">{selectedYear}</span>
          <span className="serif-text text-3xl text-primary font-medium">{yearTotal}</span>
          <span className="block font-label text-[9px] text-on-surface-variant mt-0.5">Books completed</span>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/10 col-span-2 sm:col-span-1">
          <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Years tracked</span>
          <span className="serif-text text-3xl text-secondary font-medium">{availableYears.length}</span>
          <span className="block font-label text-[9px] text-on-surface-variant mt-0.5">
            {availableYears.length > 0 ? `${availableYears[availableYears.length - 1]} – ${availableYears[0]}` : '—'}
          </span>
        </div>
      </div>

      {/* Year tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Year tabs */}
        <div className="flex gap-2 flex-wrap flex-1">
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => { setSelectedYear(year); setSearch(''); }}
              className={[
                'px-4 py-1.5 rounded-full font-label text-[10px] font-bold uppercase tracking-widest transition-colors',
                selectedYear === year
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
              ].join(' ')}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-56">
          <Icon
            icon={Search}
            size="sm"
            variant="muted"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or author…"
            className="w-full pl-8 pr-8 py-2 bg-surface-container border border-outline-variant/20 rounded-xl font-label text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <Icon icon={X} size="sm" variant="inherit" />
            </button>
          )}
        </div>
      </div>

      {/* Book list */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-on-surface-variant">
          <Icon icon={Archive} size="xl" variant="muted" />
          <p className="font-headline italic text-lg">Your archive is empty.</p>
          <p className="text-sm text-center max-w-xs">
            Every book you mark as completed will be preserved here permanently, even if you later remove it from your library.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-on-surface-variant">
          <Icon icon={Search} size="xl" variant="muted" />
          <p className="font-headline italic text-base">No matches for "{search}"</p>
          <button
            onClick={() => setSearch('')}
            className="text-xs text-primary hover:underline font-label uppercase tracking-widest"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry, i) => {
            const reflectionSnippet = entry.learning || entry.content || '';
            const displayDate = new Date(entry.completed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
                className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 flex gap-4 hover:shadow-md transition-shadow"
              >
                {/* Cover */}
                <div className="w-12 h-16 bg-surface-container rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant/10">
                  {entry.cover_url ? (
                    <img src={entry.cover_url} alt={entry.title} className="w-full h-full object-cover" />
                  ) : (
                    <Icon icon={BookOpen} size="md" variant="muted" />
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <h3 className="font-serif text-sm font-semibold text-on-surface leading-snug break-words">
                        {entry.title}
                      </h3>
                      <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant mt-0.5">
                        {entry.author}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!entry.book_exists && (
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-error/10 text-error px-2 py-0.5 rounded-full">
                          Removed
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="font-label text-[10px] text-on-surface-variant mb-2">{displayDate}</p>

                  {/* Star rating */}
                  {entry.rating != null && (
                    <div className="flex gap-0.5 mb-2">
                      {[...Array(5)].map((_, idx) => (
                        <Icon
                          key={idx}
                          icon={Star}
                          size="xs"
                          className={idx < entry.rating! ? 'fill-tertiary text-tertiary' : 'text-outline-variant/30'}
                        />
                      ))}
                    </div>
                  )}

                  {/* Reflection snippet */}
                  {reflectionSnippet && (
                    <p className="text-[11px] text-on-surface-variant italic line-clamp-2 mb-3 leading-relaxed">
                      "{reflectionSnippet}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {entry.book_exists && (
                      <>
                        <button
                          onClick={() => onSelectBook?.(entry.book_id)}
                          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                        >
                          View
                        </button>
                        {entry.mode === 'DIGITAL' && entry.pdf_file_path && (
                          <button
                            onClick={() => onOpenReader?.(entry.book_id)}
                            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                          >
                            Read
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => onWriteReflection?.(entry.book_id)}
                      className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                    >
                      {entry.reflection_id ? 'Edit Reflection' : 'Write Reflection'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="mt-8 text-center font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          {search
            ? `${filtered.length} of ${yearTotal} books in ${selectedYear}`
            : `${yearTotal} ${yearTotal === 1 ? 'book' : 'books'} completed in ${selectedYear}`}
        </p>
      )}
    </div>
  );
}
