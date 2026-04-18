import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface AddBookProps {
  onBack: () => void;
  onAdded: () => void;
}

export default function AddBook({ onBack, onAdded }: AddBookProps) {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    total_pages: '',
    mode: 'PHYSICAL',
    cover_url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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

        setFormData(prev => ({
          ...prev,
          title: prev.title || title,
          author: prev.author || author,
          total_pages: pageCount.toString()
        }));

      } catch (err) {
        console.error("PDF Extraction failed", err);
      } finally {
        setExtracting(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('author', formData.author);
      data.append('total_pages', formData.total_pages);
      data.append('mode', formData.mode);
      
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
        onAdded();
      } else {
        const err = await res.json();
        alert(`Failure to archive new entry: ${err.error || 'Check fields.'}`);
      }
    } catch (e) {
      console.error("Add book error", e);
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
