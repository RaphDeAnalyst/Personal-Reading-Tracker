import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFReaderProps {
  bookId: number;
  onBack: () => void;
  onFinish: () => void;
}

export default function PDFReader({ bookId, onBack, onFinish }: PDFReaderProps) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdf, setPdf] = useState<any>(null);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}`);
        const data = await res.json();
        setBook(data);
        setCurrentPage(Math.max(1, data.current_page || 1));

        if (data.pdf_file_path) {
          const loadingTask = pdfjsLib.getDocument(data.pdf_file_path);
          const pdfDoc = await loadingTask.promise;
          setPdf(pdfDoc);
        }
      } catch (err) {
        console.error("Reader: Failed to load manuscript", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [bookId]);

  useEffect(() => {
    if (pdf && currentPage > 0) {
      renderPage(currentPage);
      saveProgress(currentPage);
    }
  }, [pdf, currentPage]);

  const renderPage = async (pageNum: number) => {
    if (!pdf || !canvasRef.current) return;
    setRendering(true);
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: window.devicePixelRatio || 1.5 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      };
      await page.render(renderContext).promise;
    } catch (err) {
      console.error("Render failed", err);
    } finally {
      setRendering(false);
    }
  };

  const saveProgress = async (page: number) => {
    if (!book) return;
    try {
      await fetch(`/api/books/${bookId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPage: page,
          pagesRead: 0, // Automatic tracking handles the difference internally now
          date: new Date().toISOString().split('T')[0]
        })
      });
    } catch (err) {
      console.error("Failed to sync progress", err);
    }
  };

  const nextPage = () => {
    if (pdf && currentPage < pdf.numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        prevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdf, currentPage, nextPage, prevPage]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-10">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full mb-6"
        />
        <p className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant">Unrolling Digital Manuscript...</p>
      </div>
    );
  }

  if (!book || !book.pdf_file_path) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center text-center p-10">
        <span className="material-symbols-outlined text-6xl text-outline-variant/30 mb-6">lock_open</span>
        <h2 className="serif-text text-3xl mb-4">Volume Unreadable.</h2>
        <p className="text-on-surface-variant mb-10 max-w-sm">This volume lacks a digital manuscript or the connection is severed.</p>
        <button onClick={onBack} className="bg-primary text-on-primary px-8 py-3 rounded-xl font-label text-xs uppercase tracking-widest font-bold">Return to Library</button>
      </div>
    );
  }

  const progressPercent = pdf ? Math.round((currentPage / pdf.numPages) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#1a1a1a] text-on-surface overflow-hidden flex flex-col">
      {/* Top Controls */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-surface-container-highest/10 backdrop-blur-md border-b border-white/5 z-10 transition-opacity hover:opacity-100 opacity-0 md:opacity-100 group">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-white/70 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="hidden sm:block">
            <h3 className="font-headline italic text-white/90 truncate max-w-[200px]">{book.title}</h3>
            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={prevPage}
              disabled={currentPage === 1}
              className="p-1.5 text-white/60 hover:text-white disabled:opacity-20 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex items-center gap-3 font-mono text-xs text-white/80">
              <span className="px-2 py-1 bg-white/5 rounded border border-white/10">{currentPage}</span>
              <span className="text-white/20">/</span>
              <span className="text-white/40">{pdf?.numPages}</span>
            </div>
            <button 
              onClick={nextPage}
              disabled={pdf && currentPage === pdf.numPages}
              className="p-1.5 text-white/60 hover:text-white disabled:opacity-20 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <div className="w-16 h-1 rounded-full bg-white/5 hidden md:block relative overflow-hidden">
             <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </header>

      {/* Main Reading Stage */}
      <main className="flex-1 relative overflow-auto scroll-smooth no-scrollbar bg-[#121212] flex justify-center py-4 md:py-12" onClick={(e) => {
        // Toggle header or handle page turns via click regions? 
        // For now, let's just use buttons.
      }}>
        <div className="relative shadow-2xl transition-transform duration-500 max-w-[95vw]">
           <canvas className="shadow-2xl rounded-sm max-w-full h-auto" ref={canvasRef} />
           {rendering && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] transition-all">
                <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin"></div>
             </div>
           )}
        </div>
        
        {/* Hover Click Zones for Desktop */}
        <div className="absolute top-0 left-0 w-1/4 h-full cursor-w-resize" onClick={prevPage}></div>
        <div className="absolute top-0 right-0 w-1/4 h-full cursor-e-resize" onClick={nextPage}></div>
      </main>

      {/* Progress HUD (Distraction-free focus) */}
      <footer className="h-2 flex-shrink-0 bg-white/5 relative">
        <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" style={{ width: `${progressPercent}%` }}></div>
      </footer>
    </div>
  );
}
