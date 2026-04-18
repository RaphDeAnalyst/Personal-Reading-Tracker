import { useState, FormEvent, ChangeEvent, useEffect } from 'react';

interface AddBookProps {
  onBack: () => void;
  onAdded: () => void;
}

export default function AddBook({ onBack, onAdded }: AddBookProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    total_pages: '',
    mode: 'PHYSICAL',
    cover_url: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

      const res = await fetch('/api/books', {
        method: 'POST',
        body: data // Fetch handles multipart/form-data correctly with FormData object
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
    <main className="pt-12 pb-32 px-6 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="mb-16">
        <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface-variant mb-4 block">New Acquisition</span>
        <h1 className="text-5xl md:text-6xl font-headline tracking-tight text-on-surface leading-tight mb-6">
          Curate your next <br /><i className="font-serif italic">literary journey.</i>
        </h1>
        <p className="text-on-surface-variant font-body leading-relaxed max-w-md">
          Every great volume deserves a place in your archive. Enter the details below to begin tracking your progress.
        </p>
      </section>

      {/* Asymmetric Form Layout */}
      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          {/* Left Column: Visual Hint / Preview */}
          <div className="hidden md:block md:col-span-4 sticky top-32">
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
                  <span className="material-symbols-outlined text-4xl text-outline-variant/40 mb-2">auto_stories</span>
                  <p className="text-[10px] uppercase tracking-widest text-outline-variant font-medium">Cover Preview</p>
                </div>
              )}
              {/* Decorative Grain Overlay */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/p6-dark.png')]"></div>
            </div>
          </div>

          {/* Right Column: Actual Fields */}
          <div className="md:col-span-8 space-y-10">
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
                className="form-input-line w-full text-xl font-headline placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all" 
                id="title" 
                placeholder="The Shadow of the Wind" 
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Field: Book Cover */}
            <div className="group">
              <label className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-4 group-focus-within:text-primary transition-colors">
                Book Cover <span className="lowercase italic opacity-60 text-[9px]">(Optional)</span>
              </label>
              <div className="space-y-6">
                {/* URL Input Option */}
                <div className="group/url">
                  <input 
                    className="form-input-line w-full text-lg font-body placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all" 
                    id="cover_url" 
                    placeholder="Cover Image URL (e.g., https://...)" 
                    type="text"
                    value={formData.cover_url}
                    onChange={e => {
                      setFormData({ ...formData, cover_url: e.target.value });
                      setSelectedFile(null); // Clear file if URL is typed
                    }}
                  />
                </div>

                {/* Visual Separator */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="border-t border-outline-variant/20 w-full"></div>
                  <span className="bg-surface px-4 text-[9px] uppercase tracking-[0.2em] text-outline-variant absolute font-medium">or</span>
                </div>

                {/* File Upload Option */}
                <div className="relative">
                  <input 
                    accept="image/*" 
                    className="hidden" 
                    id="cover_file" 
                    type="file"
                    onChange={handleFileChange}
                  />
                  <label 
                    className={`flex flex-col items-center justify-center border border-dashed rounded-lg p-8 cursor-pointer transition-all group/upload bg-surface-container-lowest/30 ${
                      selectedFile ? 'border-primary bg-primary/5' : 'border-outline-variant/40 hover:border-primary hover:bg-surface-container-low/50'
                    }`} 
                    htmlFor="cover_file"
                  >
                    <span className={`material-symbols-outlined transition-colors mb-3 ${selectedFile ? 'text-primary' : 'text-outline-variant group-hover/upload:text-primary'}`}>
                      {selectedFile ? 'check_circle' : 'upload_file'}
                    </span>
                    <span className={`text-[11px] uppercase tracking-widest font-medium transition-colors ${selectedFile ? 'text-primary font-bold' : 'text-on-surface-variant group-hover/upload:text-primary'}`}>
                      {selectedFile ? selectedFile.name : 'Upload Cover from Computer'}
                    </span>
                    <span className="text-[9px] text-outline-variant mt-1 font-body">JPG, PNG or WEBP up to 5MB</span>
                  </label>
                </div>
              </div>
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
                className="form-input-line w-full text-xl font-headline placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all" 
                id="author" 
                placeholder="Carlos Ruiz Zafón" 
                type="text"
                value={formData.author}
                onChange={e => setFormData({ ...formData, author: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
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
                  className="form-input-line w-full text-lg font-body placeholder:text-outline-variant/50 focus:placeholder:opacity-0 transition-all" 
                  id="pages" 
                  placeholder="487" 
                  type="number"
                  value={formData.total_pages}
                  onChange={e => setFormData({ ...formData, total_pages: e.target.value })}
                />
              </div>

              {/* Field: Reading Mode */}
              <div className="group">
                <label 
                  className="block text-[10px] uppercase tracking-[0.15em] text-on-surface-variant mb-2 group-focus-within:text-primary transition-colors" 
                  htmlFor="mode"
                >
                  Mode
                </label>
                <select 
                  className="form-input-line w-full text-sm font-body bg-transparent cursor-pointer appearance-none" 
                  id="mode"
                  value={formData.mode}
                  onChange={e => setFormData({ ...formData, mode: e.target.value })}
                >
                  <option value="PHYSICAL">Physical</option>
                  <option value="DIGITAL">Digital</option>
                  <option value="AUDIO">Audio</option>
                </select>
              </div>
            </div>

            {/* CTA Section */}
            <div className="pt-8 flex items-center justify-between">
              <button 
                disabled={loading}
                className="bg-primary text-on-primary px-10 py-5 rounded-md font-label text-[12px] uppercase tracking-[0.2em] font-bold flex items-center gap-3 hover:bg-primary-dim active:scale-95 transition-all shadow-md disabled:opacity-50" 
                type="submit"
              >
                <span>{loading ? 'Archiving...' : 'Add Book'}</span>
                {!loading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
              </button>
              <button 
                type="button"
                onClick={onBack}
                className="text-xs uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors border-b border-transparent hover:border-primary-dim/30 pb-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
