import { useState, useEffect, FormEvent } from 'react';
import { BookDetail } from '../types';
import Icon from './Icon';
import { BookOpen, Info, Star } from 'lucide-react';


interface ReflectionViewProps {
  bookId: number;
  onBack: () => void;
  onComplete: (bookId: number) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const PROMPT_SETS = [
  {
    id: 'standard',
    name: 'Standard',
    prompts: [
      'What did I learn?',
      'What will I apply?',
      'What did I disagree with?'
    ],
    placeholders: [
      'Example: Discipline is more reliable than motivation',
      'Example: I will read 10 pages every morning',
      'Example: The author overgeneralized habits'
    ]
  },
  {
    id: 'philosophical',
    name: 'Philosophical',
    prompts: [
      'What truth was revealed?',
      'How does this change my worldview?',
      'What remains unanswered?'
    ],
    placeholders: [
      'Example: The nature of suffering is attachment',
      'Example: It shifted my focus toward internal peace',
      'Example: The source of true altruism'
    ]
  },
  {
    id: 'practical',
    name: 'Practical',
    prompts: [
      'What is the key takeaway?',
      'What is my next immediate action?',
      'What resource do I need next?'
    ],
    placeholders: [
      'Example: Compounding interest applies to skills too',
      'Example: Audit my current calendar',
      'Example: A deep dive into technical debt management'
    ]
  }
];

export default function ReflectionView({ bookId, onBack, onComplete, showToast }: ReflectionViewProps) {
  const [bookDetail, setBookDetail] = useState<BookDetail | null>(null);
  const [learning, setLearning] = useState('');
  const [application, setApplication] = useState('');
  const [disagreement, setDisagreement] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [showLearningTip, setShowLearningTip] = useState(false);

  const activeSet = PROMPT_SETS[activeSetIndex];

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then(res => res.json())
      .then(data => {
        setBookDetail(data);
        if (data.reflection) {
          setLearning(data.reflection.learning || '');
          setApplication(data.reflection.application || '');
          setDisagreement(data.reflection.disagreement || '');
          setRating(data.reflection.rating || 5);
        }
      })
      .catch(err => {
        console.error("Fetch book error", err);
        showToast?.("Failed to retrieve book for reflection", "error");
      });
  }, [bookId]);

  const handleCompleteBook = async () => {
    setLoading(true);
    try {
      const hasAnyContent = 
        learning.trim().length > 0 || 
        application.trim().length > 0 || 
        disagreement.trim().length > 0;

      if (hasAnyContent) {
        // Save what we have (could be full or partial)
        const content = `Learning: ${learning}\nApplication: ${application}\nDisagreement: ${disagreement}`;
        await fetch(`/api/books/${bookId}/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            rating,
            learning,
            application,
            disagreement
          })
        });
      }

      // Always mark as COMPLETED
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      if (res.ok) {
        showToast?.("Volume fully archived with reflections", "success");
        onComplete(bookId);
      } else {
        showToast?.("Failed to finalize volume", "error");
      }
    } catch (error) {
      console.error("Completion error", error);
      showToast?.("Network error while finalizing volume", "error");
    } finally {
      setLoading(false);
    }
  };


  if (!bookDetail) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <main className="pt-12 pb-48 px-6 max-w-3xl mx-auto min-h-screen flex flex-col gap-14 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Context */}
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-on-surface-variant">
            <Icon icon={BookOpen} size="lg" variant="muted" />
            <span className="text-[10px] uppercase tracking-widest font-bold font-label">Deep Reading Session</span>
          </div>
        </div>
        <div>
          <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl text-primary leading-tight break-words">
            Current Reflections
          </h2>
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <span className="text-[9px] uppercase tracking-[0.2em] font-bold font-label text-outline italic">
              Lens:
            </span>
            <div className="flex gap-2">
              {PROMPT_SETS.map((set, index) => (
                <button
                  key={set.id}
                  onClick={() => setActiveSetIndex(index)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeSetIndex === index 
                      ? 'bg-primary text-on-primary shadow-sm' 
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {set.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="font-headline italic text-lg sm:text-xl text-on-surface-variant max-w-xl border-l border-outline-variant/30 pl-6 py-1 break-words hyphens-auto">
          Synthesizing the ideas of "{bookDetail.title}"
        </p>
      </header>

      {/* Info Banner */}
      <div className="bg-tertiary/5 border border-tertiary/20 rounded-lg p-4 flex items-start gap-3">
        <Icon icon={Info} size="lg" className="flex-shrink-0" />
        <p className="text-sm text-on-surface-variant">
          <span className="font-bold text-tertiary">Tip:</span> The first field is the key—filling it marks this reflection as "archived." The other two fields are optional companions to deepen your synthesis.
        </p>
      </div>

      {/* Reflection Prompts */}
      <div className="flex flex-col gap-28">
        {/* Prompt 1 */}
        <div className="relative group">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <label className="font-headline text-2xl text-primary flex items-center gap-4">
                <span className="text-tertiary opacity-40 italic">01.</span>
                {activeSet.prompts[0]}
              </label>
              <div
                className="relative"
                onMouseEnter={() => setShowLearningTip(true)}
                onMouseLeave={() => setShowLearningTip(false)}
              >
                <button
                  className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors text-sm font-bold"
                  aria-label="Learn more about this field"
                >
                  ?
                </button>
                {showLearningTip && (
                  <div className="absolute -top-24 -right-2 z-50 bg-on-surface text-surface rounded-lg p-3 shadow-lg min-w-[260px] text-[10px] leading-relaxed font-label">
                    <p className="font-bold mb-1.5">📌 Key Field</p>
                    <p>Filling this field moves your book to "My Reflections" tab in the journal. The other fields are optional but encouraged.</p>
                    <div className="absolute top-full right-2 w-2 h-2 bg-on-surface transform rotate-45"></div>
                  </div>
                )}
              </div>
            </div>
            <div className="relative px-1">
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl font-headline leading-relaxed text-on-surface placeholder:opacity-50 min-h-[140px] resize-none"
                placeholder={activeSet.placeholders[0]}
                value={learning}
                onChange={e => setLearning(e.target.value)}
              />
              <div className="absolute -bottom-2 left-0 w-12 h-[1.5px] bg-outline-variant opacity-40 group-focus-within:w-full group-focus-within:bg-primary group-focus-within:opacity-60 transition-all duration-700 ease-in-out"></div>
            </div>
          </div>
        </div>

        {/* Prompt 2 */}
        <div className="relative group">
          <div className="flex flex-col gap-6">
            <label className="font-headline text-2xl text-primary flex items-center gap-4">
              <span className="text-tertiary opacity-40 italic">02.</span>
              {activeSet.prompts[1]}
            </label>
            <div className="relative px-1">
              <textarea 
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl font-headline leading-relaxed text-on-surface placeholder:opacity-50 min-h-[140px] resize-none" 
                placeholder={activeSet.placeholders[1]}
                value={application}
                onChange={e => setApplication(e.target.value)}
              />
              <div className="absolute -bottom-2 left-0 w-12 h-[1.5px] bg-outline-variant opacity-40 group-focus-within:w-full group-focus-within:bg-primary group-focus-within:opacity-60 transition-all duration-700 ease-in-out"></div>
            </div>
          </div>
        </div>

        {/* Prompt 3 */}
        <div className="relative group">
          <div className="flex flex-col gap-6">
            <label className="font-headline text-2xl text-primary flex items-center gap-4">
              <span className="text-tertiary opacity-40 italic">03.</span>
              {activeSet.prompts[2]}
            </label>
            <div className="relative px-1">
              <textarea 
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-xl font-headline leading-relaxed text-on-surface placeholder:opacity-50 min-h-[140px] resize-none" 
                placeholder={activeSet.placeholders[2]}
                value={disagreement}
                onChange={e => setDisagreement(e.target.value)}
              />
              <div className="absolute -bottom-2 left-0 w-12 h-[1.5px] bg-outline-variant opacity-40 group-focus-within:w-full group-focus-within:bg-primary group-focus-within:opacity-60 transition-all duration-700 ease-in-out"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Selection */}
      <section className="mt-8 flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <label className="font-headline text-xl text-primary">Rate This Volume</label>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-all duration-200 hover:scale-110"
                  aria-label={`Rate ${star} stars`}
                >
                  <Icon icon={Star} size="xl" className={star <= (hoverRating || rating) ? 'fill-tertiary text-tertiary' : 'text-outline-variant/40'} />
                </button>
              ))}
            </div>
            <span className="text-sm text-on-surface-variant font-label">
              {rating === 1 ? 'Challenging' : rating === 2 ? 'Worthwhile' : rating === 3 ? 'Insightful' : rating === 4 ? 'Memorable' : 'Transformative'}
            </span>
          </div>
        </div>

        <button
          onClick={handleCompleteBook}
          disabled={loading}
          className="w-full bg-primary text-on-primary h-14 rounded-md font-label text-[11px] tracking-[0.15em] uppercase font-bold transition-all duration-300 hover:bg-primary-dim active:scale-[0.98] shadow-lg shadow-primary/10 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Complete Book'}
        </button>
      </section>
    </main>
  );
}
