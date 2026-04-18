import { useState, FormEvent } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { ReadingMode } from '../types';

interface AddBookProps {
  onBack: () => void;
  onSave: () => void;
}

export default function AddBook({ onBack, onSave }: AddBookProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    totalPages: '',
    mode: 'PHYSICAL' as ReadingMode
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.totalPages) return;
    
    setLoading(true);
    try {
      await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          author: formData.author,
          total_pages: parseInt(formData.totalPages),
          mode: formData.mode
        })
      });
      onSave();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-muted hover:text-ink mb-10 transition-colors text-xs font-bold uppercase tracking-widest"
      >
        <ChevronLeft className="w-4 h-4" />
        Return to command center
      </button>

      <div className="space-y-12">
        <h2 className="bold-title text-5xl">Add New Book</h2>
        
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-3">
            <label className="label-caps">Book Title *</label>
            <input 
              required
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full text-2xl font-serif py-4 bg-transparent border-b-2 border-line focus:border-accent outline-none transition-all placeholder:text-ink/20"
              placeholder="e.g. Meditations"
            />
          </div>

          <div className="space-y-3">
            <label className="label-caps">Author</label>
            <input 
              type="text"
              value={formData.author}
              onChange={e => setFormData({...formData, author: e.target.value})}
              className="w-full text-xl py-2 bg-transparent border-b border-line/20 focus:border-ink outline-none transition-all placeholder:text-ink/20"
              placeholder="e.g. Marcus Aurelius"
            />
          </div>

          <div className="grid grid-cols-2 gap-10 pt-4">
            <div className="space-y-3">
              <label className="label-caps">Total Pages *</label>
              <input 
                required
                type="number"
                min="1"
                value={formData.totalPages}
                onChange={e => setFormData({...formData, totalPages: e.target.value})}
                className="w-full text-xl py-2 bg-transparent border-b border-line/20 focus:border-ink outline-none transition-all"
                placeholder="0"
              />
            </div>
            
            <div className="space-y-3">
              <label className="label-caps">Reading Mode</label>
              <select 
                value={formData.mode}
                onChange={e => setFormData({...formData, mode: e.target.value as ReadingMode})}
                className="w-full text-xl py-2 bg-transparent border-b border-line/20 focus:border-ink outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="PHYSICAL">Physical</option>
                <option value="PDF">PDF / Digital</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-bg py-6 font-bold text-xs uppercase tracking-[3px] hover:opacity-80 transition-all disabled:opacity-50 mt-10"
          >
            {loading ? 'INITIALIZING...' : 'Initialize Record'}
          </button>
        </form>
      </div>
    </div>
  );
}
