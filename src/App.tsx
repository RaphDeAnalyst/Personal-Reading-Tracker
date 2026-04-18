/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book as BookIcon, Plus, ChevronLeft, LayoutDashboard, History, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Book, BookDetail, BookStatus } from './types';
import Dashboard from './components/Dashboard';
import AddBook from './components/AddBook';
import BookDetailView from './components/BookDetailView';
import ReflectionView from './components/ReflectionView';

type View = 
  | { type: 'dashboard' }
  | { type: 'add' }
  | { type: 'detail'; bookId: number }
  | { type: 'reflection'; bookId: number };

export default function App() {
  const [view, setView] = useState<View>({ type: 'dashboard' });
  const [loggedToday, setLoggedToday] = useState(false);

  const checkStatus = async () => {
    try {
      // Sanity check
      const healthRes = await fetch('/api/health');
      if (!healthRes.ok) {
        console.warn("Health check failed", healthRes.status);
      } else {
        const health = await healthRes.json();
        console.log("Server health:", health.status);
      }

      const res = await fetch('/api/dashboard/status');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setLoggedToday(data.loggedToday);
    } catch (e) {
      console.error("Failed to fetch dashboard status", e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [view]);

  const currentView = () => {
    switch (view.type) {
      case 'dashboard':
        return <Dashboard onSelectBook={(id) => setView({ type: 'detail', bookId: id })} onAddBook={() => setView({ type: 'add' })} />;
      case 'add':
        return <AddBook onBack={() => setView({ type: 'dashboard' })} onSave={() => setView({ type: 'dashboard' })} />;
      case 'detail':
        return (
          <BookDetailView 
            bookId={view.bookId} 
            onBack={() => setView({ type: 'dashboard' })} 
            onReflect={() => setView({ type: 'reflection', bookId: view.bookId })}
            onUpdate={() => checkStatus()}
          />
        );
      case 'reflection':
        return <ReflectionView bookId={view.bookId} onBack={() => setView({ type: 'detail', bookId: view.bookId })} onSave={() => setView({ type: 'dashboard' })} />;
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-10 pt-10 pb-5 flex items-center justify-between border-b-2 border-ink">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView({ type: 'dashboard' })}>
          <h1 className="font-serif italic font-bold text-2xl tracking-tight">Reader_v1.0</h1>
        </div>
        
        <div className="flex items-center gap-6">
          {!loggedToday && view.type === 'dashboard' && (
            <div className="hidden md:block bg-ink text-bg px-3 py-1 font-bold text-[11px] uppercase tracking-widest">
              Attention: You haven't logged progress today
            </div>
          )}
          <button 
            onClick={() => setView({ type: 'add' })}
            className="bg-ink text-bg px-5 py-2 font-bold text-[11px] uppercase tracking-[2px] hover:opacity-80 transition-all border border-ink"
          >
            + Add New Book
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-10 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={view.type + (view.type === 'detail' || view.type === 'reflection' ? (view as any).bookId : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentView()}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-10 py-12 border-t border-line mt-12 mb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-muted text-[11px] font-bold tracking-[2px] uppercase">
          <div className="flex items-center gap-10">
            <span>Systems // V2.0</span>
            <span>Local DB // SQLite</span>
          </div>
          <div>© 2026 // BOLD TYPOGRAPHY DESIGN</div>
        </div>
      </footer>
    </div>
  );
}
