import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface InsightsData {
  stats: {
    completedBooks: number;
    totalPagesRead: number;
    totalReflections: number;
    streak: number;
    averagePagesPerDay: number;
  };
  trend: { day: string; pages: number }[];
  recentReflections: { content: string; rating: number; title: string; author: string }[];
}

interface InsightsViewProps {
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  fontPreference: 'serif' | 'sans';
  onToggleFont: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function InsightsView({ showToast, fontPreference, onToggleFont, theme, onToggleTheme }: InsightsViewProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/insights');
        if (!res.ok) throw new Error("Failed to fetch insights");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        showToast?.("Could not gather your journey details", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        <p className="font-headline italic text-on-surface-variant text-lg">Gathering your progress...</p>
      </div>
    );
  }

  if (!data) return null;

  const maxTrend = Math.max(...data.trend.map(t => t.pages), 1);

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <header className="mb-12 flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="min-w-0">
          <h2 className="serif-text text-3xl sm:text-4xl text-on-surface mb-2 break-words">My Journey</h2>
          <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest break-words">Insights & Growth</p>
        </div>
        <button 
          onClick={onToggleTheme}
          className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all shadow-sm active:scale-95"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </span>
        </button>
      </header>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
        <StatCard 
          label="Books Completed" 
          value={data.stats.completedBooks} 
          icon="auto_stories" 
          color="text-primary"
        />
        <StatCard 
          label="Total Pages" 
          value={data.stats.totalPagesRead} 
          icon="menu_book" 
          color="text-tertiary"
        />
        <StatCard 
          label="Reading Streak" 
          value={`${data.stats.streak} Days`} 
          icon="local_fire_department" 
          color="text-orange-500"
        />
        <StatCard 
          label="Avg. Pages/Day" 
          value={data.stats.averagePagesPerDay} 
          icon="speed" 
          color="text-secondary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Trend Section */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10">
            <h3 className="font-headline italic text-xl mb-8 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">trending_up</span>
              Reading Activity
            </h3>
            <div className="flex items-end justify-between h-48 gap-2 pt-4">
              {data.trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div className="relative w-full flex flex-col items-center justify-end h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max((t.pages / maxTrend) * 100, 2)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="w-full max-w-[40px] bg-primary/60 rounded-t-sm group-hover:bg-primary/100 transition-colors relative border border-primary/30 min-h-[6px]"
                    >
                      {t.pages > 0 && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface border border-outline-variant/20 text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                          {t.pages} p.
                        </div>
                      )}
                    </motion.div>
                    </div>

                  <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{t.day}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Reflections */}
          <section className="space-y-6">
            <h3 className="font-headline italic text-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-tertiary">psychology</span>
              Recent Insights
            </h3>
            <div className="grid gap-4">
              {data.recentReflections.length > 0 ? data.recentReflections.map((r, i) => (
                <div key={i} className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="serif-text text-lg text-on-surface leading-tight">{r.title}</h4>
                      <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant/70 mt-1">{r.author}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, idx) => (
                        <span key={idx} className={`material-symbols-outlined text-[14px] ${idx < r.rating ? 'text-primary' : 'text-outline-variant/30'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 italic">"{r.content}"</p>
                </div>
              )) : (
                <div className="py-12 text-center border-2 border-dashed border-outline-variant/10 rounded-xl text-on-surface-variant italic font-headline opacity-60">
                  No reflections written yet. Your wisdom awaits.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Preferences */}
        <div className="space-y-8">
          <section className="bg-secondary-container/10 p-8 rounded-2xl border border-secondary/10">
            <h3 className="font-headline italic text-xl mb-6 flex items-center gap-3 text-secondary">
              <span className="material-symbols-outlined">settings</span>
              Preferences
            </h3>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-3">
                <span className="font-label text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Reading Font</span>
                <div className="flex bg-surface-container-high p-1 rounded-lg">
                  <button 
                    onClick={() => fontPreference !== 'serif' && onToggleFont()}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded transition-all ${fontPreference === 'serif' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Serif
                  </button>
                  <button 
                    onClick={() => fontPreference !== 'sans' && onToggleFont()}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded transition-all ${fontPreference === 'sans' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Sans
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="font-label text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Appearance</span>
                <div className="flex bg-surface-container-high p-1 rounded-lg">
                  <button 
                    onClick={() => theme !== 'light' && onToggleTheme()}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded transition-all ${theme === 'light' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Light
                  </button>
                  <button 
                    onClick={() => theme !== 'dark' && onToggleTheme()}
                    className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded transition-all ${theme === 'dark' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/10">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="font-label text-[11px] font-bold uppercase tracking-widest">Library Totals</span>
                  <span className="serif-text italic text-lg">{data.stats.totalReflections} Reflections</span>
                </div>
              </div>
            </div>
          </section>

          {/* Calm Milestone / Quote */}
          <div className="p-8 text-center bg-primary/5 rounded-2xl border border-primary/10">
             <span className="material-symbols-outlined text-primary/30 text-4xl mb-4">format_quote</span>
             <p className="serif-text italic text-on-surface-variant leading-relaxed">
               "Reading is an active dialogue between the author and your own soul. The archives grow as you do."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-surface-container-low p-4 sm:p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col gap-4 min-w-0">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-high flex items-center justify-center ${color}`}>
        <span className="material-symbols-outlined text-[18px] sm:text-[20px]">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="serif-text text-xl sm:text-2xl text-on-surface font-medium break-words leading-tight">{value}</div>
        <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 break-words">{label}</p>
      </div>
    </div>
  );
}
