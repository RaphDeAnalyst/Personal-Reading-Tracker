/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
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
import { Book } from './types';

type View = 
  | { type: 'dashboard' }
  | { type: 'add' }
  | { type: 'detail'; bookId: number }
  | { type: 'reflection'; bookId: number }
  | { type: 'reflection-index' }
  | { type: 'log-progress'; bookId: number }
  | { type: 'reader'; bookId: number }
  | { type: 'insights' }
  | { type: 'success'; bookId: number };

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [loggedToday, setLoggedToday] = useState(false);
  const [currentFocus, setCurrentFocus] = useState<Book | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fontPreference, setFontPreference] = useState<'serif' | 'sans'>(() => {
    return (localStorage.getItem('reading-font-pref') as 'serif' | 'sans') || 'serif';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('reading-theme') as 'light' | 'dark') || 'light';
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

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
        const books: Book[] = await res.json();
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
  }, [view]);

  const handleResumeReading = (book: Book) => {
    if (book.mode === 'DIGITAL') {
      setView({ type: 'reader', bookId: book.id });
    } else {
      setView({ type: 'log-progress', bookId: book.id });
    }
  };

  const currentView = () => {
    switch (view.type) {
      case 'dashboard':
        return (
          <Dashboard 
            onSelectBook={(id) => setView({ type: 'detail', bookId: id })} 
            onAddBook={() => setView({ type: 'add' })} 
            onLogCurrent={() => currentFocus && handleResumeReading(currentFocus)}
            showToast={showToast}
          />
        );
      case 'add':
        return <AddBook onBack={() => setView({ type: 'dashboard' })} onAdded={() => { fetchBooks(); setView({ type: 'dashboard' }); }} showToast={showToast} />;
      case 'detail':
        return (
          <BookDetailView 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'dashboard' })} 
            onLogProgress={(id) => setView({ type: 'log-progress', bookId: id })}
            onWriteReflection={(id) => setView({ type: 'reflection', bookId: id })}
            onOpenReader={(id) => setView({ type: 'reader', bookId: id })}
            onDelete={() => { fetchBooks(); setView({ type: 'dashboard' }); }}
            showToast={showToast}
          />
        );
      case 'reflection':
        return (
          <ReflectionView 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'reflection-index' })} 
            onComplete={(id) => setView({ type: 'success', bookId: id })}
            showToast={showToast}
          />
        );
      case 'reflection-index':
        return (
          <ReflectionIndexView 
            onSelectBook={(id) => setView({ type: 'reflection', bookId: id })}
          />
        );
      case 'insights':
        return <InsightsView showToast={showToast} fontPreference={fontPreference} onToggleFont={toggleFont} theme={theme} onToggleTheme={toggleTheme} />;
      case 'log-progress':
        return (
          <LogProgressView 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'detail', bookId: view.bookId })} 
            onSaved={() => { checkStatus(); setView({ type: 'detail', bookId: view.bookId }); }} 
            onViewJournal={(id) => setView({ type: 'reflection', bookId: id })}
            showToast={showToast}
          />
        );
      case 'reader':
        return (
          <PDFReader 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'detail', bookId: view.bookId })}
            onFinish={() => setView({ type: 'success', bookId: view.bookId })}
            showToast={showToast}
          />
        );
      case 'success':
        return (
          <SuccessView 
            bookId={view.bookId} 
            onFinish={() => { fetchBooks(); setView({ type: 'dashboard' }); }} 
            onViewJournal={() => setView({ type: 'reflection', bookId: view.bookId })}
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
            onClose={() => setIsSidebarOpen(!isSidebarOpen)} 
            onNavigate={(v) => {
              setView(v);
              setIsSidebarOpen(false);
            }}
            currentView={view.type}
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
              <span className="material-symbols-outlined text-primary text-[18px]">event_note</span>
              <div className="flex flex-col">
                <span className="font-label text-[10px] font-semibold uppercase tracking-[0.12em] text-on-surface leading-none">Activity Alert</span>
                <span className="font-label text-[11px] text-on-surface-variant mt-0.5">You haven’t logged progress today. Stay focused on your journey.</span>
              </div>
            </div>
            <button 
              onClick={() => setShowAlert(false)}
              className="text-on-surface-variant/60 hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
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
                if (view.type === 'detail') setView({ type: 'dashboard' });
                else if (view.type === 'reflection') setView({ type: 'reflection-index' });
                else if (view.type === 'reflection-index') setView({ type: 'dashboard' });
                else if (view.type === 'log-progress') setView({ type: 'detail', bookId: (view as any).bookId });
                else if (view.type === 'insights') setView({ type: 'dashboard' });
                else setView({ type: 'dashboard' });
              }}
              className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors md:hidden"
            >
              <span className="material-symbols-outlined text-primary text-2xl cursor-pointer">menu</span>
            </button>
          )}
        </div>
        <h1 
          onClick={() => setView({ type: 'dashboard' })}
          className="font-headline italic text-2xl tracking-tight text-on-surface cursor-pointer"
        >
          The Archivist
        </h1>
        <button 
          onClick={() => setView({ type: 'insights' })}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${view.type === 'insights' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: view.type === 'insights' ? "'FILL' 1" : "'FILL' 0" }}>
            analytics
          </span>
        </button>
      </header>
        </>
      )}

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${isReading ? 'p-0 pt-0 max-w-none' : (showAlert && !loggedToday ? 'pt-32' : 'pt-20')} pb-32 px-6 max-w-5xl mx-auto`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view.type + (view.type === 'detail' || view.type === 'reflection' || view.type === 'log-progress' || view.type === 'reader' ? (view as any).bookId : '')}
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
              <span className="material-symbols-outlined text-[18px]">
                {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
              </span>
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Responsive Navigation DOCK (Desktop: Visible | Mobile: Hidden) */}
      {!isReading && (
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 hidden md:flex items-center gap-2 p-2 bg-background/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(48,51,49,0.12)] border border-outline-variant/10 rounded-2xl">
        <button 
          onClick={() => setView({ type: 'dashboard' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'dashboard' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: view.type === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>import_contacts</span>
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Library</span>
        </button>
        <button 
          onClick={() => setView({ type: 'add' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'add' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: view.type === 'add' ? "'FILL' 1" : "'FILL' 0" }}>add_circle</span>
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Add New</span>
        </button>
        <button 
          onClick={() => currentFocus && handleResumeReading(currentFocus)}
          disabled={!currentFocus}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'log-progress' || view.type === 'reader' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'} ${!currentFocus ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: view.type === 'log-progress' || view.type === 'reader' ? "'FILL' 1" : "'FILL' 0" }}>edit_note</span>
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Log Progress</span>
        </button>
        <div className="w-[1px] h-6 bg-outline-variant/20 mx-1"></div>
        <button 
          onClick={() => setView({ type: 'reflection-index' })}
          className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-200 ${view.type === 'reflection-index' || view.type === 'reflection' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: view.type === 'reflection-index' || view.type === 'reflection' ? "'FILL' 1" : "'FILL' 0" }}>auto_stories</span>
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">Reflections</span>
        </button>
      </nav>
      )}
    </div>
  );
}

