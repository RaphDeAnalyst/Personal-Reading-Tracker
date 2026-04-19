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
  trend: { day: string; pages: number; fullDate: string }[];
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

  // Ensure grid starts on Sunday (dayOfWeek 0)
  const firstDay = data.trend[0];
  const paddingNeeded = firstDay.dayOfWeek || 0;
  const paddedTrend = [
    ...Array(paddingNeeded).fill(null),
    ...data.trend
  ];

  const last7Days = data.trend.slice(-7);
  const maxPages = Math.max(...last7Days.map(t => t.pages), 10);
  const dailyAverageThreshold = data.stats.averagePagesPerDay;
  const peakPages = Math.max(...last7Days.map(t => t.pages));
  
  const daysWithReading = data.trend.filter(t => t.pages > 0).length;
  const consistencyQuotient = Math.round((daysWithReading / 30) * 100);

  // --- Chronicle Wave Logic ---
  const chartHeight = 120;
  const chartWidth = 800; // Large enough for smooth resolution
  const points = data.trend.slice(-30).map((t, i) => ({
    x: (i / 29) * chartWidth,
    y: chartHeight - (Math.min(t.pages / (Math.max(maxPages, 10)), 1) * chartHeight)
  }));

  // Simple Smoothing: Quadratic Bezier helper
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
          <section className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-headline italic text-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">trending_up</span>
                Reading Momentum
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/30"></div>
                  <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Standard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                  <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Growth</span>
                </div>
              </div>
            </div>

            <div className="relative h-64 flex flex-col pt-8">
              {/* Y-Axis Scale Lines */}
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

              {/* Momentum Line (Dashed) */}
              {dailyAverageThreshold > 0 && (
                <div 
                  className="absolute left-11 right-0 border-t-2 border-dashed border-tertiary z-10 pointer-events-none"
                  style={{ bottom: `${Math.max((dailyAverageThreshold / maxPages) * 208 + 48, 56)}px` }}
                >
                  <div className="absolute -top-5 right-0 bg-tertiary text-on-tertiary text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                    Goal: {dailyAverageThreshold}p
                  </div>
                </div>
              )}

              {/* Bars Container */}
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
                          {/* Tooltip / Label */}
                          <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-container-high border border-outline-variant/20 text-[9px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 transform group-hover:-translate-y-1`}>
                            <span className="text-on-surface">{t.pages} pages</span>
                            {isPeak && <span className="ml-1.5 text-tertiary">★ Peak</span>}
                          </div>

                          {/* Peak Indicator (Icon) */}
                          {isPeak && (
                             <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary animate-bounce">
                               <span className="material-symbols-outlined text-[14px]">stat_3</span>
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
            
            {/* Descriptive Context Area */}
            <div className="mt-8 pt-6 border-t border-outline-variant/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="font-headline italic text-xs text-on-surface-variant max-w-[280px]">
                {peakPages > dailyAverageThreshold 
                  ? "Your momentum is gathering strength. The archives are expanding with your consistency." 
                  : "The archive grows in silence. Every page read is a small victory over oblivion."}
              </p>
              <div className="text-right shrink-0">
                <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Weekly Volume</span>
                <span className="serif-text text-2xl text-primary font-medium">{last7Days.reduce((sum, t) => sum + t.pages, 0)} Pages</span>
              </div>
            </div>
          </section>

          {/* Monthly Chronicle Wave */}
          <section className="bg-surface-container-low p-6 sm:p-8 rounded-2xl border border-outline-variant/10 relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <div className="min-w-0">
                <h3 className="font-headline italic text-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-tertiary">landscape</span>
                  The Chronicle Wave
                </h3>
                <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant font-bold mt-1">30-Day Momentum Terrain</p>
              </div>
              <div className="text-right">
                <span className="block font-label text-[8px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-1">Consistency Quotient</span>
                <span className="serif-text text-xl text-tertiary font-medium">{consistencyQuotient}%</span>
              </div>
            </div>

            <div className="relative h-48 w-full mt-4">
              {/* Y-Axis scale lines */}
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

              {/* The SVG Wave */}
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
                  
                  {/* Area Fill */}
                  <motion.path 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    d={areaD} 
                    fill="url(#auraGradient)" 
                  />

                  {/* Wave Line (Ink) */}
                  <motion.path 
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    d={pathD} 
                    fill="none" 
                    stroke="var(--color-primary)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    className="opacity-100"
                  />

                  {/* Wisdom Nodes (Reflections) */}
                  {data.trend.slice(-30).map((t, i) => {
                    if (t.pages === 0) return null;
                    const pt = points[i];
                    
                    // Logic to see if a reflection exists for this day 
                    const isWisdomPeak = t.pages > (maxPages * 0.8);
                    
                    return (
                      <g key={i} className="group/node">
                        <motion.circle 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.5 + (i * 0.02) }}
                          cx={pt.x} 
                          cy={pt.y} 
                          r={isWisdomPeak ? "5" : "3"} 
                          fill={isWisdomPeak ? "var(--color-tertiary)" : "var(--color-primary)"}
                          stroke="var(--color-background)"
                          strokeWidth="1"
                          className="cursor-help"
                        />
                        {/* Hover Circle */}
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
                   "The terrain of your wisdom is ever-shifting. Every peak reached opens a new horizon."
                 </p>
              </div>
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
