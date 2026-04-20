import { useState, useEffect } from 'react';
import { Tag } from '../types';

interface TagSelectorProps {
  selectedTagIds: number[];
  onToggleTag: (tagId: number) => void;
  onTagCreated?: (tag: Tag) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  className?: string;
  isEditing?: boolean;
}

export default function TagSelector({ 
  selectedTagIds, 
  onToggleTag, 
  onTagCreated, 
  showToast, 
  className = '',
  isEditing = true
}: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/tags')
      .then(res => res.json())
      .then(data => setAllTags(Array.isArray(data) ? data : []))
      .catch(e => console.error("Failed to fetch tags", e));
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim() || loading) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAllTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        onToggleTag(data.id);
        onTagCreated?.(data);
        setNewTagName('');
        showToast?.("New tag archived", "success");
      } else {
        showToast?.(data.error || "Failed to create tag", "error");
      }
    } catch (e) {
      console.error("Create tag error:", e);
      showToast?.("Network error while creating tag", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {allTags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id);
          if (!isEditing && !isSelected) return null;
          
          return (
            <button
              key={tag.id}
              type="button"
              disabled={!isEditing}
              onClick={() => onToggleTag(tag.id)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                isSelected
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {tag.name}
            </button>
          );
        })}
        {allTags.length === 0 && !isEditing && (
          <span className="text-[10px] text-outline-variant italic">No tags assigned</span>
        )}
      </div>

      {isEditing && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateTag();
              }
            }}
            placeholder="Add new tag..."
            className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
          <button
            type="button"
            onClick={handleCreateTag}
            disabled={loading || !newTagName.trim()}
            className="px-4 py-2 bg-primary text-on-primary rounded text-[10px] font-bold hover:bg-primary-dim transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Add'}
          </button>
        </div>
      )}
    </div>
  );
}
