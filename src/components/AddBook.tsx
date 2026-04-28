import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Tag } from '../types';
import TagSelector from './TagSelector';
import Icon from './Icon';
import { Book, FileText, Upload, CloudUpload, Search, Loader2, Archive, BookOpen } from 'lucide-react';


// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface AddBookProps {
  onBack: () => void;
  onAdded: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function AddBook({ onBack, onAdded, showToast }: AddBookProps) {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    total_pages: '',
    mode: 'PHYSICAL',
    cover_url: '',
    isbn: '',
    description: '',
    publisher: '',
    publication_year: ''
  });

  // Fetch all tags
  const handleISBNLookup = async () => {
    if (!formData.isbn || formData.isbn.length < 10) {
      showToast?.("Please enter a valid ISBN", "error");
      return;
    }

    setLookingUp(true);
    try {
      const res = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(formData.isbn)}`);
      const data = await res.json();

      if (res.ok) {
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          author: data.author || prev.author,
          total_pages: data.total_pages ? data.total_pages.toString() : prev.total_pages,
          publisher: data.publisher || prev.publisher,
          publication_year: data.publication_year ? data.publication_year.toString() : prev.publication_year,
          description: data.description || prev.description,
          cover_url: data.cover_url || prev.cover_url,
          isbn: data.isbn || prev.isbn
        }));
        showToast?.("Book details fetched", "success");
      } else {
        showToast?.(data.error || "Book not found. Try a different title or ISBN.", "error");
      }
    } catch (e) {
      console.error("ISBN Lookup failed:", e);
      showToast?.("Network error while consulting archives", "error");
    } finally {
      setLookingUp(false);
    }
  };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Handle preview logic
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (formData.cover_url) {
      setPreviewUrl(formData.cover_url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile, formData.cover_url]);

  const handleToggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast?.("Cover image is too large (max 10MB)", "error");
        return;
      }
      setSelectedFile(file);
      // Clear URL if file is picked
      setFormData(prev => ({ ...prev, cover_url: '' }));
    }
  };

  const handlePDFChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPDF(file);
      setExtracting(true);

      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const metadata = await pdf.getMetadata() as any;
        
        // 1. Extract Page Count
        const pageCount = pdf.numPages;

        // 2. Extract Basic Info
        const info = metadata.info;
        const title = info?.Title || file.name.replace('.pdf', '');
        const author = info?.Author || '';

        // 3. Extract First Page as Cover
        try {
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport, canvas }).promise;
            const coverBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            if (coverBlob) {
              const coverFile = new File([coverBlob], 'cover.jpg', { type: 'image/jpeg' });
              setSelectedFile(coverFile);
            }
          }
        } catch (coverErr) {
          console.warn("Failed to extract cover from PDF", coverErr);
          // Non-critical, continue
        }

        setFormData(prev => ({
          ...prev,
          title: prev.title || title,
          author: prev.author || author,
          total_pages: pageCount.toString()
        }));
        
        showToast?.("Metadata extracted from manuscript", "success");

      } catch (err) {
        console.error("PDF Extraction failed", err);
        showToast?.("Failed to parse manuscript. Please enter details manually.", "error");
      } finally {
        setExtracting(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.total_pages) {
      showToast?.("Title and page count are required", "error");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('author', formData.author);
      data.append('total_pages', formData.total_pages);
      data.append('mode', formData.mode);
      data.append('isbn', formData.isbn);
      data.append('description', formData.description);
      data.append('publisher', formData.publisher);
      data.append('publication_year', formData.publication_year);
      
      if (selectedFile) {
        data.append('cover', selectedFile);
      } else if (formData.cover_url) {
        data.append('cover_url', formData.cover_url);
      }

      if (formData.mode === 'DIGITAL' && selectedPDF) {
        data.append('pdf', selectedPDF);
      }

      const res = await fetch('/api/books', {
        method: 'POST',
        body: data 
      });

      if (res.ok) {
        const book = await res.json();
        // Save tags if any selected
        if (selectedTagIds.length > 0) {
          await fetch(`/api/books/${book.id}/tags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagIds: selectedTagIds })
          });
        }
        showToast?.(`"${formData.title}" added to your library`, "success");
        onAdded();
      } else {
        const err = await res.json();
        showToast?.(err.error || "Failed to add book. Please try again.", "error");
      }
    } catch (e) {
      console.error("Add book error", e);
      showToast?.("Network error. Book was not saved.", "error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="pt-12 pb-32 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="mb-16">
        <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-4 block">Add a Book</span>
        <h1 className="text-5xl md:text-6xl font-headline tracking-tight text-on-surface leading-tight mb-6">
          Add a book to <br /><i className="font-serif italic">your library.</i>
        </h1>
        <p className="text-on-surface-variant font-body leading-relaxed max-w-md">
          {formData.mode === 'DIGITAL'
            ? 'Upload a PDF to track and read it digitally. Book details will be extracted automatically.'
            : 'Enter the book details below to start tracking your reading progress.'}
        </p>
      </section>

      {/* Asymmetric Form Layout */}
      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Visual Hint / Preview */}
          <div className="hidden lg:block lg:col-span-4 sticky top-32">
            <div className="aspect-[3/4] bg-surface-container-low rounded-lg flex items-center justify-center p-2 relative overflow-hidden group border border-outline-variant/10 shadow-sm">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent"></div>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Cover Preview"
                  className="w-full h-full object-cover rounded shadow-md animate-in fade-in duration-500"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-center flex flex-col items-center gap-2">
                  <Icon icon={extracting ? Loader2 : BookOpen} size="xl" variant={extracting ? 'primary' : 'muted'} className={extracting ? 'animate-spin' : ''} />
                  <p className="text-[10px] uppercase tracking-widest text-outline-variant font-medium">
                    {extracting ? 'Reading PDF...' : 'Cover Preview'}
                  </p>
                </div>
              )}
              {/* Decorative Grain Overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6-dark.png')]"></div>
            </div>
          </div>

          {/* Right Column: Actual Fields */}
          <div className="lg:col-span-8 space-y-10">
            {/* Field: Format Selection */}
            <div className="group">
              <label 
                className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 font-bold" 
              >
                Journal Format
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: 'PHYSICAL' })}
                  className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${formData.mode === 'PHYSICAL' ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface border-outline-variant/20 hover:border-primary/40'}`}
                >
                  <Icon icon={Book} size="lg" variant={formData.mode === 'PHYSICAL' ? 'primary' : 'muted'} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Physical</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: 'DIGITAL' })}
                  className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${formData.mode === 'DIGITAL' ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface border-outline-variant/20 hover:border-primary/40'}`}
                >
                  <Icon icon={FileText} size="lg" variant={formData.mode === 'DIGITAL' ? 'primary' : 'muted'} />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Digital</span>
                </button>
              </div>
            </div>

            {/* Digital Upload Area */}
            {formData.mode === 'DIGITAL' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 group-focus-within:text-primary transition-colors">
                  Choose PDF File
                </label>
                <div className="relative">
                  <input 
                    accept="application/pdf" 
                    className="hidden" 
                    id="digital_file" 
                    type="file"
                    onChange={handlePDFChange}
                  />
                  <label
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all bg-surface-container-low/30 hover:bg-surface-container-low/50 ${
                      selectedPDF ? 'border-tertiary bg-tertiary/5' : 'border-outline-variant/30 hover:border-primary/40'
                    }`}
                    htmlFor="digital_file"
                  >
                    <Icon icon={selectedPDF ? FileText : (extracting ? Loader2 : CloudUpload)} size="xl" variant={selectedPDF ? 'success' : (extracting ? 'primary' : 'muted')} className={extracting ? 'animate-spin' : ''} />
                    <p className="text-sm font-headline text-on-surface mb-1">
                      {extracting ? 'Synthesizing metadata...' : (selectedPDF ? selectedPDF.name : 'Upload PDF')}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-outline-variant">
                      {selectedPDF ? `${Math.round(selectedPDF.size / 1024 / 1024 * 10) / 10} MB` : 'Digital manuscripts only'}
                    </p>
                  </label>
                </div>
              </div>
            )}

            {/* Field: Title */}
            <div className="group">
              <label 
                className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" 
                htmlFor="title"
              >
                Title
              </label>
              <input 
                required
                className="form-input-line w-full text-xl font-headline placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent" 
                id="title" 
                placeholder="The Shadow of the Wind" 
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Field: Author */}
            <div className="group">
              <label 
                className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" 
                htmlFor="author"
              >
                Author
              </label>
              <input 
                required
                className="form-input-line w-full text-xl font-headline placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent" 
                id="author" 
                placeholder="Carlos Ruiz Zafón" 
                type="text"
                value={formData.author}
                onChange={e => setFormData({ ...formData, author: e.target.value })}
              />
            </div>

            {/* Field: Total Pages */}
            <div className="group">
              <label 
                className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" 
                htmlFor="pages"
              >
                Total Pages
              </label>
              <input 
                required
                className="form-input-line w-full text-lg font-body placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent" 
                id="pages" 
                placeholder="487" 
                type="number"
                value={formData.total_pages}
                onChange={e => setFormData({ ...formData, total_pages: e.target.value })}
              />
            </div>

            {/* Metadata Section */}
            <div className="space-y-8">
              {/* ISBN with Lookup Button */}
              <div className="group">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-3 group-focus-within:text-primary transition-colors" htmlFor="isbn">
                  ISBN
                </label>
                <div className="flex gap-3 items-end">
                  <input
                    className="form-input-line flex-1 text-sm font-body border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent"
                    id="isbn"
                    placeholder="978-0143126393"
                    type="text"
                    value={formData.isbn}
                    onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleISBNLookup())}
                  />
                  <button
                    type="button"
                    onClick={handleISBNLookup}
                    disabled={lookingUp || loading}
                    className="px-4 py-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                  >
                    <Icon icon={lookingUp ? Loader2 : Search} size="sm" className={lookingUp ? 'animate-spin' : ''} />
                    {lookingUp ? 'Looking...' : 'Lookup'}
                  </button>
                </div>
              </div>

              {/* Publisher and Year in grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="group">
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-3 group-focus-within:text-primary transition-colors" htmlFor="publisher">
                    Publisher
                  </label>
                  <input
                    className="form-input-line w-full text-sm font-body border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all"
                    id="publisher"
                    placeholder="Penguin Books"
                    type="text"
                    value={formData.publisher}
                    onChange={e => setFormData({ ...formData, publisher: e.target.value })}
                  />
                </div>

                <div className="group">
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-3 group-focus-within:text-primary transition-colors" htmlFor="year">
                    Publication Year
                  </label>
                  <input
                    className="form-input-line w-full text-sm font-body border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all"
                    id="year"
                    placeholder="2001"
                    type="number"
                    value={formData.publication_year}
                    onChange={e => setFormData({ ...formData, publication_year: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Field: Description */}
            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-3 group-focus-within:text-primary transition-colors" htmlFor="description">
                Description <span className="lowercase italic opacity-60 text-[9px]">(Optional)</span>
              </label>
              <textarea
                className="w-full bg-surface-container-low/30 border border-outline-variant/20 rounded-lg p-4 text-sm font-body placeholder:text-outline-variant/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all min-h-[120px] resize-none"
                id="description"
                placeholder="Brief summary or your thoughts on this book..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Optional Cover (Only for Physical or if manual adjust is needed) */}
            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 group-focus-within:text-primary transition-colors">
                Book Cover <span className="lowercase italic opacity-60 text-[9px]">(Optional)</span>
              </label>
              <div className="space-y-4">
                <div className="relative">
                  <input
                    accept="image/*"
                    className="hidden"
                    id="cover_file"
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label
                    className="flex items-center justify-center gap-3 px-6 py-4 rounded-lg cursor-pointer transition-all border border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low/50 bg-surface-container-low/30 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
                    htmlFor="cover_file"
                  >
                    <Icon icon={Upload} size="md" variant="muted" />
                    {selectedFile ? 'Change Cover Image' : 'Upload Cover Image'}
                  </label>
                </div>
                {formData.mode === 'PHYSICAL' && (
                  <div className="group/url">
                    <label className="block text-[8px] uppercase tracking-[0.15em] text-on-surface-variant/60 mb-1.5 group-focus-within/url:text-primary transition-colors">
                      Or Paste URL
                    </label>
                    <input
                      className="w-full bg-transparent border-b border-outline-variant/20 focus:border-primary outline-none py-2 text-sm font-body placeholder:text-outline-variant/40 focus:placeholder:opacity-0 transition-all"
                      placeholder="https://example.com/cover.jpg"
                      type="text"
                      value={formData.cover_url}
                      onChange={e => {
                        setFormData({ ...formData, cover_url: e.target.value });
                        setSelectedFile(null);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tags Section */}
            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 group-focus-within:text-primary transition-colors">
                Genre Tags <span className="lowercase italic opacity-60 text-[9px]">(Optional - Organize your library)</span>
              </label>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onToggleTag={handleToggleTag}
                showToast={showToast}
              />
            </div>

            {/* CTA Section */}
            <div className="pt-8 border-t border-outline-variant/10 flex flex-col sm:flex-row items-center gap-4">
              <button
                disabled={loading || extracting}
                className="w-full sm:w-auto bg-primary text-on-primary px-8 sm:px-12 py-4 rounded-lg font-label text-[11px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-3 hover:bg-primary-dim active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
              >
                <Icon icon={loading ? Loader2 : Archive} size="md" variant="inverted" className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Saving...' : 'Add to Library'}</span>
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:w-auto px-8 py-4 rounded-lg border border-outline-variant/30 bg-surface-container-low/50 text-on-surface font-label text-[11px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 hover:border-outline-variant/60 hover:bg-surface-container transition-all active:scale-95"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
