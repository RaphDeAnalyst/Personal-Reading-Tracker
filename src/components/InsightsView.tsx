import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Icon from './Icon';
import {
  Target, TrendingUp, Activity, Lightbulb, Settings,
  HelpCircle, Moon, Sun, Quote, Star, Edit, Brain,
  Timer, FolderOpen, Pen, Loader2, Zap, BookOpen
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
  };
  trend: { day: string; pages: number; fullDate: string; dayOfWeek: number }[];
  recentReflections: { content: string; rating: number; title: string; author: string }[];
  genreDistribution: { name: string; count: number }[];
  authorDistribution: { author: string; count: number }[];
  reflectionDates?: string[];
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
                <span className="font-label text-[9px] text-on-surface-variant font-bold">{item.count} Volumes</span>
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
}

interface GoalData {
  year: number;
  target_value: number;
}

export default function InsightsView({ showToast, fontPreference, onToggleFont, theme, onToggleTheme }: InsightsViewProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [goal, setGoal] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const [insightsRes, goalRes] = await Promise.all([
          fetch('/api/insights'),
          fetch(`/api/goals/${currentYear}`)
        ]);
        if (!insightsRes.ok) throw new Error("Failed to fetch insights");
        const json = await insightsRes.json();
        setData(json);
        if (goalRes.ok) {
          const goalJson = await goalRes.json();
          setGoal(goalJson);
          setGoalInput(goalJson.target_value?.toString() || '');
        }
      } catch (err) {
        console.error(err);
        showToast?.("Could not gather your journey details", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

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

  // Chronicle Wave Logic
  const chartHeight = 120;
  const chartWidth = 800;
  const points = data.trend.slice(-30).map((t, i) => ({
    x: (i / 29) * chartWidth,
    y: chartHeight - (Math.min(t.pages / (Math.max(maxPages, 10)), 1) * chartHeight)
  }));

  const generatePath = (pts: {x: number, y: number}[]) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i+1];
      const midX = (curr.x + next.x) / 2;
      d += ` Q ${curr.x},${curr.y} ${midX},${(curr.y + next.y) / 2}`;
    }
    d += ` L ${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
    return d;
  };

  const pathD = generatePath(points);
  const areaD = `${pathD} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z`;

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
        <StatCard
          label="Books Completed"
          value={data.stats.completedBooks}
          icon={BookOpen}
          color="text-primary"
          tooltip="Total books you've finished reading"
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
          label="Avg. Days to Complete"
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
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface font-bold">{data?.stats.completedBooks} / {goal.target_value} books</span>
                      <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">{Math.round((data?.stats.completedBooks || 0 / goal.target_value) * 100)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((data?.stats.completedBooks || 0) / goal.target_value * 100, 100)}%` }}
                        transition={{ duration: 1 }}
                        className="h-full bg-secondary rounded-full relative"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10"></div>
                      </motion.div>
                    </div>
                  </div>
                  <span className="font-headline text-xl text-secondary font-medium min-w-fit">
                    {Math.max(goal.target_value - (data?.stats.completedBooks || 0), 0)}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <p className="text-[11px] text-on-surface-variant italic">
                    {goal.target_value - (data?.stats.completedBooks || 0) > 0 ? `${goal.target_value - (data?.stats.completedBooks || 0)} volumes to complete` : 'Goal achieved—your sanctuary grows!'}
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
                  <div className="absolute -top-5 right-0 bg-tertiary text-on-tertiary text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    Pace: {dailyAverageThreshold}p
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

          {/* Chronicle Wave */}
          <section className="bg-surface-container-low p-6 sm:p-8 rounded-2xl border border-outline-variant/10 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <div className="min-w-0">
                <h3 className="font-headline italic text-xl flex items-center gap-3">
                  <Icon icon={Activity} size="md" />
                  The Chronicle Wave
                </h3>
                <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">30-Day Reading Journey</p>
              </div>
              <div className="flex items-center gap-4 bg-surface-container-high/50 px-5 py-2.5 rounded-xl border border-outline-variant/5">
                <div className="text-right">
                  <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Consistency</span>
                  <span className="serif-text text-xl text-primary font-medium">{data.stats.consistencyLevel}</span>
                </div>
                <div className="w-[1px] h-8 bg-outline-variant/20 mx-1"></div>
                <div className="text-right">
                  <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Score</span>
                  <span className="serif-text text-xl text-tertiary font-medium">{data.stats.consistencyScore}%</span>
                </div>
              </div>
            </div>

            <div className="relative h-48 w-full mt-4">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-full flex items-center gap-3">
                    <span className="font-label text-[9px] font-bold text-on-surface w-8 text-right uppercase">
                      {Math.round((maxPages * (1 - i / 2)))}p.
                    </span>
                    <div className="flex-1 h-[1px] bg-on-surface/20 border-t border-dashed border-on-surface/10"></div>
                  </div>
                ))}
              </div>

              <div className="absolute inset-0 pl-11 pb-6">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="auraGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    d={areaD}
                    fill="url(#auraGradient)"
                  />

                  <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    d={pathD}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Wisdom Nodes - Days with reflections */}
                  {data.trend.slice(-30).map((t, i) => {
                    if (t.pages === 0) return null;
                    const pt = points[i];
                    const hasReflection = data.reflectionDates?.includes(t.fullDate);

                    return (
                      <g key={i} className="group/node">
                        <motion.circle
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.5 + (i * 0.02) }}
                          cx={pt.x}
                          cy={pt.y}
                          r={hasReflection ? "5" : "3"}
                          fill={hasReflection ? "var(--color-tertiary)" : "var(--color-primary)"}
                          stroke="var(--color-background)"
                          strokeWidth="1"
                          className="cursor-help"
                        />
                        <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" className="cursor-help" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-on-surface/10 flex justify-between items-end">
              <div className="flex gap-8">
                 <div className="flex flex-col gap-1">
                   <span className="font-label text-[9px] uppercase tracking-widest text-on-surface font-bold">Timeframe</span>
                   <span className="text-[11px] font-bold text-on-surface/80">Last 30 Days</span>
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="font-label text-[9px] uppercase tracking-widest text-on-surface font-bold">Total Depth</span>
                   <span className="text-[11px] font-bold text-on-surface/80">{data.stats.totalPagesRead} Pages archived</span>
                 </div>
              </div>
              <div className="text-right">
                 <p className="font-headline italic text-sm text-on-surface max-w-[200px] leading-tight">
                   Reflection deepens every reading. The journey matters more than the destination.
                 </p>
              </div>
            </div>
          </section>

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
