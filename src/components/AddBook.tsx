import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Tag } from '../types';
import TagSelector from './TagSelector';

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
        showToast?.("Archival data retrieved", "success");
      } else {
        showToast?.(data.error || "Volume not found in external archives", "error");
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
        showToast?.(`${formData.title} archived successfully`, "success");
        onAdded();
      } else {
        const err = await res.json();
        showToast?.(err.error || "Failure to archive volume", "error");
      }
    } catch (e) {
      console.error("Add book error", e);
      showToast?.("Network error while archiving volume", "error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="pt-12 pb-32 px-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="mb-16">
        <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-4 block">New Acquisition</span>
        <h1 className="text-5xl md:text-6xl font-headline tracking-tight text-on-surface leading-tight mb-6">
          Curate your next <br /><i className="font-serif italic">literary journey.</i>
        </h1>
        <p className="text-on-surface-variant font-body leading-relaxed max-w-md">
          {formData.mode === 'DIGITAL' 
            ? 'Select a PDF volume to begin your digital archive. Metadata will be extracted automatically.'
            : 'Every great volume deserves a place in your archive. Enter the details below to begin tracking.'}
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
                <div className="text-center">
                  <span className={`material-symbols-outlined text-4xl mb-2 transition-colors ${extracting ? 'animate-pulse text-tertiary' : 'text-outline-variant/40'}`}>
                    {extracting ? 'sync_saved_locally' : 'auto_stories'}
                  </span>
                  <p className="text-[10px] uppercase tracking-widest text-outline-variant font-medium">
                    {extracting ? 'Analyzing Volume...' : 'Cover Preview'}
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
                  <span className="material-symbols-outlined text-xl">book</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold">Physical</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, mode: 'DIGITAL' })}
                  className={`flex-1 p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${formData.mode === 'DIGITAL' ? 'bg-primary/5 border-primary shadow-sm' : 'bg-surface border-outline-variant/20 hover:border-primary/40'}`}
                >
                  <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold">Digital</span>
                </button>
              </div>
            </div>

            {/* Digital Upload Area */}
            {formData.mode === 'DIGITAL' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 group-focus-within:text-primary transition-colors">
                  Choose PDF Volume
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
                    <span className={`material-symbols-outlined text-3xl mb-3 transition-colors ${selectedPDF ? 'text-tertiary' : 'text-outline-variant'}`}>
                      {extracting ? 'cached' : (selectedPDF ? 'description' : 'cloud_upload')}
                    </span>
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

            {/* New Metadata Fields: ISBN, Publisher, Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" htmlFor="isbn">
                  ISBN
                </label>
                <div className="flex gap-3">
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
                    className="px-3 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <span className={`material-symbols-outlined text-sm ${lookingUp ? 'animate-spin' : ''}`}>
                      {lookingUp ? 'sync' : 'search'}
                    </span>
                    {lookingUp ? '...' : 'Lookup'}
                  </button>
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" htmlFor="publisher">
                  Publisher
                </label>
                <input 
                  className="form-input-line w-full text-sm font-body border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent" 
                  id="publisher" 
                  placeholder="Penguin Books" 
                  type="text"
                  value={formData.publisher}
                  onChange={e => setFormData({ ...formData, publisher: e.target.value })}
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" htmlFor="year">
                Publication Year
              </label>
              <input 
                className="form-input-line w-full text-sm font-body border-b border-outline-variant/20 focus:border-primary outline-none py-2 bg-transparent" 
                id="year" 
                placeholder="2001" 
                type="number"
                value={formData.publication_year}
                onChange={e => setFormData({ ...formData, publication_year: e.target.value })}
              />
            </div>

            {/* Field: Description */}
            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" htmlFor="description">
                Description
              </label>
              <textarea 
                className="w-full bg-surface-container-low/30 border border-outline-variant/20 rounded-lg p-4 text-sm font-body focus:outline-none focus:ring-1 focus:ring-primary transition-all min-h-[120px]" 
                id="description" 
                placeholder="Brief summary or thoughts on this volume..." 
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Optional Cover (Only for Physical or if manual adjust is needed) */}
            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 group-focus-within:text-primary transition-colors">
                Book Cover <span className="lowercase italic opacity-60 text-[9px]">(Optional)</span>
              </label>
              <div className="flex gap-6 items-center">
                 <div className="relative">
                  <input 
                    accept="image/*" 
                    className="hidden" 
                    id="cover_file" 
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label 
                    className="flex items-center gap-3 px-6 py-3 rounded-lg cursor-pointer transition-all border border-outline-variant/30 hover:border-primary/40 bg-surface-container-low/30 text-xs font-label uppercase tracking-widest"
                    htmlFor="cover_file"
                  >
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    {selectedFile ? 'Change Cover' : 'Upload Cover'}
                  </label>
                </div>
                {formData.mode === 'PHYSICAL' && (
                  <input 
                    className="flex-1 bg-transparent border-b border-outline-variant/20 focus:border-primary outline-none py-2 text-xs font-body placeholder:text-outline-variant/40" 
                    placeholder="or paste Cover URL..." 
                    type="text"
                    value={formData.cover_url}
                    onChange={e => {
                      setFormData({ ...formData, cover_url: e.target.value });
                      setSelectedFile(null);
                    }}
                  />
                )}
              </div>
            </div>

            {/* Tags Section */}
            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 group-focus-within:text-primary transition-colors">
                Tags <span className="lowercase italic opacity-60 text-[9px]">(Optional)</span>
              </label>
              <TagSelector 
                selectedTagIds={selectedTagIds}
                onToggleTag={handleToggleTag}
                showToast={showToast}
              />
            </div>

            {/* CTA Section */}
            <div className="pt-8 flex flex-col sm:flex-row items-center gap-8">
              <button 
                disabled={loading || extracting}
                className="w-full sm:w-auto bg-primary text-on-primary px-12 py-5 rounded-xl font-label text-[12px] uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-3 hover:bg-primary-dim active:scale-95 transition-all shadow-lg disabled:opacity-50" 
                type="submit"
              >
                <span>{loading ? 'Archiving Volume...' : `Add ${formData.mode === 'DIGITAL' ? 'Digital' : 'Physical'} Book`}</span>
                {!loading && <span className="material-symbols-outlined text-sm">auto_stories</span>}
              </button>
              <button 
                type="button"
                onClick={onBack}
                className="text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors font-bold"
              >
                Cancel Archive
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
