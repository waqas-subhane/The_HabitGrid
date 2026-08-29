import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './Navbar';
import { SpreadsheetMatrix } from './SpreadsheetMatrix';
import { GoalList } from './GoalList';
import { GoalModal } from './GoalModal';
import { AnalyticsView } from './AnalyticsView';
import { NotificationSettingsView } from './NotificationSettings';
import { ReportsModal } from './ReportsModal';
import { AuthModal } from './AuthModal';
import { GamificationBanner } from './GamificationBanner';
import { GeminiChatbot } from './GeminiChatbot';
import { OnboardingExperience } from './OnboardingExperience';
import { Bot, Sparkles } from 'lucide-react';
import { Habit, DailyLog, ViewTab, UserProfile, NotificationSettings, Achievement } from './types';
import {
  loadCurrentUser,
  saveCurrentUser,
  loadUserHabits,
  saveUserHabits,
  loadUserLogs,
  saveUserLogs,
  loadNotificationSettings,
  saveNotificationSettings,
  loadAchievements,
  saveAchievements,
  formatDate,
  isUserLoggedIn,
  setLoggedInStatus,
} from './storage';
import { playCompletionSound, playFanfareSound } from './notifications';

export default function App() {
  const [viewState, setViewState] = useState<'onboarding' | 'dashboard'>(() => {
    return isUserLoggedIn() ? 'dashboard' : 'onboarding';
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => loadCurrentUser());
  const [habits, setHabits] = useState<Habit[]>(() => loadUserHabits(currentUser.id));
  const [logs, setLogs] = useState<DailyLog[]>(() => loadUserLogs(currentUser.id, habits));
  const [settings, setSettings] = useState<NotificationSettings>(() => loadNotificationSettings(currentUser.id));
  const [achievements, setAchievements] = useState<Achievement[]>(() => loadAchievements(currentUser.id));

  const [currentTab, setCurrentTab] = useState<ViewTab>('matrix');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('habitgrid_dark_mode');
    return saved ? JSON.parse(saved) : true; // Default dark mode as requested for reducing eye strain
  });

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // Check active server session on mount
  useEffect(() => {
    fetch('/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          const verifiedUser: UserProfile = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            avatar: data.user.avatar,
            level: data.user.level || 1,
            xp: data.user.xp || 0,
            streakDays: data.user.streakDays || 0,
            highestStreak: data.user.highestStreak || 0,
            createdAt: data.user.createdAt,
          };
          saveCurrentUser(verifiedUser);
          setLoggedInStatus(true);
          handleUserChanged(verifiedUser);
          setViewState('dashboard');
        }
      })
      .catch((err) => {
        console.warn('Session check failed:', err);
      });
  }, []);

  // Handler for successful authentication from Onboarding
  const handleAuthenticated = (verifiedUser: UserProfile) => {
    saveCurrentUser(verifiedUser);
    setLoggedInStatus(true);
    handleUserChanged(verifiedUser);
    setViewState('dashboard');
  };

  // Handler for user logout
  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout error:', err);
    }
    setLoggedInStatus(false);
    setIsAuthModalOpen(false);
    setViewState('onboarding');
  };

  // Apply dark mode class to root HTML element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('habitgrid_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  // When current user changes, reload user-specific data
  const handleUserChanged = (newUser: UserProfile) => {
    setCurrentUser(newUser);
    const loadedHabits = loadUserHabits(newUser.id);
    const loadedLogs = loadUserLogs(newUser.id, loadedHabits);
    const loadedSettings = loadNotificationSettings(newUser.id);
    const loadedAchieves = loadAchievements(newUser.id);

    setHabits(loadedHabits);
    setLogs(loadedLogs);
    setSettings(loadedSettings);
    setAchievements(loadedAchieves);
  };

  // Toggle log check-in for habit on specific date
  const handleToggleLog = (habitId: string, dateStr: string) => {
    const logKey = `${habitId}_${dateStr}`;
    const existingIndex = logs.findIndex(l => l.habitId === habitId && l.date === dateStr);

    let updatedLogs: DailyLog[];
    let newlyCompleted = false;

    if (existingIndex >= 0) {
      const existing = logs[existingIndex];
      newlyCompleted = !existing.completed;
      updatedLogs = [...logs];
      updatedLogs[existingIndex] = { ...existing, completed: newlyCompleted };
    } else {
      newlyCompleted = true;
      const targetHabit = habits.find(h => h.id === habitId);
      updatedLogs = [
        ...logs,
        {
          id: logKey,
          userId: currentUser.id,
          habitId,
          date: dateStr,
          completed: true,
          value: targetHabit?.targetType === 'numeric' ? targetHabit.targetValue : undefined,
        },
      ];
    }

    setLogs(updatedLogs);
    saveUserLogs(currentUser.id, updatedLogs);

    // Audio chime feedback
    if (newlyCompleted && settings.soundEnabled) {
      playCompletionSound();
    }

    // Award XP & Recalculate Streak
    if (newlyCompleted) {
      let newXp = currentUser.xp + 25;
      let newLevel = Math.floor(newXp / 500) + 1;
      let streak = calculateCurrentStreak(updatedLogs);

      if (newLevel > currentUser.level) {
        playFanfareSound();
      }

      const updatedUser: UserProfile = {
        ...currentUser,
        xp: newXp,
        level: newLevel,
        streakDays: streak,
        highestStreak: Math.max(streak, currentUser.highestStreak),
      };

      setCurrentUser(updatedUser);
      saveCurrentUser(updatedUser);

      // Check achievements
      checkAndUpdateAchievements(updatedUser, habits, updatedLogs);
    }
  };

  // Streak calculation
  const calculateCurrentStreak = (logList: DailyLog[]): number => {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);

      const dayDoneCount = logList.filter(l => l.date === dateStr && l.completed).length;

      if (dayDoneCount > 0) {
        streak++;
      } else if (i === 0) {
        // Today fine if not done yet
        continue;
      } else {
        break;
      }
    }
    return streak;
  };

  // Achievements update logic
  const checkAndUpdateAchievements = (user: UserProfile, habitList: Habit[], logList: DailyLog[]) => {
    const totalCheckins = logList.filter(l => l.completed).length;

    const updated = achievements.map((badge) => {
      let progress = 0;
      if (badge.reqType === 'streak') {
        progress = Math.min(100, Math.round((user.streakDays / badge.reqValue) * 100));
      } else if (badge.reqType === 'habits_count') {
        progress = Math.min(100, Math.round((habitList.length / badge.reqValue) * 100));
      } else if (badge.reqType === 'total_checkins') {
        progress = Math.min(100, Math.round((totalCheckins / badge.reqValue) * 100));
      } else if (badge.reqType === 'completion_rate') {
        progress = 100;
      }

      return {
        ...badge,
        progress,
        unlockedAt: progress >= 100 && !badge.unlockedAt ? new Date().toISOString() : badge.unlockedAt,
      };
    });

    setAchievements(updated);
    saveAchievements(user.id, updated);
  };

  // Add / Save Habit
  const handleSaveHabit = (habitData: Partial<Habit>) => {
    if (editingHabit) {
      const updated = habits.map(h => h.id === editingHabit.id ? { ...h, ...habitData } as Habit : h);
      setHabits(updated);
      saveUserHabits(currentUser.id, updated);
    } else {
      const newHabit: Habit = {
        id: `h_${Date.now()}`,
        userId: currentUser.id,
        title: habitData.title || 'New Goal',
        category: habitData.category || 'health',
        emoji: habitData.emoji || '🎯',
        frequency: habitData.frequency || 'daily',
        targetType: habitData.targetType || 'boolean',
        targetValue: habitData.targetValue,
        targetUnit: habitData.targetUnit,
        reminderTime: habitData.reminderTime,
        createdAt: formatDate(new Date()),
      };
      const updated = [...habits, newHabit];
      setHabits(updated);
      saveUserHabits(currentUser.id, updated);
    }
    setEditingHabit(null);
  };

  // Delete Habit
  const handleDeleteHabit = (habitId: string) => {
    const updated = habits.filter(h => h.id !== habitId);
    setHabits(updated);
    saveUserHabits(currentUser.id, updated);
  };

  // Import Data
  const handleImportData = (imported: { habits: Habit[]; logs: DailyLog[] }) => {
    setHabits(imported.habits);
    setLogs(imported.logs);
    saveUserHabits(currentUser.id, imported.habits);
    saveUserLogs(currentUser.id, imported.logs);
  };

  if (viewState === 'onboarding') {
    return (
      <OnboardingExperience
        onAuthenticated={handleAuthenticated}
        initialStep="intro"
        darkMode={darkMode}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f6] dark:bg-[#1a1816] text-stone-900 dark:text-stone-100 font-sans antialiased transition-colors duration-200 flex flex-col">
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenReports={() => setIsReportsModalOpen(true)}
        onToggleAiChat={() => setIsAiChatOpen(!isAiChatOpen)}
        isAiChatOpen={isAiChatOpen}
        streakDays={currentUser.streakDays}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* View Tab Switch Rendering */}
        {currentTab === 'matrix' && (
          <SpreadsheetMatrix
            habits={habits}
            logs={logs}
            onToggleLog={handleToggleLog}
            onOpenAddModal={() => {
              setEditingHabit(null);
              setIsGoalModalOpen(true);
            }}
          />
        )}

        {currentTab === 'list' && (
          <GoalList
            habits={habits}
            logs={logs}
            onToggleLog={handleToggleLog}
            onOpenAddModal={() => {
              setEditingHabit(null);
              setIsGoalModalOpen(true);
            }}
            onEditHabit={(habit) => {
              setEditingHabit(habit);
              setIsGoalModalOpen(true);
            }}
            onDeleteHabit={handleDeleteHabit}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView habits={habits} logs={logs} />
        )}

        {currentTab === 'achievements' && (
          <GamificationBanner user={currentUser} achievements={achievements} />
        )}

        {currentTab === 'notifications' && (
          <NotificationSettingsView
            settings={settings}
            onUpdateSettings={(newSettings) => {
              setSettings(newSettings);
              saveNotificationSettings(currentUser.id, newSettings);
            }}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 dark:border-stone-800/80 bg-white/60 dark:bg-[#1a1816]/80 py-6 text-center text-xs text-stone-500 dark:text-stone-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} HabitGrid Pro • Gamified Goal Tracking & Spreadsheet Analytics</p>
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsReportsModalOpen(true)} className="hover:underline">Export Data</button>
            <span>•</span>
            <button onClick={() => setCurrentTab('notifications')} className="hover:underline">Reminders</button>
            <span>•</span>
            <button onClick={() => setIsAuthModalOpen(true)} className="hover:underline">User Account</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveHabit}
        editingHabit={editingHabit}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChanged={handleUserChanged}
        onLogout={handleLogout}
      />

      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        habits={habits}
        logs={logs}
        user={currentUser}
        onImportData={handleImportData}
      />

      {/* Floating Gemini AI Chat Button (when closed) */}
      {!isAiChatOpen && (
        <button
          onClick={() => setIsAiChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center space-x-2 px-4 py-3 rounded-full bg-stone-900 dark:bg-[#23211e] text-stone-100 hover:bg-emerald-900 border border-stone-800 shadow-xl transition-all duration-200 hover:scale-105 group"
          title="Ask Gemini AI Chatbot"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center text-stone-100">
            <Bot className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-stone-100">Ask Gemini AI</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Gemini AI Chatbot Drawer/Modal */}
      <GeminiChatbot
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        habits={habits}
        logs={logs}
        userProfile={currentUser}
      />

    </div>
  );
}
