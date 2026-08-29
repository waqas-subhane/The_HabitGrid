import React, { useState, useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Flame, Award, Calendar, CheckCircle, BarChart3, Filter } from 'lucide-react';
import { Habit, DailyLog } from './types';
import { DEFAULT_CATEGORIES, formatDate, getDayAbbrev } from './storage';

interface AnalyticsViewProps {
  habits: Habit[];
  logs: DailyLog[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ habits, logs }) => {
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);

  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  // Daily trend data over selected time range
  const trendData = useMemo(() => {
    const data: { date: string; label: string; rate: number; count: number }[] = [];
    const today = new Date();

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      
      let done = 0;
      activeHabits.forEach((habit) => {
        const log = logs.find(l => l.habitId === habit.id && l.date === dateStr);
        if (log?.completed) done++;
      });

      const total = activeHabits.length || 1;
      const rate = Math.round((done / total) * 100);

      data.push({
        date: dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        rate,
        count: done,
      });
    }

    return data;
  }, [timeRange, activeHabits, logs]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    DEFAULT_CATEGORIES.forEach(c => counts[c.id] = 0);

    logs.forEach(l => {
      if (l.completed) {
        const habit = habits.find(h => h.id === l.habitId);
        if (habit) {
          counts[habit.category] = (counts[habit.category] || 0) + 1;
        }
      }
    });

    return DEFAULT_CATEGORIES.map(c => ({
      name: c.name,
      value: counts[c.id] || 0,
      icon: c.icon,
    }));
  }, [habits, logs]);

  // Day of week performance breakdown
  const dayOfWeekData = useMemo(() => {
    const daysMap = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const totalPossible: Record<string, number> = { Su: 0, Mo: 0, Tu: 0, We: 0, Th: 0, Fr: 0, Sa: 0 };
    const totalDone: Record<string, number> = { Su: 0, Mo: 0, Tu: 0, We: 0, Th: 0, Fr: 0, Sa: 0 };

    trendData.forEach(item => {
      const d = new Date(item.date);
      const dayAbbrev = daysMap[d.getDay()];
      totalPossible[dayAbbrev] += activeHabits.length;
      totalDone[dayAbbrev] += item.count;
    });

    return daysMap.map(day => {
      const possible = totalPossible[day] || 1;
      const done = totalDone[day] || 0;
      return {
        day,
        rate: Math.round((done / possible) * 100),
      };
    });
  }, [trendData, activeHabits]);

  // Top Habit by completion
  const topHabit = useMemo(() => {
    if (habits.length === 0) return null;
    let bestHabit = habits[0];
    let maxCompletions = -1;

    habits.forEach(h => {
      const count = logs.filter(l => l.habitId === h.id && l.completed).length;
      if (count > maxCompletions) {
        maxCompletions = count;
        bestHabit = h;
      }
    });

    return { habit: bestHabit, count: maxCompletions };
  }, [habits, logs]);

  // Colors for charts
  const PIE_COLORS = ['#4d7c5f', '#6b7280', '#8b5cf6', '#d97706', '#6366f1', '#0d9488'];

  return (
    <div className="space-y-6">
      
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#23211e] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Visual Analytics & Long-Term Trends</span>
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Deep insights into habit consistency and long-term momentum</p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center space-x-1.5 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
          <button
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === 30
                ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange(60)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === 60
                ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            60 Days
          </button>
          <button
            onClick={() => setTimeRange(90)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeRange === 90
                ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Primary Trend Area Chart */}
      <div className="bg-white dark:bg-[#23211e] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Completion Rate Trend ({timeRange} Days)</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Track your overall percentage score over time</p>
          </div>
          <div className="flex items-center space-x-1 text-emerald-800 dark:text-emerald-300 text-xs font-semibold bg-emerald-900/10 px-2.5 py-1 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Progress</span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4d7c5f" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4d7c5f" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="#a8a29e" fontSize={10} tickLine={false} />
              <YAxis domain={[0, 100]} stroke="#a8a29e" fontSize={10} tickFormatter={(val) => `${val}%`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-stone-900 text-stone-100 text-xs p-3 rounded-xl shadow-md border border-stone-700">
                        <p className="font-bold text-stone-200">{data.date}</p>
                        <p className="text-emerald-400 font-extrabold text-sm">Rate: {data.rate}%</p>
                        <p className="text-stone-400">Goals Checked: {data.count} / {activeHabits.length}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="rate" stroke="#4d7c5f" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Day of Week Bar Chart & Category Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Day-of-Week Performance */}
        <div className="bg-white dark:bg-[#23211e] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xs">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1">Consistency by Day of Week</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Identify your most productive days vs weekend dips</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#a8a29e" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#a8a29e" fontSize={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-900 text-stone-100 text-xs p-2.5 rounded-lg border border-stone-700">
                          <p className="font-bold">{data.day}: {data.rate}% Avg Success</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="rate" fill="#4d7c5f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Life Domain Category Balance */}
        <div className="bg-white dark:bg-[#23211e] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xs">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-1">Life Domain Balance</h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">Distribution of completed goals across categories</p>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-900 text-stone-100 text-xs p-2.5 rounded-lg border border-stone-700">
                          <p className="font-bold">{data.icon} {data.name}: {data.value} Check-ins</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Top Performing Habit Highlight Card */}
      {topHabit && topHabit.habit && (
        <div className="bg-stone-900 dark:bg-[#201e1b] text-stone-100 p-6 rounded-2xl shadow-xs border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-800/90 flex items-center justify-center text-3xl shadow-inner border border-stone-700">
              {topHabit.habit.emoji || '⭐'}
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-emerald-400 block">Top Consistent Goal</span>
              <h4 className="text-xl font-bold">{topHabit.habit.title}</h4>
              <p className="text-xs text-stone-400 mt-0.5">{topHabit.count} total check-ins logged so far!</p>
            </div>
          </div>

          <div className="bg-stone-800/80 px-4 py-2.5 rounded-xl border border-stone-700 text-center">
            <span className="text-xs text-stone-400 block">Consistency Score</span>
            <span className="text-xl font-extrabold text-stone-100">98% High</span>
          </div>
        </div>
      )}

    </div>
  );
};
