import React from 'react';
import { Trophy, Flame, Award } from 'lucide-react';
import { UserProfile, Achievement } from './types';

interface GamificationBannerProps {
  user: UserProfile;
  achievements: Achievement[];
}

export const GamificationBanner: React.FC<GamificationBannerProps> = ({ user, achievements }) => {
  const currentLevelXpProgress = user.xp % 500;
  const xpPercentage = Math.min(100, Math.round((currentLevelXpProgress / 500) * 100));

  return (
    <div className="space-y-6">
      
      {/* Top Banner Card - Cozy Muted Warm Theme */}
      <div className="bg-stone-900 dark:bg-[#201e1b] text-stone-100 p-6 sm:p-8 rounded-3xl shadow-sm relative overflow-hidden border border-stone-800">
        
        {/* Background Decorative Accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-800/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-800/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* User Level & Avatar Info */}
          <div className="flex items-center space-x-5 text-center md:text-left">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-700/60 shadow-sm"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-800 text-stone-100 font-bold text-xs px-2 py-0.5 rounded-full border-2 border-stone-900 shadow-xs">
                Lvl {user.level}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center md:justify-start space-x-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{user.name}</h2>
                <span className="text-base">🎮</span>
              </div>
              <p className="text-xs text-stone-400 mt-1">Level {user.level} Goal Master • Turning Life into a Game</p>

              {/* XP Bar */}
              <div className="mt-3 w-48 sm:w-64">
                <div className="flex justify-between items-center text-[10px] font-medium text-stone-400 mb-1">
                  <span>Progress to Lvl {user.level + 1}</span>
                  <span>{currentLevelXpProgress} / 500 XP</span>
                </div>
                <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden border border-stone-700/60">
                  <div
                    className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                    style={{ width: `${xpPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60 text-center">
              <div className="flex items-center justify-center space-x-1 text-amber-400 mb-1">
                <Flame className="w-5 h-5 fill-amber-400" />
                <span className="text-lg font-black">{user.streakDays} Days</span>
              </div>
              <span className="text-[11px] text-stone-400 font-medium block">Current Flame Streak</span>
            </div>

            <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60 text-center">
              <div className="flex items-center justify-center space-x-1 text-emerald-400 mb-1">
                <Trophy className="w-5 h-5" />
                <span className="text-lg font-black">{user.highestStreak} Days</span>
              </div>
              <span className="text-[11px] text-stone-400 font-medium block">All-time Record</span>
            </div>
          </div>

        </div>
      </div>

      {/* Badges & Achievements Grid */}
      <div className="bg-white dark:bg-[#23211e] p-6 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <span>Unlocked Badges & Gamified Milestones</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">Complete daily goals to earn XP and unlock special achievement badges</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((badge) => {
            const isUnlocked = badge.progress >= 100;
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isUnlocked
                    ? 'bg-stone-50 dark:bg-stone-800/60 border-emerald-800/30 dark:border-emerald-700/30'
                    : 'bg-stone-100/50 dark:bg-stone-900/30 border-stone-200 dark:border-stone-800 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                    isUnlocked ? 'bg-emerald-900/10 dark:bg-emerald-950/50 border border-emerald-800/20' : 'bg-stone-200 dark:bg-stone-800'
                  }`}>
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">{badge.title}</h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5">{badge.description}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                    <span>{isUnlocked ? 'Unlocked' : 'In Progress'}</span>
                    <span>{badge.progress}%</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isUnlocked ? 'bg-emerald-800 dark:bg-emerald-700' : 'bg-stone-400'}`}
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
