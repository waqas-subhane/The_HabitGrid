import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, Sparkles, Trophy, Calendar as CalendarIcon, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Habit, DailyLog } from './types';
import { formatDate, getDayAbbrev, getDaysInMonth } from './storage';
import confetti from 'canvas-confetti';

interface SpreadsheetMatrixProps {
  habits: Habit[];
  logs: DailyLog[];
  onToggleLog: (habitId: string, dateStr: string) => void;
  onOpenAddModal: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SpreadsheetMatrix: React.FC<SpreadsheetMatrixProps> = ({
  habits,
  logs,
  onToggleLog,
  onOpenAddModal,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  const activeHabits = useMemo(() => habits.filter(h => !h.archived), [habits]);

  // Days in current selected month
  const monthDays = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Map logs for quick O(1) lookup
  const logsMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    logs.forEach(l => map.set(`${l.habitId}_${l.date}`, l));
    return map;
  }, [logs]);

  // Calculate stats for selected month
  const monthStats = useMemo(() => {
    let totalPossible = 0;
    let totalCompleted = 0;

    const dailyRates: { dayNum: number; dateStr: string; dayLabel: string; doneCount: number; notDoneCount: number; percentage: number }[] = [];

    monthDays.forEach((dayDate) => {
      const dateStr = formatDate(dayDate);
      let dayDone = 0;

      activeHabits.forEach((habit) => {
        totalPossible++;
        const log = logsMap.get(`${habit.id}_${dateStr}`);
        if (log?.completed) {
          totalCompleted++;
          dayDone++;
        }
      });

      const dayTotal = activeHabits.length || 1;
      const percentage = Math.round((dayDone / dayTotal) * 100);

      dailyRates.push({
        dayNum: dayDate.getDate(),
        dateStr,
        dayLabel: getDayAbbrev(dayDate),
        doneCount: dayDone,
        notDoneCount: dayTotal - dayDone,
        percentage,
      });
    });

    const monthCompletionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    return {
      totalHabits: activeHabits.length,
      totalCompleted,
      monthCompletionRate,
      dailyRates,
    };
  }, [monthDays, activeHabits, logsMap]);

  // Navigate months
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const handleCheckboxClick = (habitId: string, dateStr: string, isCurrentlyDone: boolean) => {
    onToggleLog(habitId, dateStr);

    // If marking done, trigger celebratory confetti if daily rate hits 100%
    if (!isCurrentlyDone) {
      const currentDayStats = monthStats.dailyRates.find(d => d.dateStr === dateStr);
      if (currentDayStats && currentDayStats.doneCount + 1 === activeHabits.length) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    }
  };

  // Group days into Week headers (Week 1, Week 2, Week 3, Week 4, Week 5)
  const weeksGrouped = useMemo(() => {
    const weeks: { weekNum: number; days: Date[] }[] = [];
    let currentWeekDays: Date[] = [];
    let currentWeekNum = 1;

    monthDays.forEach((d, idx) => {
      currentWeekDays.push(d);
      // Group by 7 days or month boundary
      if (currentWeekDays.length === 7 || idx === monthDays.length - 1) {
        weeks.push({ weekNum: currentWeekNum, days: [...currentWeekDays] });
        currentWeekNum++;
        currentWeekDays = [];
      }
    });

    return weeks;
  }, [monthDays]);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Month Controller */}
      <div className="bg-white dark:bg-[#23211e] rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800/80 shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Title & Month Selector */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-900/10 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-800/20">
              <CalendarIcon className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </h2>

                <button
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Interactive Spreadsheet Matrix & Daily Check-in Grid
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-stone-100/60 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/60">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Active Habits</span>
              <span className="text-lg font-extrabold text-stone-900 dark:text-stone-100">{monthStats.totalHabits}</span>
            </div>

            <div className="bg-stone-100/60 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/60">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">Completed Check-ins</span>
              <span className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400">{monthStats.totalCompleted}</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-stone-100/60 dark:bg-stone-900/60 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                <span>Month Rate</span>
                <span className="text-emerald-800 dark:text-emerald-400 font-bold">{monthStats.monthCompletionRate}%</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-800 dark:bg-emerald-700 h-full rounded-full transition-all duration-500"
                  style={{ width: `${monthStats.monthCompletionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Add Goal Button */}
          <div>
            <button
              onClick={onOpenAddModal}
              className="w-full lg:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-stone-100 font-semibold text-xs shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Goal / Habit</span>
            </button>
          </div>

        </div>
      </div>

      {/* Spreadsheet Grid Matrix Table Container */}
      <div className="bg-white dark:bg-[#23211e] rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xs overflow-hidden">
        
        {/* Scrollable Matrix Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              {/* Row 1: Week Headers */}
              <tr className="bg-stone-100/90 dark:bg-stone-900/90 text-stone-700 dark:text-stone-300 text-xs font-semibold border-b border-stone-200 dark:border-stone-800">
                <th className="p-3 sticky left-0 z-20 bg-stone-100 dark:bg-stone-900 min-w-[200px] sm:min-w-[240px] border-r border-stone-200 dark:border-stone-800 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span>My Daily Habits</span>
                    <span className="text-[10px] text-stone-500 font-normal">Check off daily</span>
                  </div>
                </th>
                {weeksGrouped.map((week) => (
                  <th
                    key={`week_${week.weekNum}`}
                    colSpan={week.days.length}
                    className="p-1.5 text-center border-r border-stone-200 dark:border-stone-800 bg-stone-200/60 dark:bg-stone-800/80 font-bold text-[11px] text-stone-600 dark:text-stone-300"
                  >
                    Week {week.weekNum}
                  </th>
                ))}
              </tr>

              {/* Row 2: Day Names (Sa, Su, Mo, Tu...) */}
              <tr className="bg-stone-50 dark:bg-stone-900/70 text-stone-600 dark:text-stone-400 text-[11px] font-medium border-b border-stone-200 dark:border-stone-800">
                <th className="p-2 sticky left-0 z-20 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Day of Week</span>
                </th>
                {monthDays.map((d) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={`dayabbrev_${d.toISOString()}`}
                      className={`p-1 text-center min-w-[36px] max-w-[40px] border-r border-stone-200/70 dark:border-stone-800/60 ${
                        isWeekend ? 'bg-amber-500/5 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 font-bold' : ''
                      }`}
                    >
                      {getDayAbbrev(d)}
                    </th>
                  );
                })}
              </tr>

              {/* Row 3: Day Numbers (1, 2, 3...) */}
              <tr className="bg-stone-100/40 dark:bg-stone-900/50 text-stone-800 dark:text-stone-200 text-xs font-bold border-b border-stone-200 dark:border-stone-800">
                <th className="p-2 sticky left-0 z-20 bg-stone-100 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">Date</span>
                </th>
                {monthDays.map((d) => {
                  const isToday = formatDate(d) === formatDate(new Date());
                  return (
                    <th
                      key={`daynum_${d.toISOString()}`}
                      className={`p-1.5 text-center min-w-[36px] border-r border-stone-200/70 dark:border-stone-800/60 ${
                        isToday ? 'bg-emerald-800 text-stone-100 font-extrabold shadow-inner' : ''
                      }`}
                    >
                      {d.getDate()}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200/80 dark:divide-stone-800/80 text-xs">
              {activeHabits.length === 0 ? (
                <tr>
                  <td colSpan={monthDays.length + 1} className="p-8 text-center text-stone-500 dark:text-stone-400">
                    No habits created yet. Click <span className="font-semibold text-emerald-800 dark:text-emerald-400">Add Goal / Habit</span> above to get started!
                  </td>
                </tr>
              ) : (
                activeHabits.map((habit, idx) => (
                  <tr
                    key={habit.id}
                    className={`hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white dark:bg-stone-800/30' : 'bg-stone-50/40 dark:bg-stone-800/60'
                    }`}
                  >
                    {/* Habit Title Column */}
                    <td className="p-2.5 sticky left-0 z-20 bg-inherit border-r border-stone-200 dark:border-stone-800 font-medium text-stone-800 dark:text-stone-200 shadow-xs">
                      <div className="flex items-center space-x-2 truncate pr-2">
                        <span className="text-base flex-shrink-0">{habit.emoji || '🎯'}</span>
                        <span className="truncate text-xs font-semibold">{habit.title}</span>
                      </div>
                    </td>

                    {/* Matrix Day Cells */}
                    {monthDays.map((d) => {
                      const dateStr = formatDate(d);
                      const logKey = `${habit.id}_${dateStr}`;
                      const log = logsMap.get(logKey);
                      const isCompleted = log?.completed || false;
                      const isFuture = d > new Date();

                      return (
                        <td
                          key={logKey}
                          className={`p-1 text-center border-r border-stone-200/60 dark:border-stone-800/60 min-w-[36px] ${
                            isCompleted ? 'bg-emerald-900/10 dark:bg-emerald-950/30' : ''
                          }`}
                        >
                          <button
                            disabled={isFuture}
                            onClick={() => handleCheckboxClick(habit.id, dateStr, isCompleted)}
                            className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all ${
                              isCompleted
                                ? 'bg-emerald-800 text-stone-100 shadow-xs ring-2 ring-emerald-700/30 scale-105'
                                : isFuture
                                ? 'bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 cursor-not-allowed opacity-40'
                                : 'bg-white dark:bg-stone-900 border-2 border-stone-300 dark:border-stone-700 hover:border-emerald-800 hover:bg-emerald-900/10'
                            }`}
                          >
                            {isCompleted && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}

              {/* Matrix Footer Summary Rows */}
              {/* Row 1: Daily Progress % */}
              <tr className="bg-stone-100/90 dark:bg-stone-900 font-bold border-t-2 border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200">
                <td className="p-2.5 sticky left-0 z-20 bg-stone-100 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">Progress %</span>
                </td>
                {monthStats.dailyRates.map((d) => (
                  <td
                    key={`rate_${d.dateStr}`}
                    className={`p-1 text-center border-r border-stone-200/70 dark:border-stone-800/60 text-[10px] ${
                      d.percentage === 100
                        ? 'bg-emerald-800 text-stone-100 font-extrabold'
                        : d.percentage >= 70
                        ? 'bg-emerald-900/20 text-emerald-900 dark:text-emerald-300 font-bold'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {d.percentage}%
                  </td>
                ))}
              </tr>

              {/* Row 2: Done Count */}
              <tr className="bg-stone-50 dark:bg-stone-900/80 font-medium text-stone-700 dark:text-stone-300">
                <td className="p-2 sticky left-0 z-20 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold">Done</span>
                </td>
                {monthStats.dailyRates.map((d) => (
                  <td key={`done_${d.dateStr}`} className="p-1 text-center border-r border-stone-200/60 dark:border-stone-800/60 text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                    {d.doneCount}
                  </td>
                ))}
              </tr>

              {/* Row 3: Not Done Count */}
              <tr className="bg-stone-100/40 dark:bg-stone-900/60 font-medium text-stone-500 dark:text-stone-400">
                <td className="p-2 sticky left-0 z-20 bg-stone-100/80 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800">
                  <span className="text-[11px] text-stone-500 font-medium">Not Done</span>
                </td>
                {monthStats.dailyRates.map((d) => (
                  <td key={`notdone_${d.dateStr}`} className="p-1 text-center border-r border-stone-200/60 dark:border-stone-800/60 text-[11px]">
                    {d.notDoneCount}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Visual Analytics Chart directly below grid matrix */}
        <div className="p-5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Daily Completion Curve</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-900/10 text-emerald-800 dark:text-emerald-300 font-medium">
                  Visual Trend
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Monitors day-by-day progress fluctuation throughout {MONTH_NAMES[selectedMonth]}</p>
            </div>
          </div>

          <div className="h-36 sm:h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthStats.dailyRates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4d7c5f" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4d7c5f" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="dayNum" stroke="#a8a29e" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#a8a29e" fontSize={10} tickFormatter={(val) => `${val}%`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-stone-900 text-stone-100 text-xs p-2.5 rounded-xl shadow-md border border-stone-700">
                          <p className="font-bold">{data.dayLabel}, {MONTH_NAMES[selectedMonth]} {data.dayNum}</p>
                          <p className="text-emerald-400 font-semibold">Progress: {data.percentage}%</p>
                          <p className="text-stone-300">Completed: {data.doneCount} / {activeHabits.length}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke="#4d7c5f"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorProgress)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Month Selector Bottom Tabs */}
        <div className="p-2.5 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-start sm:justify-center overflow-x-auto gap-1 no-scrollbar">
          {MONTH_NAMES.map((name, idx) => (
            <button
              key={name}
              onClick={() => setSelectedMonth(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedMonth === idx
                  ? 'bg-emerald-800 text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              {name.substring(0, 3)}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};
