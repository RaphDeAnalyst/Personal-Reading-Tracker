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
import { Book } from './types';

type View = 
  | { type: 'dashboard' }
  | { type: 'add' }
  | { type: 'detail'; bookId: number }
  | { type: 'reflection'; bookId: number }
  | { type: 'log-progress'; bookId: number }
  | { type: 'success'; bookId: number };

export default function App() {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [loggedToday, setLoggedToday] = useState(false);
  const [currentFocusId, setCurrentFocusId] = useState<number | null>(null);
  const [showAlert, setShowAlert] = useState(true);

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
        const active = books.find(b => b.status === 'IN_PROGRESS') || books[0];
        if (active) setCurrentFocusId(active.id);
      }
    } catch (e) {
      console.error("Failed to fetch books", e);
    }
  };

  useEffect(() => {
    checkStatus();
    fetchBooks();
  }, [view]);

  const currentView = () => {
    switch (view.type) {
      case 'dashboard':
        return (
          <Dashboard 
            onSelectBook={(id) => setView({ type: 'detail', bookId: id })} 
            onAddBook={() => setView({ type: 'add' })} 
            onLogCurrent={() => currentFocusId && setView({ type: 'log-progress', bookId: currentFocusId })}
          />
        );
      case 'add':
        return <AddBook onBack={() => setView({ type: 'dashboard' })} onAdded={() => { fetchBooks(); setView({ type: 'dashboard' }); }} />;
      case 'detail':
        return (
          <BookDetailView 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'dashboard' })} 
            onLogProgress={(id) => setView({ type: 'log-progress', bookId: id })}
            onWriteReflection={(id) => setView({ type: 'reflection', bookId: id })}
            onDelete={() => { fetchBooks(); setView({ type: 'dashboard' }); }}
          />
        );
      case 'reflection':
        return (
          <ReflectionView 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'detail', bookId: view.bookId })} 
            onComplete={(id) => setView({ type: 'success', bookId: id })}
          />
        );
      case 'log-progress':
        return (
          <LogProgressView 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'detail', bookId: view.bookId })} 
            onSaved={() => { checkStatus(); setView({ type: 'detail', bookId: view.bookId }); }} 
            onViewJournal={(id) => setView({ type: 'reflection', bookId: id })}
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

  return (
    <div className="min-h-screen bg-background text-on-surface font-body selection:bg-primary-container">
      {/* Top Alert Banner */}
      {showAlert && !loggedToday && (
        <div className="fixed top-16 left-0 w-full z-40 bg-secondary-container/30 backdrop-blur-md border-b border-outline-variant/5">
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
        </div>
      )}

      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 h-16 bg-background/95 backdrop-blur-sm border-b border-outline-variant/5">
        <div className="flex items-center gap-4">
          {view.type !== 'dashboard' ? (
            <button 
              onClick={() => {
                if (view.type === 'detail') setView({ type: 'dashboard' });
                else if (view.type === 'reflection') setView({ type: 'detail', bookId: view.bookId });
                else if (view.type === 'log-progress') setView({ type: 'detail', bookId: view.bookId });
                else setView({ type: 'dashboard' });
              }}
              className="p-2 -ml-2 text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
          ) : (
            <span className="material-symbols-outlined text-primary text-2xl cursor-pointer">menu</span>
          )}
        </div>
        <h1 
          onClick={() => setView({ type: 'dashboard' })}
          className="font-headline italic text-2xl tracking-tight text-[#37352F] cursor-pointer"
        >
          The Archivist
        </h1>
        <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant/20">
          <img 
            alt="Profile" 
            className="w-full h-full object-cover" 
            src="https://picsum.photos/seed/archivist/100/100"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${showAlert && !loggedToday ? 'pt-36' : 'pt-24'} pb-32 px-6 max-w-5xl mx-auto`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={view.type + (view.type === 'detail' || view.type === 'reflection' || view.type === 'log-progress' ? (view as any).bookId : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-background/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(48,51,49,0.08)] border-t border-outline-variant/5">
        <button 
          onClick={() => setView({ type: 'dashboard' })}
          className={`flex flex-col items-center justify-center transition-all duration-200 ${view.type === 'dashboard' ? 'text-on-surface scale-105 font-bold' : 'text-outline-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[24px]">import_contacts</span>
          <span className="font-sans text-[10px] uppercase tracking-widest mt-1">Library</span>
        </button>
        <button 
          onClick={() => setView({ type: 'add' })}
          className={`flex flex-col items-center justify-center transition-all duration-200 ${view.type === 'add' ? 'text-on-surface scale-105 font-bold' : 'text-outline-variant hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-[24px]">add_circle</span>
          <span className="font-sans text-[10px] uppercase tracking-widest mt-1">Add</span>
        </button>
        <button 
          onClick={() => currentFocusId && setView({ type: 'log-progress', bookId: currentFocusId })}
          disabled={!currentFocusId}
          className={`flex flex-col items-center justify-center transition-all duration-200 ${view.type === 'log-progress' ? 'text-on-surface scale-105 font-bold' : 'text-outline-variant hover:text-on-surface'} ${!currentFocusId ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined text-[24px]">edit_note</span>
          <span className="font-sans text-[10px] uppercase tracking-widest mt-1">Log</span>
        </button>
        <button 
          onClick={() => currentFocusId && setView({ type: 'reflection', bookId: currentFocusId })}
          disabled={!currentFocusId}
          className={`flex flex-col items-center justify-center transition-all duration-200 ${view.type === 'reflection' ? 'text-on-surface scale-105 font-bold' : 'text-outline-variant hover:text-on-surface'} ${!currentFocusId ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <span className="material-symbols-outlined text-[24px]">auto_stories</span>
          <span className="font-sans text-[10px] uppercase tracking-widest mt-1">Reflect</span>
        </button>
      </nav>
    </div>
  );
}
