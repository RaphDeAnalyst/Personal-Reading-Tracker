import { useState, FormEvent } from 'react';

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
    cover_url: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          total_pages: parseInt(formData.total_pages),
          status: 'NOT_STARTED'
        })
      });
      if (res.ok) onAdded();
      else alert('Failure to archive new entry. Check fields.');
    } catch (e) {
      console.error("Add book error", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 md:px-0 min-h-[80vh] flex flex-col justify-center">
      <div className="mb-12">
        <button onClick={onBack} className="flex items-center gap-2 group text-on-surface-variant hover:text-on-surface transition-colors mb-6">
          <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span className="font-label text-xs uppercase tracking-[0.15em] font-semibold">Sanctum</span>
        </button>
        <h2 className="serif-text text-5xl text-on-surface mb-4 leading-tight">Archive New Work</h2>
        <p className="font-label text-sm text-on-surface-variant italic max-w-md">Record a new volume into your personal archives. Wisdom begins with a single selection.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        <div className="space-y-10">
          <div className="group relative">
            <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant block mb-1 group-focus-within:text-primary transition-colors">Volume Title</span>
            <input 
              required
              type="text" 
              placeholder="The name of the work"
              className="w-full form-input-line serif-text text-2xl italic placeholder:text-outline-variant/30"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="group relative">
            <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant block mb-1 group-focus-within:text-primary transition-colors">Author or Creator</span>
            <input 
              required
              type="text" 
              placeholder="Who penned this wisdom?"
              className="w-full form-input-line font-label text-lg italic placeholder:text-outline-variant/30"
              value={formData.author}
              onChange={e => setFormData({ ...formData, author: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="group relative">
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant block mb-1 group-focus-within:text-primary transition-colors">Total Pages</span>
              <input 
                required
                type="number" 
                placeholder="0"
                className="w-full form-input-line font-label text-lg placeholder:text-outline-variant/30"
                value={formData.total_pages}
                onChange={e => setFormData({ ...formData, total_pages: e.target.value })}
              />
            </div>
            <div className="group relative">
              <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant block mb-1 group-focus-within:text-primary transition-colors">Cover URI</span>
              <input 
                type="url" 
                placeholder="https://..."
                className="w-full form-input-line font-label text-sm placeholder:text-outline-variant/30"
                value={formData.cover_url}
                onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col items-center gap-6">
          <button 
            type="submit"
            disabled={loading}
            className="w-full max-w-xs py-5 bg-primary text-on-primary rounded-xl font-label text-sm uppercase tracking-[0.2em] font-bold hover:bg-primary-dim transition-all shadow-xl active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-4 group"
          >
            {loading ? 'Archiving...' : (
              <>
                <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">auto_stories</span>
                Add to Collection
              </>
            )}
          </button>
          <p className="font-label text-[10px] text-outline-variant uppercase tracking-widest text-center">Your history is written with every choice.</p>
        </div>
      </form>
    </div>
  );
}
