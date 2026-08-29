import React from 'react';
import { LayoutGrid, ListTodo, BarChart3, Bell, Award, Sun, Moon, User, FileSpreadsheet, Bot, Sparkles } from 'lucide-react';
import { UserProfile, ViewTab } from './types';

interface NavbarProps {
  currentTab: ViewTab;
  setCurrentTab: (tab: ViewTab) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  user: UserProfile;
  onOpenAuth: () => void;
  onOpenReports: () => void;
  onToggleAiChat: () => void;
  isAiChatOpen: boolean;
  streakDays: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  darkMode,
  setDarkMode,
  user,
  onOpenAuth,
  onOpenReports,
  onToggleAiChat,
  isAiChatOpen,
  streakDays,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-stone-50/90 dark:bg-[#1a1917]/90 border-b border-stone-200/80 dark:border-stone-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-800 to-teal-700 flex items-center justify-center text-stone-100 shadow-sm font-bold text-lg">
              📊
            </div>
            <div>
              <h1 className="font-bold text-lg sm:text-xl text-stone-900 dark:text-stone-100 leading-tight flex items-center gap-2">
                HabitGrid <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium border border-emerald-800/20 dark:border-emerald-700/30">Cozy Pro</span>
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 hidden sm:block">Gamified Daily Goal & Habit Tracker</p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop & Tablet) */}
          <nav className="hidden md:flex items-center space-x-1 bg-stone-200/60 dark:bg-stone-800/60 p-1 rounded-xl border border-stone-200 dark:border-stone-800">
            <button
              onClick={() => setCurrentTab('matrix')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'matrix'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200/60 dark:border-stone-700/50'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Grid Matrix</span>
            </button>

            <button
              onClick={() => setCurrentTab('list')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'list'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200/60 dark:border-stone-700/50'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <ListTodo className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Daily Goals</span>
            </button>

            <button
              onClick={() => setCurrentTab('analytics')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'analytics'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200/60 dark:border-stone-700/50'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setCurrentTab('achievements')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'achievements'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200/60 dark:border-stone-700/50'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Level & Badges</span>
            </button>

            <button
              onClick={() => setCurrentTab('notifications')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'notifications'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm border border-stone-200/60 dark:border-stone-700/50'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Bell className="w-4 h-4 text-stone-500 dark:text-stone-400" />
              <span>Reminders</span>
            </button>
          </nav>

          {/* Quick Actions & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Gemini AI Chat Trigger */}
            <button
              onClick={onToggleAiChat}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-xs ${
                isAiChatOpen
                  ? 'bg-emerald-800 text-stone-100 border-emerald-700'
                  : 'bg-stone-200/60 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
              title="Open Gemini AI Chatbot"
            >
              <Bot className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
              <span className="hidden sm:inline">Ask AI</span>
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
            </button>

            {/* Streak Counter */}
            <div className="flex items-center space-x-1.5 bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold shadow-xs">
              <span className="text-base">🔥</span>
              <span>{streakDays}d Streak</span>
            </div>

            {/* Export Reports Button */}
            <button
              onClick={onOpenReports}
              title="Export Reports (CSV/JSON/PDF)"
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition-colors border border-stone-200 dark:border-stone-800"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-xl transition-colors border border-stone-200 dark:border-stone-800"
              title={darkMode ? "Switch to Cozy Light Mode" : "Switch to Cozy Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-700" />}
            </button>

            {/* User Auth Profile Button */}
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-2 p-1.5 pl-2.5 rounded-full bg-stone-200/60 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-800 transition-all text-xs font-medium text-stone-800 dark:text-stone-200"
            >
              <span className="hidden sm:inline font-semibold">{user.name.split(' ')[0]}</span>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-emerald-700/50" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-800 text-stone-100 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs Bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-stone-200 dark:border-stone-800 overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setCurrentTab('matrix')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'matrix'
                ? 'bg-emerald-800 text-stone-100 dark:bg-emerald-800/90'
                : 'text-stone-600 dark:text-stone-400 bg-stone-200/60 dark:bg-stone-800'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid Matrix</span>
          </button>

          <button
            onClick={() => setCurrentTab('list')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'list'
                ? 'bg-emerald-800 text-stone-100 dark:bg-emerald-800/90'
                : 'text-stone-600 dark:text-stone-400 bg-stone-200/60 dark:bg-stone-800'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Daily Goals</span>
          </button>

          <button
            onClick={() => setCurrentTab('analytics')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'analytics'
                ? 'bg-emerald-800 text-stone-100 dark:bg-emerald-800/90'
                : 'text-stone-600 dark:text-stone-400 bg-stone-200/60 dark:bg-stone-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setCurrentTab('achievements')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'achievements'
                ? 'bg-emerald-800 text-stone-100 dark:bg-emerald-800/90'
                : 'text-stone-600 dark:text-stone-400 bg-stone-200/60 dark:bg-stone-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Badges</span>
          </button>

          <button
            onClick={() => setCurrentTab('notifications')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              currentTab === 'notifications'
                ? 'bg-emerald-800 text-stone-100 dark:bg-emerald-800/90'
                : 'text-stone-600 dark:text-stone-400 bg-stone-200/60 dark:bg-stone-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Reminders</span>
          </button>
        </div>
      </div>
    </header>
  );
};
