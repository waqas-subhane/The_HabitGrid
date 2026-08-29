import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle2, Circle, Clock, Flame, Edit2, Trash2, Archive, Check } from 'lucide-react';
import { Habit, DailyLog, CategoryType } from './types';
import { DEFAULT_CATEGORIES, formatDate } from './storage';

interface GoalListProps {
  habits: Habit[];
  logs: DailyLog[];
  onToggleLog: (habitId: string, dateStr: string) => void;
  onOpenAddModal: () => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
}

export const GoalList: React.FC<GoalListProps> = ({
  habits,
  logs,
  onToggleLog,
  onOpenAddModal,
  onEditHabit,
  onDeleteHabit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');

  const todayStr = formatDate(new Date());

  // Filter habits
  const filteredHabits = habits.filter(h => {
    if (h.archived) return false;
    const matchesSearch = h.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || h.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Calculate habit specific streak
  const getHabitStreak = (habitId: string): number => {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const log = logs.find(l => l.habitId === habitId && l.date === dateStr);

      if (log?.completed) {
        streak++;
      } else if (i === 0) {
        // Today not done yet is fine, check yesterday
        continue;
      } else {
        break;
      }
    }
    return streak;
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#23211e] p-5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Daily Goals & Habits</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Manage and check off your personal goals for today</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50"
            />
          </div>

          {/* Add Goal Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-stone-100 font-semibold text-xs shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Goal</span>
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            selectedCategory === 'all'
              ? 'bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 border-transparent shadow-xs'
              : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700'
          }`}
        >
          All Goals
        </button>

        {DEFAULT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory === cat.id
                ? 'bg-emerald-800 text-stone-100 border-transparent shadow-xs'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200/80 dark:border-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Habits Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredHabits.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-[#23211e] rounded-2xl border border-stone-200/80 dark:border-stone-800/80">
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">No goals found matching criteria.</p>
            <p className="text-xs text-stone-400 mt-1">Try resetting filters or create a new custom daily goal.</p>
          </div>
        ) : (
          filteredHabits.map((habit) => {
            const todayLog = logs.find(l => l.habitId === habit.id && l.date === todayStr);
            const isCompleted = todayLog?.completed || false;
            const habitStreak = getHabitStreak(habit.id);
            const categoryObj = DEFAULT_CATEGORIES.find(c => c.id === habit.category) || DEFAULT_CATEGORIES[0];

            return (
              <div
                key={habit.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isCompleted
                    ? 'bg-emerald-900/10 dark:bg-emerald-950/20 border-emerald-800/30 shadow-xs'
                    : 'bg-white dark:bg-[#23211e] border-stone-200/80 dark:border-stone-800/80 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                {/* Header Row */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xl shadow-inner">
                        {habit.emoji || '🎯'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-snug">
                          {habit.title}
                        </h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${categoryObj.color}`}>
                          {categoryObj.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onEditHabit(habit)}
                        className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteHabit(habit.id)}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Details / Reminder */}
                  <div className="mt-3 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{habit.reminderTime ? `Reminder: ${habit.reminderTime}` : 'Daily Check-in'}</span>
                    </div>

                    <div className="flex items-center space-x-1 font-bold text-amber-700 dark:text-amber-400">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{habitStreak}d Streak</span>
                    </div>
                  </div>
                </div>

                {/* Check-in Action Button */}
                <button
                  onClick={() => onToggleLog(habit.id, todayStr)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                    isCompleted
                      ? 'bg-emerald-800 text-stone-100 shadow-xs ring-2 ring-emerald-700/30'
                      : 'bg-stone-100 hover:bg-emerald-800 dark:bg-stone-800 hover:text-stone-100 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isCompleted ? 'border-stone-100 bg-stone-100 text-emerald-800' : 'border-current'}`}>
                    {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span>{isCompleted ? 'Completed Today!' : 'Mark as Done Today'}</span>
                </button>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
