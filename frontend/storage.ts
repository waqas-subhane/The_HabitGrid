import { Category, DailyLog, Habit, NotificationSettings, UserProfile, Achievement } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'health', name: 'Health & Fitness', color: 'bg-emerald-900/10 text-emerald-800 dark:text-emerald-300 border-emerald-800/20', icon: '🏋️' },
  { id: 'productivity', name: 'Productivity', color: 'bg-stone-200/60 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-300/40', icon: '💻' },
  { id: 'mindset', name: 'Mindset & Habits', color: 'bg-purple-900/10 text-purple-800 dark:text-purple-300 border-purple-800/20', icon: '📓' },
  { id: 'finance', name: 'Finance', color: 'bg-amber-900/10 text-amber-800 dark:text-amber-300 border-amber-800/20', icon: '💰' },
  { id: 'learning', name: 'Learning', color: 'bg-indigo-900/10 text-indigo-800 dark:text-indigo-300 border-indigo-800/20', icon: '📚' },
  { id: 'personal', name: 'Personal Care', color: 'bg-teal-900/10 text-teal-800 dark:text-teal-300 border-teal-800/20', icon: '🚿' },
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_step', title: 'First Step', description: 'Complete your first daily goal', icon: '🌱', progress: 0, reqType: 'total_checkins', reqValue: 1 },
  { id: 'streak_3', title: 'Momentum Builder', description: 'Reach a 3-day active streak', icon: '🔥', progress: 0, reqType: 'streak', reqValue: 3 },
  { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day habit streak', icon: '⚡', progress: 0, reqType: 'streak', reqValue: 7 },
  { id: 'streak_30', title: 'Unstoppable Mindset', description: 'Reach a 30-day streak of daily progress', icon: '🏆', progress: 0, reqType: 'streak', reqValue: 30 },
  { id: 'habits_10', title: 'Goal Architect', description: 'Create and track at least 8 habits', icon: '🎯', progress: 0, reqType: 'habits_count', reqValue: 8 },
  { id: 'flawless_day', title: 'Game Champion', description: 'Achieve a 100% completed day with all habits done', icon: '⭐', progress: 0, reqType: 'completion_rate', reqValue: 100 },
];

// Demo user profile
export const DEFAULT_USER: UserProfile = {
  id: 'user_demo',
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  level: 5,
  xp: 1450,
  streakDays: 12,
  highestStreak: 18,
  createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
};

// Initial habit list matching user reference screenshot
export const INITIAL_HABITS: Habit[] = [
  { id: 'h1', userId: 'user_demo', title: 'Wake up at 05:00', category: 'health', emoji: '⏰', frequency: 'daily', targetType: 'boolean', reminderTime: '05:00', createdAt: '2026-01-01' },
  { id: 'h2', userId: 'user_demo', title: 'Gym Workout', category: 'health', emoji: '🏋️', frequency: 'daily', targetType: 'boolean', reminderTime: '06:30', createdAt: '2026-01-01' },
  { id: 'h3', userId: 'user_demo', title: 'Stop Watching Porn', category: 'mindset', emoji: '🚫', frequency: 'daily', targetType: 'boolean', createdAt: '2026-01-01' },
  { id: 'h4', userId: 'user_demo', title: 'Reading / Learning (30m)', category: 'learning', emoji: '📚', frequency: 'daily', targetType: 'numeric', targetValue: 30, targetUnit: 'mins', reminderTime: '20:00', createdAt: '2026-01-01' },
  { id: 'h5', userId: 'user_demo', title: 'Budget & Expense Tracking', category: 'finance', emoji: '💰', frequency: 'daily', targetType: 'boolean', reminderTime: '21:00', createdAt: '2026-01-01' },
  { id: 'h6', userId: 'user_demo', title: 'Project Work & Coding', category: 'productivity', emoji: '💻', frequency: 'daily', targetType: 'numeric', targetValue: 2, targetUnit: 'hrs', createdAt: '2026-01-01' },
  { id: 'h7', userId: 'user_demo', title: 'No Alcohol', category: 'mindset', emoji: '🌿', frequency: 'daily', targetType: 'boolean', createdAt: '2026-01-01' },
  { id: 'h8', userId: 'user_demo', title: 'Social Media Detox', category: 'mindset', emoji: '📱', frequency: 'daily', targetType: 'boolean', createdAt: '2026-01-01' },
  { id: 'h9', userId: 'user_demo', title: 'Goal Journaling & Reflection', category: 'mindset', emoji: '📓', frequency: 'daily', targetType: 'boolean', reminderTime: '21:30', createdAt: '2026-01-01' },
  { id: 'h10', userId: 'user_demo', title: 'Cold Shower', category: 'personal', emoji: '🚿', frequency: 'daily', targetType: 'boolean', createdAt: '2026-01-01' },
];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyCheckinTime: '20:00',
  soundEnabled: true,
  habitReminders: true,
  permissionGranted: false,
};

// Generate realistic historic logs for demo user
export function generateSampleLogs(userId: string, habits: Habit[]): DailyLog[] {
  const logs: DailyLog[] = [];
  const today = new Date();
  
  // Generate logs for the past 60 days
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    habits.forEach((habit) => {
      // Deterministic pseudo-random generation based on habit ID and date offset
      const hash = (habit.id.charCodeAt(1) || 1) * (i + 1) * 17;
      const passRate = i < 14 ? 0.85 : 0.72; // higher completion rate recently
      const completed = (hash % 100) < (passRate * 100);

      logs.push({
        id: `${habit.id}_${dateStr}`,
        userId,
        habitId: habit.id,
        date: dateStr,
        completed,
        value: habit.targetType === 'numeric' && completed ? habit.targetValue : undefined,
      });
    });
  }

  return logs;
}

// Storage Keys
const KEY_CURRENT_USER = 'habitgrid_current_user_v1';
const KEY_USERS_LIST = 'habitgrid_users_list_v1';
const KEY_HABITS_PREFIX = 'habitgrid_habits_';
const KEY_LOGS_PREFIX = 'habitgrid_logs_';
const KEY_NOTIFS_PREFIX = 'habitgrid_notifs_';
const KEY_ACHIEVES_PREFIX = 'habitgrid_achieve_';
const KEY_AUTH_TOKEN = 'habitgrid_auth_verified_session';

export function isUserLoggedIn(): boolean {
  return localStorage.getItem(KEY_AUTH_TOKEN) === 'true';
}

export function setLoggedInStatus(loggedIn: boolean) {
  if (loggedIn) {
    localStorage.setItem(KEY_AUTH_TOKEN, 'true');
  } else {
    localStorage.removeItem(KEY_AUTH_TOKEN);
  }
}

export function loadCurrentUser(): UserProfile {
  const saved = localStorage.getItem(KEY_CURRENT_USER);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(DEFAULT_USER));
  return DEFAULT_USER;
}

export function saveCurrentUser(user: UserProfile) {
  localStorage.setItem(KEY_CURRENT_USER, JSON.stringify(user));
  const allUsers = loadAllUsers();
  const idx = allUsers.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    allUsers[idx] = user;
  } else {
    allUsers.push(user);
  }
  localStorage.setItem(KEY_USERS_LIST, JSON.stringify(allUsers));
}

export function loadAllUsers(): UserProfile[] {
  const saved = localStorage.getItem(KEY_USERS_LIST);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return [DEFAULT_USER];
}

export function loadUserHabits(userId: string): Habit[] {
  const saved = localStorage.getItem(`${KEY_HABITS_PREFIX}${userId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  const habits = userId === DEFAULT_USER.id ? INITIAL_HABITS : INITIAL_HABITS.map(h => ({ ...h, userId }));
  localStorage.setItem(`${KEY_HABITS_PREFIX}${userId}`, JSON.stringify(habits));
  return habits;
}

export function saveUserHabits(userId: string, habits: Habit[]) {
  localStorage.setItem(`${KEY_HABITS_PREFIX}${userId}`, JSON.stringify(habits));
}

export function loadUserLogs(userId: string, habits: Habit[]): DailyLog[] {
  const saved = localStorage.getItem(`${KEY_LOGS_PREFIX}${userId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  const logs = generateSampleLogs(userId, habits);
  localStorage.setItem(`${KEY_LOGS_PREFIX}${userId}`, JSON.stringify(logs));
  return logs;
}

export function saveUserLogs(userId: string, logs: DailyLog[]) {
  localStorage.setItem(`${KEY_LOGS_PREFIX}${userId}`, JSON.stringify(logs));
}

export function loadNotificationSettings(userId: string): NotificationSettings {
  const saved = localStorage.getItem(`${KEY_NOTIFS_PREFIX}${userId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(userId: string, settings: NotificationSettings) {
  localStorage.setItem(`${KEY_NOTIFS_PREFIX}${userId}`, JSON.stringify(settings));
}

export function loadAchievements(userId: string): Achievement[] {
  const saved = localStorage.getItem(`${KEY_ACHIEVES_PREFIX}${userId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return INITIAL_ACHIEVEMENTS;
}

export function saveAchievements(userId: string, achievements: Achievement[]) {
  localStorage.setItem(`${KEY_ACHIEVES_PREFIX}${userId}`, JSON.stringify(achievements));
}

// Format date to YYYY-MM-DD local format
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get day abbreviation (Sa, Su, Mo, Tu, We, Th, Fr)
export function getDayAbbrev(date: Date): string {
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  return days[date.getDay()];
}

// Get days in a month
export function getDaysInMonth(year: number, monthZeroIndexed: number): Date[] {
  const date = new Date(year, monthZeroIndexed, 1);
  const days: Date[] = [];
  while (date.getMonth() === monthZeroIndexed) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}
