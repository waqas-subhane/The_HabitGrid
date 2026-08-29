export type CategoryType = 'health' | 'productivity' | 'mindset' | 'finance' | 'learning' | 'personal';

export interface Category {
  id: CategoryType;
  name: string;
  color: string; // Tailwind color class or hex
  icon: string; // Emoji or Lucide icon name
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  category: CategoryType;
  emoji: string;
  frequency: 'daily' | 'weekdays' | 'weekends';
  targetType: 'boolean' | 'numeric';
  targetValue?: number; // e.g., 5000 steps, 8 glasses
  targetUnit?: string;  // e.g., 'steps', 'glasses', 'mins'
  reminderTime?: string; // HH:MM
  createdAt: string;
  archived?: boolean;
}

export interface DailyLog {
  id: string; // habitId_YYYY-MM-DD
  userId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number; // for numeric targets
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  level: number;
  xp: number;
  streakDays: number;
  highestStreak: number;
  pinLock?: string;
  createdAt: string;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyCheckinTime: string; // HH:MM
  soundEnabled: boolean;
  habitReminders: boolean;
  permissionGranted: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  progress: number; // 0 to 100
  reqType: 'streak' | 'habits_count' | 'completion_rate' | 'total_checkins';
  reqValue: number;
}

export type ViewTab = 'matrix' | 'list' | 'analytics' | 'notifications' | 'achievements';
