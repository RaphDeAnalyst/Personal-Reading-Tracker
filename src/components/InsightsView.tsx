import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Icon from './Icon';
import {
  Target, TrendingUp, Activity, Lightbulb, Settings,
  HelpCircle, Moon, Sun, Quote, Star, Edit, Brain,
  Timer, FolderOpen, Pen, BookOpen, Archive, Calendar
} from 'lucide-react';


interface InsightsData {
  stats: {
    completedBooks: number;
    totalPagesRead: number;
    totalReflections: number;
    streak: number;
    averagePagesPerDay: number;
    consistencyScore: number;
    consistencyLevel: string;
    goalCompletions: number;
  };
  trend: { day: string; pages: number; fullDate: string; dayOfWeek: number }[];
  recentReflections: { content: string; rating: number; title: string; author: string }[];
  genreDistribution: { name: string; count: number }[];
  authorDistribution: { author: string; count: number }[];
  reflectionDates?: string[];
}

interface GoalReadingEntry {
  id: number;
  year: number;
  book_id: number;
  completed_at: string;
  title: string;
  author: string;
  cover_url: string | null;
  mode: 'PHYSICAL' | 'DIGITAL' | null;
  pdf_file_path: string | null;
  book_exists: number;
  reflection_id: number | null;
  rating: number | null;
  content: string | null;
  learning: string | null;
  application: string | null;
  disagreement: string | null;
}

function DistributionChart({ title, data, icon, total }: { title: string; data: { name: string; count: number }[]; icon: any, total: number }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <section className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 shadow-sm flex-1">
      <h3 className="font-headline italic text-xl flex items-center gap-3 mb-8">
        <Icon icon={icon} size="md" />
        {title}
      </h3>
      <div className="space-y-6">
        {data.length > 0 ? data.map((item, i) => {
          const percentage = Math.round((item.count / total) * 100);
          const barWidth = Math.max((item.count / maxCount) * 100, 4);

          return (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="font-label text-[10px] uppercase tracking-widest font-bold text-on-surface truncate pr-4">{item.name}</span>
                <span className="font-label text-[9px] text-on-surface-variant font-bold">{percentage}% · {item.count} {item.count === 1 ? 'Vol.' : 'Vols.'}</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className="h-full bg-primary rounded-full relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10"></div>
                </motion.div>
              </div>
            </div>
          );
        }) : (
          <p className="text-center py-8 text-sm text-on-surface-variant italic font-headline opacity-60">Not enough data to map distribution.</p>
        )}
      </div>
    </section>
  );
}

interface InsightsViewProps {
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  fontPreference: 'serif' | 'sans';
  onToggleFont: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSelectBook?: (bookId: number) => void;
  onOpenReader?: (bookId: number) => void;
  onWriteReflection?: (bookId: number) => void;
}

interface GoalData {
  year: number;
  target_value: number;
}

export default function InsightsView({ showToast, fontPreference, onToggleFont, theme, onToggleTheme, onSelectBook, onOpenReader, onWriteReflection }: InsightsViewProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalReadingList, setGoalReadingList] = useState<GoalReadingEntry[]>([]);
  const [selectedGoalYear, setSelectedGoalYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const [insightsRes, goalRes, readingListRes] = await Promise.all([
          fetch('/api/insights'),
          fetch(`/api/goals/${currentYear}`),
          fetch('/api/goals/reading-list')
        ]);
        if (!insightsRes.ok) throw new Error("Failed to fetch insights");
        const json = await insightsRes.json();
        setData(json);
        if (goalRes.ok) {
          const goalJson = await goalRes.json();
          setGoal(goalJson);
          setGoalInput(goalJson.target_value?.toString() || '');
        }
        if (readingListRes.ok) {
          const readingListData = await readingListRes.json();
          setGoalReadingList(readingListData);
        }
      } catch (err) {
        console.error(err);
        showToast?.("Could not gather your journey details", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [showToast]);

  const handleSaveGoal = async () => {
    const value = parseInt(goalInput, 10);
    if (isNaN(value) || value <= 0) {
      showToast?.("Please enter a valid number", "error");
      return;
    }

    setSavingGoal(true);
    try {
      const currentYear = new Date().getFullYear();
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: currentYear, target_value: value })
      });
      if (res.ok) {
        const updatedGoal = await res.json();
        setGoal(updatedGoal);
        setEditingGoal(false);
        showToast?.("Reading goal updated", "success");
      } else {
        showToast?.("Failed to save goal", "error");
      }
    } catch (err) {
      console.error(err);
      showToast?.("Error saving goal", "error");
    } finally {
      setSavingGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-6">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
        <p className="font-headline italic text-on-surface-variant text-lg">Gathering your journey...</p>
      </div>
    );
  }

  if (!data) return null;

  // Compute wisdom index: percentage of books with reflections
  const wisdomIndex = data.stats.completedBooks > 0
    ? Math.round((data.stats.totalReflections / data.stats.completedBooks) * 100)
    : 0;

  // Compute average time to complete (days between start and completion)
  // For now, we'll estimate based on pages and reading pace
  const avgTimeToComplete = data.stats.completedBooks > 0 && data.stats.averagePagesPerDay > 0
    ? Math.round(data.stats.totalPagesRead / data.stats.completedBooks / data.stats.averagePagesPerDay)
    : 0;

  const last7Days = data.trend.slice(-7);
  const maxPages = Math.max(...last7Days.map(t => t.pages), 10);
  const dailyAverageThreshold = data.stats.averagePagesPerDay;
  const peakPages = Math.max(...last7Days.map(t => t.pages));

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <header className="mb-12 flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="min-w-0">
          <h2 className="serif-text text-3xl sm:text-4xl text-on-surface mb-2 break-words">My Archive</h2>
          <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest break-words">Wisdom & Reflection</p>
        </div>
        <button
          onClick={onToggleTheme}
          className="group relative flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/10 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all shadow-sm active:scale-95"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          <Icon icon={theme === 'light' ? Moon : Sun} size="md" />
          <span className="font-label text-[10px] uppercase tracking-widest font-bold">
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </span>
        </button>
      </header>

      {/* Wisdom-Focused Stats Grid - Replaces streak and avg pages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-12">
        <StatCard
          label="Books Completed"
          value={data.stats.completedBooks}
          icon={BookOpen}
          color="text-primary"
          tooltip="Books you have read and completed — this count is permanent and won't change if you remove books from your library"
        />
        <StatCard
          label="Wisdom Index"
          value={`${wisdomIndex}%`}
          icon={Lightbulb}
          color="text-tertiary"
          description="Books with reflections"
          tooltip="Percentage of completed books with written reflections—a measure of thoughtful engagement"
        />
        <StatCard
          label="Avg. Days to Finish"
          value={avgTimeToComplete}
          icon={Timer}
          color="text-secondary"
          description="Sustainable pace"
          tooltip="Average days to finish a book based on your reading speed—reflects sustainable, mindful pacing"
        />
        <StatCard
          label="Total Reflections"
          value={data.stats.totalReflections}
          icon={Brain}
          color="text-primary"
          tooltip="Total reflection entries written across all your books"
        />
        <StatCard
          label="Consistency"
          value={`${data.stats.consistencyScore}%`}
          icon={Activity}
          color="text-secondary"
          description={data.stats.consistencyLevel}
          tooltip="Percentage of the last 35 days where you read at least one page — a measure of reading regularity"
        />
      </div>

      {/* Annual Goal Card */}
      <div className="mb-12 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline italic text-lg text-primary flex items-center gap-3">
            <Icon icon={Target} size="md" variant="primary" />
            Annual Reading Goal
          </h3>
          <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{new Date().getFullYear()}</span>
        </div>

        {editingGoal ? (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Target books to read</label>
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-highest border border-outline-variant/20 rounded-lg text-on-surface font-label text-sm focus:outline-none focus:border-primary"
                  placeholder="Enter number of books"
                  min="1"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingGoal(false)}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGoal}
                disabled={savingGoal}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-secondary text-on-secondary hover:shadow-md transition-shadow disabled:opacity-50"
              >
                {savingGoal ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {goal && goal.target_value > 0 ? (
              <>
                <div className="flex items-end gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface font-bold">{(data?.stats.goalCompletions ?? data?.stats.completedBooks) || 0} / {goal.target_value} books</span>
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">{Math.round(((data?.stats.goalCompletions ?? data?.stats.completedBooks) || 0) / goal.target_value * 100)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((data?.stats.goalCompletions ?? data?.stats.completedBooks) || 0) / goal.target_value * 100, 100)}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-secondary rounded-full relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10"></div>
                      </motion.div>
                    </div>
                  </div>
                  <span className="font-headline text-xl text-secondary font-medium min-w-fit">
                    {Math.max(goal.target_value - ((data?.stats.goalCompletions ?? data?.stats.completedBooks) || 0), 0)}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <p className="text-[11px] text-on-surface-variant italic">
                    {goal.target_value - ((data?.stats.goalCompletions ?? data?.stats.completedBooks) || 0) > 0 ? `${goal.target_value - ((data?.stats.goalCompletions ?? data?.stats.completedBooks) || 0)} volumes to complete` : 'Goal achieved—your sanctuary grows!'}
                  </p>
                  <button
                    onClick={() => {
                      setGoalInput(goal.target_value.toString());
                      setEditingGoal(true);
                    }}
                    className="flex-shrink-0 px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5"
                  >
                    <Icon icon={Edit} size="sm" />
                    Edit
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant italic">No goal set yet. Set an annual reading target to track your progress.</p>
                <button
                  onClick={() => {
                    setGoalInput('');
                    setEditingGoal(true);
                  }}
                  className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg bg-secondary text-on-secondary hover:shadow-md transition-shadow"
                >
                  + Set Goal
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Charts Section (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-headline italic text-xl flex items-center gap-3">
                <Icon icon={TrendingUp} size="md" />
                Reading Momentum
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30"></div>
                  <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Standard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                  <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Active</span>
                </div>
              </div>
            </div>

            <div className="relative h-64 flex flex-col pt-8">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pr-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-full flex items-center gap-3">
                    <span className="font-label text-[10px] font-bold text-on-surface w-8 text-right uppercase tracking-tighter">
                      {Math.round((maxPages * (1 - i / 3)))}p.
                    </span>
                    <div className="flex-1 h-[1px] bg-on-surface/20 border-t border-dashed border-on-surface/10"></div>
                  </div>
                ))}
              </div>

              {dailyAverageThreshold > 0 && (
                <div
                  className="absolute left-11 right-0 border-t-2 border-dashed border-tertiary z-10 pointer-events-none"
                  style={{ bottom: `${Math.max((dailyAverageThreshold / maxPages) * 208 + 48, 56)}px` }}
                >
                  <div className="absolute -top-5 right-0 bg-tertiary text-on-tertiary text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest shadow-sm">
                    Avg {Math.round(dailyAverageThreshold)}p/day
                  </div>
                </div>
              )}

              <div className="flex justify-between h-full gap-2 sm:gap-4 pl-11 relative z-20">
                {last7Days.map((t, i) => {
                  const isPeak = t.pages === peakPages && peakPages > 0;
                  const isAboveAverage = t.pages >= dailyAverageThreshold && t.pages > 0;

                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group h-full">
                      <div className="relative w-full flex-1 flex flex-col items-center justify-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max((t.pages / maxPages) * 100, 2)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className={`w-full max-w-[32px] rounded-t-sm transition-all relative border min-h-[4px] ${
                            isAboveAverage
                              ? 'bg-primary border-primary shadow-[0_0_12px_rgba(var(--color-primary),0.4)]'
                              : 'bg-primary/40 border-primary/20'
                          }`}
                        >
                          <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-container-high border border-outline-variant/20 text-[9px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 transform group-hover:-translate-y-1`}>
                            <span className="text-on-surface">{t.pages} pages</span>
                            {isPeak && <span className="ml-1.5 text-tertiary">★ Peak</span>}
                          </div>

                          {isPeak && (
                             <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary animate-bounce">
                               <Icon icon={Star} size="sm" variant="primary" />
                             </div>
                          )}
                        </motion.div>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-label text-[9px] uppercase tracking-widest font-bold ${t.pages > 0 ? 'text-on-surface' : 'text-on-surface-variant/40'}`}>
                          {t.day}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-outline-variant/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="font-headline italic text-xs text-on-surface-variant max-w-[280px]">
                {peakPages > dailyAverageThreshold
                  ? "Your archive expands with steady rhythm. Depth builds through consistent presence."
                  : "Every page read is an offering to wisdom. Depth matters more than haste."}
              </p>
              <div className="text-right shrink-0">
                <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Weekly Volume</span>
                <span className="serif-text text-2xl text-primary font-medium">{last7Days.reduce((sum, t) => sum + t.pages, 0)} Pages</span>
              </div>
            </div>
          </section>

          <ReadingHeatmap
            trend={data.trend}
            consistencyScore={data.stats.consistencyScore}
            consistencyLevel={data.stats.consistencyLevel}
          />

          {/* Genre & Author Distribution */}
          <div className="flex flex-col md:flex-row gap-6">
            <DistributionChart
              title="Genre Topography"
              data={data.genreDistribution}
              icon={FolderOpen}
              total={data.stats.completedBooks || 1}
            />
            <DistributionChart
              title="Author Influence"
              data={data.authorDistribution.map(a => ({ name: a.author, count: a.count }))}
              icon={Pen}
              total={data.stats.completedBooks || 1}
            />
          </div>
        </div>

        {/* Right Sidebar (1/3) - Recent Wisdom & Settings */}
        <div className="space-y-8">
          {/* Recent Wisdom */}
          <section className="space-y-4">
            <h3 className="font-headline italic text-lg flex items-center gap-3 text-tertiary">
              <Icon icon={Lightbulb} size="md" variant="success" />
              Recent Wisdom
            </h3>
            <div className="space-y-4">
              {data.recentReflections.length > 0 ? data.recentReflections.slice(0, 5).map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0">
                      <h4 className="serif-text text-sm text-on-surface leading-tight break-words">{r.title}</h4>
                      <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/70 mt-1">{r.author}</p>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {[...Array(5)].map((_, idx) => (
                        <span key={idx} className="text-xs">
                          {idx < (r.rating || 0) ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 italic">"{r.content}"</p>
                </motion.div>
              )) : (
                <div className="py-8 text-center border-2 border-dashed border-outline-variant/10 rounded-xl text-on-surface-variant italic font-headline opacity-60 text-sm">
                  Begin your reflections. <br />Wisdom awaits.
                </div>
              )}
            </div>
          </section>

          {/* Reading Archive */}
          {goalReadingList.length > 0 && (
            <section className="col-span-full">
              <div className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <Icon icon={Archive} size="md" variant="muted" />
                  <h2 className="font-serif text-lg text-on-surface">Reading Archive</h2>
                </div>

                {/* Year tabs */}
                {(() => {
                  const availableYears = [...new Set(goalReadingList.map(e => e.year))].sort((a, b) => b - a);
                  const filteredList = goalReadingList.filter(e => e.year === selectedGoalYear);

                  return (
                    <>
                      <div className="flex gap-2 mb-6 flex-wrap">
                        {availableYears.map(year => (
                          <button
                            key={year}
                            onClick={() => setSelectedGoalYear(year)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors
                              ${selectedGoalYear === year
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>

                      {/* Book list */}
                      {filteredList.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-on-surface-variant">
                          <Icon icon={BookOpen} size="xl" variant="muted" />
                          <p className="text-sm">No books completed toward your {selectedGoalYear} goal yet.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col divide-y divide-outline-variant/20">
                          {filteredList.map(entry => {
                            const reflectionSnippet = entry.learning || entry.content || '';
                            const displayDate = new Date(entry.completed_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            });

                            return (
                              <div key={entry.id} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                                {/* Cover thumbnail */}
                                <div className="w-10 h-14 bg-surface-container rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                                  {entry.cover_url ? (
                                    <img src={entry.cover_url} alt={entry.title} className="w-full h-full object-cover" />
                                  ) : (
                                    <Icon icon={BookOpen} size="md" variant="muted" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-1">
                                    <div className="min-w-0">
                                      <h4 className="font-serif text-sm text-on-surface truncate">{entry.title}</h4>
                                      <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">{entry.author}</p>
                                    </div>
                                    {!entry.book_exists && (
                                      <span className="text-xs bg-error/10 text-error px-2 py-1 rounded whitespace-nowrap flex-shrink-0">Removed</span>
                                    )}
                                  </div>

                                  <p className="text-xs text-on-surface-variant mb-2">{displayDate}</p>

                                  {/* Star rating */}
                                  {entry.rating && (
                                    <div className="flex gap-0.5 mb-2">
                                      {[...Array(5)].map((_, idx) => (
                                        <Icon
                                          key={idx}
                                          icon={Star}
                                          size="xs"
                                          className={idx < entry.rating! ? 'fill-tertiary text-tertiary' : 'text-outline-variant/30'}
                                        />
                                      ))}
                                    </div>
                                  )}

                                  {/* Reflection snippet */}
                                  {reflectionSnippet && (
                                    <p className="text-xs text-on-surface-variant italic line-clamp-2 mb-2">"{reflectionSnippet}"</p>
                                  )}

                                  {/* Action buttons */}
                                  <div className="flex gap-2 flex-wrap">
                                    {entry.book_exists && (
                                      <>
                                        <button
                                          onClick={() => onSelectBook?.(entry.book_id)}
                                          className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                                        >
                                          View
                                        </button>
                                        {entry.mode === 'DIGITAL' && entry.pdf_file_path && (
                                          <button
                                            onClick={() => onOpenReader?.(entry.book_id)}
                                            className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                                          >
                                            Read
                                          </button>
                                        )}
                                      </>
                                    )}
                                    <button
                                      onClick={() => onWriteReflection?.(entry.book_id)}
                                      className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                                    >
                                      {entry.reflection_id ? 'Edit' : 'Write'} Reflection
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </section>
          )}

          {/* Preferences Card */}
          <section className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
            <h3 className="font-headline italic text-lg mb-5 flex items-center gap-3 text-on-surface">
              <Icon icon={Settings} size="md" />
              Preferences
            </h3>

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <span className="font-label text-[9px] uppercase tracking-widest font-bold text-on-surface-variant">Font Style</span>
                <div className="flex bg-surface-container-high p-1 rounded-lg">
                  <button
                    onClick={() => fontPreference !== 'serif' && onToggleFont()}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${fontPreference === 'serif' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Serif
                  </button>
                  <button
                    onClick={() => fontPreference !== 'sans' && onToggleFont()}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${fontPreference === 'sans' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Sans
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-label text-[9px] uppercase tracking-widest font-bold text-on-surface-variant">Appearance</span>
                <div className="flex bg-surface-container-high p-1 rounded-lg">
                  <button
                    onClick={() => theme !== 'light' && onToggleTheme()}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${theme === 'light' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => theme !== 'dark' && onToggleTheme()}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${theme === 'dark' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Inspirational Quote */}
          <div className="p-6 text-center bg-secondary/5 rounded-2xl border border-secondary/10 flex flex-col items-center gap-4">
             <Icon icon={Quote} size="lg" variant="muted" />
             <p className="serif-text italic text-sm text-on-surface-variant leading-relaxed">
               "Reading is a conversation with the author. Your reflections are the continuation of that dialogue."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadingHeatmap({
  trend,
  consistencyScore,
  consistencyLevel,
}: {
  trend: { day: string; pages: number; fullDate: string; dayOfWeek: number }[];
  consistencyScore: number;
  consistencyLevel: string;
}) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const maxPages = Math.max(...trend.map(t => t.pages), 1);
  const datePageMap = new Map(trend.map(t => [t.fullDate, t.pages]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = toLocalDateStr(today);

  // Align grid start to the Monday of 3 weeks before the current week's Monday
  const dow = today.getDay(); // 0 = Sunday
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - daysSinceMonday - 21);

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  type DayCell = {
    dateStr: string;
    date: Date;
    pages: number;
    isFuture: boolean;
    isToday: boolean;
  };

  const weeks: DayCell[][] = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const dateStr = toLocalDateStr(date);
      const isFuture = date > today;
      return {
        dateStr,
        date,
        pages: isFuture ? 0 : (datePageMap.get(dateStr) ?? 0),
        isFuture,
        isToday: dateStr === todayStr,
      };
    })
  );

  const intensityClass = (pages: number, isFuture: boolean): string => {
    if (isFuture) return 'bg-surface-container-highest opacity-25';
    if (pages === 0) return 'bg-surface-container-highest';
    const ratio = pages / maxPages;
    if (ratio <= 0.25) return 'bg-primary/25';
    if (ratio <= 0.5) return 'bg-primary/50';
    if (ratio <= 0.75) return 'bg-primary/75';
    return 'bg-primary';
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const LEGEND_STEPS = [
    'bg-surface-container-highest',
    'bg-primary/25',
    'bg-primary/50',
    'bg-primary/75',
    'bg-primary',
  ];

  return (
    <section className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <h3 className="font-headline italic text-xl flex items-center gap-3">
            <Icon icon={Calendar} size="md" />
            Reading Rhythm
          </h3>
          <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">
            28-Day Activity Calendar
          </p>
        </div>
        <div className="flex items-center gap-4 bg-surface-container-high/50 px-5 py-2.5 rounded-xl border border-outline-variant/5">
          <div className="text-right">
            <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Consistency</span>
            <span className="serif-text text-xl text-primary font-medium">{consistencyLevel}</span>
          </div>
          <div className="w-[1px] h-8 bg-outline-variant/20 mx-1" />
          <div className="text-right">
            <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Score</span>
            <span className="serif-text text-xl text-tertiary font-medium">{consistencyScore}%</span>
          </div>
        </div>
      </div>

      {/* Day-of-week column headers */}
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {DAY_LABELS.map(label => (
          <div key={label} className="text-center font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold py-0.5">
            {label}
          </div>
        ))}
      </div>

      {/* Heatmap grid — 4 rows × 7 columns */}
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1.5">
            {week.map(cell => (
              <div
                key={cell.dateStr}
                className={[
                  'aspect-square rounded-md relative transition-transform duration-150',
                  !cell.isFuture ? 'cursor-default hover:scale-110 hover:z-10' : 'cursor-default',
                  intensityClass(cell.pages, cell.isFuture),
                  cell.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface-container-low' : '',
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => !cell.isFuture && setHoveredCell(cell.dateStr)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {/* Date number inside cell */}
                <span className={[
                  'absolute inset-0 flex items-end justify-center pb-0.5 font-label text-[7px] font-bold select-none',
                  cell.pages > 0 && !cell.isFuture ? 'text-on-surface/50' : 'text-on-surface-variant/25',
                ].join(' ')}>
                  {cell.date.getDate()}
                </span>

                {/* Hover tooltip */}
                {hoveredCell === cell.dateStr && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                    <div className="bg-on-surface text-surface rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-xl font-label">
                      <div className="font-bold">{formatDate(cell.date)}</div>
                      <div className="opacity-75 mt-0.5">
                        {cell.pages > 0 ? `${cell.pages} pages read` : 'No reading recorded'}
                      </div>
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-on-surface" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer: legend + today indicator */}
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-outline-variant/10">
        <div className="flex items-center gap-2">
          <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">Less</span>
          <div className="flex gap-1 items-center">
            {LEGEND_STEPS.map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
            ))}
          </div>
          <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">More</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm ring-2 ring-primary ring-offset-1 ring-offset-surface-container-low bg-surface-container-low" />
          <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">Today</span>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  description,
  tooltip
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  description?: string;
  tooltip?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-container-low p-4 sm:p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col gap-3 min-w-0 hover:shadow-md transition-shadow relative"
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-high flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon icon={icon} size="lg" />
        </div>
        {tooltip && (
          <div className="relative flex-shrink-0">
            <button
              className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
              title="Learn more"
              aria-label="More information"
            >
              <Icon icon={HelpCircle} size="sm" variant="muted" />
            </button>

            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute -right-2 top-8 z-50 bg-on-surface text-surface rounded-lg p-3 shadow-lg min-w-[200px] max-w-[240px] text-[11px] leading-relaxed font-label"
              >
                {tooltip}
                <div className="absolute -top-1.5 right-1 w-3 h-3 bg-on-surface transform rotate-45"></div>
              </motion.div>
            )}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="serif-text text-xl sm:text-2xl text-on-surface font-medium break-words leading-tight">{value}</div>
        <p className="font-label text-[9px] sm:text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 break-words">{label}</p>
        {description && (
          <p className="font-label text-[8px] uppercase tracking-widest text-on-surface-variant/70 mt-2">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
