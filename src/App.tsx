/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './components/Dashboard';
import AddBook from './components/AddBook';
import BookDetailView from './components/BookDetailView';
import ReflectionView from './components/ReflectionView';
import LogProgressView from './components/LogProgressView';
import SuccessView from './components/SuccessView';
import ReflectionIndexView from './components/ReflectionIndexView';
import PDFReader from './components/PDFReader';
import Sidebar from './components/Sidebar';
import InsightsView from './components/InsightsView';
import ReadingArchiveView from './components/ReadingArchiveView';
import Icon from './components/Icon';
import { Book as BookType } from './types';
import {
  ArrowLeft, Menu, BarChart2, Moon, Sun, X,
  CheckCircle, AlertCircle, Info,
  BookOpen, Plus, PenLine, Quote, Archive
} from 'lucide-react';


type View = 
  | { type: 'dashboard' }
  | { type: 'add' }
  | { type: 'detail'; bookId: number }
  | { type: 'reflection'; bookId: number }
  | { type: 'reflection-index' }
  | { type: 'log-progress'; bookId: number }
  | { type: 'reader'; bookId: number }
  | { type: 'insights' }
  | { type: 'archive' }
  | { type: 'success'; bookId: number };

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const parseViewFromUrl = (): View => {
  const params = new URLSearchParams(window.location.search);
  const viewType = params.get('view');
  const bookId = params.get('bookId');

  switch (viewType) {
    case 'add':
      return { type: 'add' };
    case 'detail':
      return bookId ? { type: 'detail', bookId: parseInt(bookId) } : { type: 'dashboard' };
    case 'reflection':
      return bookId ? { type: 'reflection', bookId: parseInt(bookId) } : { type: 'dashboard' };
    case 'reflection-index':
      return { type: 'reflection-index' };
    case 'log-progress':
      return bookId ? { type: 'log-progress', bookId: parseInt(bookId) } : { type: 'dashboard' };
    case 'reader':
      return bookId ? { type: 'reader', bookId: parseInt(bookId) } : { type: 'dashboard' };
    case 'insights':
      return { type: 'insights' };
    case 'archive':
      return { type: 'archive' };
    case 'success':
      return bookId ? { type: 'success', bookId: parseInt(bookId) } : { type: 'dashboard' };
    default:
      return { type: 'dashboard' };
  }
};

const updateUrl = (newView: View) => {
  let query = '';
  if (newView.type === 'dashboard') {
    query = '?view=dashboard';
  } else if (newView.type === 'add') {
    query = '?view=add';
  } else if (newView.type === 'detail' || newView.type === 'reflection' || newView.type === 'log-progress' || newView.type === 'reader' || newView.type === 'success') {
    query = `?view=${newView.type}&bookId=${newView.bookId}`;
  } else if (newView.type === 'reflection-index') {
    query = '?view=reflection-index';
  } else if (newView.type === 'insights') {
    query = '?view=insights';
  } else if (newView.type === 'archive') {
    query = '?view=archive';
  }

  const newUrl = `${window.location.pathname}${query}`;
  if (window.location.search !== query) {
    window.history.pushState({ view: newView }, '', newUrl);
  }
};

export default function App() {
  const [view, setView] = useState<View>(() => parseViewFromUrl());
  const [loggedToday, setLoggedToday] = useState(false);
  const [currentFocus, setCurrentFocus] = useState<BookType | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fontPreference, setFontPreference] = useState<'serif' | 'sans'>(() => {
    return (localStorage.getItem('reading-font-pref') as 'serif' | 'sans') || 'serif';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('reading-theme') as 'light' | 'dark') || 'light';
  });

  const toastCounter = useRef(0);
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const toggleFont = () => {
    const next = fontPreference === 'serif' ? 'sans' : 'serif';
    setFontPreference(next);
    localStorage.setItem('reading-font-pref', next);
    showToast(`Font preference updated to ${next}`, "info");
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('reading-theme', next);
    showToast(`Theme updated to ${next} mode`, "info");
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/dashboard/status');
      if (res.ok) {
        const data = await res.json();
        setLoggedToday(data.loggedToday);
      }
    } catch (e) {
      console.error("Failed to fetch dashboard status", e);
    }
  };

  const fetchBooks = async () => {
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const books: BookType[] = await res.json();
        const active = books.find(b => b.status === 'IN_PROGRESS');
        setCurrentFocus(active || null);
      }
    } catch (e) {
      console.error("Failed to fetch books", e);
    }
  };

  useEffect(() => {
    checkStatus();
    fetchBooks();
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        setView(event.state.view);
      } else {
        setView(parseViewFromUrl());
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (newView: View) => {
    setView(newView);
    updateUrl(newView);
  };

  const handleResumeReading = (book: BookType) => {
    if (book.mode === 'DIGITAL') {
      navigateTo({ type: 'reader', bookId: book.id });
    } else {
      navigateTo({ type: 'log-progress', bookId: book.id });
    }
  };

  const currentView = () => {
    switch (view.type) {
      case 'dashboard':
        return (
          <Dashboard
            onSelectBook={(id) => navigateTo({ type: 'detail', bookId: id })}
            onAddBook={() => navigateTo({ type: 'add' })}
            onLogCurrent={() => currentFocus && handleResumeReading(currentFocus)}
            showToast={showToast}
          />
        );
      case 'add':
        return <AddBook onBack={() => navigateTo({ type: 'dashboard' })} onAdded={() => { fetchBooks(); navigateTo({ type: 'dashboard' }); }} showToast={showToast} />;
      case 'detail':
        return (
          <BookDetailView 
            bookId={view.bookId} 
            onBack={() => navigateTo({ type: 'dashboard' })} 
            onLogProgress={(id) => navigateTo({ type: 'log-progress', bookId: id })}
            onWriteReflection={(id) => navigateTo({ type: 'reflection', bookId: id })}
            onOpenReader={(id) => navigateTo({ type: 'reader', bookId: id })}
            onDelete={() => { fetchBooks(); navigateTo({ type: 'dashboard' }); }}
            showToast={showToast}
          />
        );
      case 'reflection':
        return (
          <ReflectionView 
            bookId={view.bookId} 
            onBack={() => navigateTo({ type: 'reflection-index' })} 
            onComplete={(id) => navigateTo({ type: 'success', bookId: id })}
            showToast={showToast}
          />
        );
      case 'reflection-index':
        return (
          <ReflectionIndexView 
            onSelectBook={(id) => navigateTo({ type: 'reflection', bookId: id })}
          />
        );
      case 'insights':
        return (
          <InsightsView
            showToast={showToast}
            fontPreference={fontPreference}
            onToggleFont={toggleFont}
            theme={theme}
            onToggleTheme={toggleTheme}
            onSelectBook={(bookId) => navigateTo({ type: 'detail', bookId })}
            onOpenReader={(bookId) => navigateTo({ type: 'reader', bookId })}
            onWriteReflection={(bookId) => navigateTo({ type: 'reflection', bookId })}
          />
        );
      case 'archive':
        return (
          <ReadingArchiveView
            showToast={showToast}
            onSelectBook={(bookId) => navigateTo({ type: 'detail', bookId })}
            onOpenReader={(bookId) => navigateTo({ type: 'reader', bookId })}
            onWriteReflection={(bookId) => navigateTo({ type: 'reflection', bookId })}
          />
        );
      case 'log-progress':
        return (
          <LogProgressView 
            bookId={view.bookId} 
            onBack={() => navigateTo({ type: 'detail', bookId: view.bookId })} 
            onSaved={() => { checkStatus(); navigateTo({ type: 'detail', bookId: view.bookId }); }} 
            onViewJournal={(id) => navigateTo({ type: 'reflection', bookId: id })}
            showToast={showToast}
          />
        );
      case 'reader':
        return (
          <PDFReader 
            bookId={view.bookId} 
            onBack={() => navigateTo({ type: 'detail', bookId: view.bookId })}
            onFinish={() => navigateTo({ type: 'success', bookId: view.bookId })}
            showToast={showToast}
          />
        );
      case 'success':
        return (
          <SuccessView 
            bookId={view.bookId} 
            onFinish={() => { fetchBooks(); navigateTo({ type: 'dashboard' }); }} 
            onViewJournal={() => navigateTo({ type: 'reflection', bookId: view.bookId })}
          />
        );
    }
  };

  const isReading = view.type === 'reader';

  return (
    <div className={`min-h-screen bg-background text-on-surface font-body selection:bg-primary-container font-pref-${fontPreference} ${theme} ${isReading ? 'overflow-hidden' : ''}`}>
      {!isReading && (
        <>
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onNavigate={(v) => {
              navigateTo(v);
              setIsSidebarOpen(false);
            }}
            currentView={view.type}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

      {/* Top Alert Banner */}
      <AnimatePresence>
      {showAlert && !loggedToday && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`fixed top-16 left-0 right-0 w-full z-40 bg-secondary-container/30 backdrop-blur-md border-b border-outline-variant/5 overflow-hidden`}
        >
          <div className="px-6 py-2.5 flex items-center justify-between max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface leading-none">Activity Alert</span>
                <span className="font-label text-[11px] text-on-surface-variant mt-0.5">You haven’t logged progress today. Stay focused on your journey.</span>
              </div>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              className="text-on-surface-variant/60 hover:text-on-surface transition-colors"
            >
              <Icon icon={X} size="lg" variant="inherit" />
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Top Header */}
      <header className={`fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-background/95 backdrop-blur-sm border-b border-outline-variant/5 transition-all duration-300`}>
        <div className="flex items-center gap-4">
          {view.type !== 'dashboard' ? (
            <button
              onClick={() => {
                if (view.type === 'detail') navigateTo({ type: 'dashboard' });
                else if (view.type === 'reflection') navigateTo({ type: 'reflection-index' });
                else if (view.type === 'reflection-index') navigateTo({ type: 'dashboard' });
                else if (view.type === 'log-progress') navigateTo({ type: 'detail', bookId: view.bookId });
                else if (view.type === 'insights') navigateTo({ type: 'dashboard' });
                else navigateTo({ type: 'dashboard' });
              }}
              className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            >
              <Icon icon={ArrowLeft} size="lg" variant="inherit" />
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors md:hidden"
            >
              <Icon icon={Menu} size="lg" variant="inherit" />
            </button>
          )}
        </div>
        <h1 
          onClick={() => navigateTo({ type: 'dashboard' })}
          className="font-headline italic text-2xl tracking-tight text-on-surface cursor-pointer"
        >
          The Archivist
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo({ type: 'insights' })}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${view.type === 'insights' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            title="View insights"
          >
            <Icon icon={BarChart2} size="lg" variant={view.type === 'insights' ? 'inverted' : 'inherit'} />
          </button>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all text-on-surface-variant hover:bg-surface-container-low"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            <Icon icon={theme === 'light' ? Moon : Sun} size="lg" variant="inherit" />
          </button>
        </div>
      </header>
        </>
      )}

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${isReading ? 'p-0 pt-0 max-w-none' : (showAlert && !loggedToday ? 'pt-32' : 'pt-20')} pb-32 px-6 max-w-5xl mx-auto`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view.type + ('bookId' in view ? view.bookId : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Toast Container */}
      <div className="fixed bottom-24 md:bottom-32 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              className={`px-4 py-2.5 rounded-lg shadow-lg text-xs font-label font-bold uppercase tracking-widest flex items-center gap-3 border pointer-events-auto ${
                toast.type === 'success' ? 'bg-tertiary-container text-on-tertiary-container border-tertiary/20' :
                toast.type === 'error' ? 'bg-error-container text-on-error-container border-error/20' :
                'bg-surface-container-high text-on-surface border-outline-variant/20'
              }`}
            >
              <Icon
                icon={
                  toast.type === 'success' ? CheckCircle :
                  toast.type === 'error' ? AlertCircle :
                  Info
                }
                size="sm"
                variant="inherit"
              />
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Responsive Navigation DOCK (Desktop: Visible | Mobile: Hidden) */}
      {!isReading && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-2 p-2 bg-background/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(48,51,49,0.12)] border border-outline-variant/10 rounded-2xl">
        <button
          onClick={() => navigateTo({ type: 'dashboard' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'dashboard' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <Icon icon={BookOpen} size="md" variant={view.type === 'dashboard' ? 'inverted' : 'inherit'} />
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Library</span>
        </button>
        <button
          onClick={() => navigateTo({ type: 'add' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'add' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <Icon icon={Plus} size="md" variant={view.type === 'add' ? 'inverted' : 'inherit'} />
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Add New</span>
        </button>
        <button
          onClick={() => currentFocus && handleResumeReading(currentFocus)}
          disabled={!currentFocus}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'log-progress' || view.type === 'reader' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'} ${!currentFocus ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <Icon icon={PenLine} size="md" variant={view.type === 'log-progress' || view.type === 'reader' ? 'inverted' : 'inherit'} />
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Log Progress</span>
        </button>
        <div className="w-[1px] h-6 bg-outline-variant/20 mx-1"></div>
        <button
          onClick={() => navigateTo({ type: 'reflection-index' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'reflection-index' || view.type === 'reflection' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <Icon icon={Quote} size="md" variant={view.type === 'reflection-index' || view.type === 'reflection' ? 'inverted' : 'inherit'} />
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Reflections</span>
        </button>
        <button
          onClick={() => navigateTo({ type: 'insights' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'insights' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <Icon icon={BarChart2} size="md" variant={view.type === 'insights' ? 'inverted' : 'inherit'} />
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Insights</span>
        </button>
        <button
          onClick={() => navigateTo({ type: 'archive' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'archive' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <Icon icon={Archive} size="md" variant={view.type === 'archive' ? 'inverted' : 'inherit'} />
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Archive</span>
        </button>
      </nav>
      )}
    </div>
  );
}

