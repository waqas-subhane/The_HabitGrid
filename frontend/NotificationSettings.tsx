import React, { useState } from 'react';
import { Bell, Clock, Volume2, ShieldCheck, Send, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { NotificationSettings as NotifType } from './types';
import { requestNotificationPermission, sendPushNotification, playCompletionSound } from './notifications';

interface NotificationSettingsProps {
  settings: NotifType;
  onUpdateSettings: (newSettings: NotifType) => void;
}

export const NotificationSettingsView: React.FC<NotificationSettingsProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [testSent, setTestSent] = useState(false);

  const handleEnablePush = async () => {
    const granted = await requestNotificationPermission();
    onUpdateSettings({
      ...settings,
      enabled: granted,
      permissionGranted: granted,
    });
  };

  const handleTestNotification = () => {
    if (settings.permissionGranted) {
      sendPushNotification('⏰ HabitGrid Daily Reminder!', {
        body: 'It is time to check off your daily goals and keep your flame streak alive!',
      });
    }
    if (settings.soundEnabled) {
      playCompletionSound();
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800/90 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Push Notification System</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure automated daily reminders and habit alarms</p>
          </div>
        </div>

        {/* Permission Status Pill */}
        <div>
          {settings.permissionGranted ? (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Push Active</span>
            </span>
          ) : (
            <button
              onClick={handleEnablePush}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Enable Browser Push</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Settings Panel */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60">
        
        {/* Toggle Push Notifications */}
        <div className="p-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Daily Check-in Reminder</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Receive a gentle daily notification to reflect and check off goals</p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => onUpdateSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-stone-600 peer-checked:bg-emerald-800"></div>
          </label>
        </div>

        {/* Reminder Time Picker */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-stone-400" />
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Default Check-in Alarm Time</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Set your preferred time for evening habit review</p>
            </div>
          </div>

          <input
            type="time"
            value={settings.dailyCheckinTime}
            onChange={(e) => onUpdateSettings({ ...settings, dailyCheckinTime: e.target.value })}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50"
          />
        </div>

        {/* In-app Audio Chimes */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-5 h-5 text-stone-400" />
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Completion Audio Chimes</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Play pleasant synthesized harmonic sound when goals are checked</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => onUpdateSettings({ ...settings, soundEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-stone-600 peer-checked:bg-emerald-800"></div>
          </label>
        </div>

        {/* Test Trigger Button */}
        <div className="p-5 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Click to test instant push alert and audio synthesis
          </div>

          <button
            onClick={handleTestNotification}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Send Test Notification</span>
          </button>
        </div>

      </div>

      {/* Test Success Alert */}
      {testSent && (
        <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>Test Notification sent successfully! Audio chime triggered.</span>
        </div>
      )}

    </div>
  );
};
