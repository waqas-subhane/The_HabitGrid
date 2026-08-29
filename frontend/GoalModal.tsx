import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles } from 'lucide-react';
import { Habit, CategoryType } from './types';
import { DEFAULT_CATEGORIES } from './storage';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
  editingHabit?: Habit | null;
}

const EMOJI_PRESETS = ['⏰', '🏋️', '🚫', '📚', '💰', '💻', '🌿', '📱', '📓', '🚿', '🧘', '💧', '🥗', '🎯', '🏃', '🎨', '🧠', '⚡'];

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingHabit,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryType>('health');
  const [emoji, setEmoji] = useState('🎯');
  const [targetType, setTargetType] = useState<'boolean' | 'numeric'>('boolean');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [targetUnit, setTargetUnit] = useState('mins');
  const [reminderTime, setReminderTime] = useState('20:00');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'weekends'>('daily');

  useEffect(() => {
    if (editingHabit) {
      setTitle(editingHabit.title);
      setCategory(editingHabit.category);
      setEmoji(editingHabit.emoji || '🎯');
      setTargetType(editingHabit.targetType || 'boolean');
      setTargetValue(editingHabit.targetValue || 1);
      setTargetUnit(editingHabit.targetUnit || 'mins');
      setReminderTime(editingHabit.reminderTime || '20:00');
      setFrequency(editingHabit.frequency || 'daily');
    } else {
      setTitle('');
      setCategory('health');
      setEmoji('🎯');
      setTargetType('boolean');
      setTargetValue(1);
      setTargetUnit('mins');
      setReminderTime('20:00');
      setFrequency('daily');
    }
  }, [editingHabit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      category,
      emoji,
      targetType,
      targetValue: targetType === 'numeric' ? Number(targetValue) : undefined,
      targetUnit: targetType === 'numeric' ? targetUnit : undefined,
      reminderTime,
      frequency,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#23211e] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl max-w-lg w-full overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>{editingHabit ? 'Edit Daily Goal' : 'Create New Goal / Habit'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Goal Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Goal / Habit Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wake up at 05:00, 30m Reading..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50 font-semibold"
            />
          </div>

          {/* Emoji Preset Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Choose Icon / Emoji
            </label>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
              {EMOJI_PRESETS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setEmoji(item)}
                  className={`p-2 text-base rounded-xl transition-all ${
                    emoji === item
                      ? 'bg-emerald-900/20 border-2 border-emerald-800 scale-105'
                      : 'bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-200 dark:hover:bg-stone-800'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Life Domain / Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryType)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50 font-medium"
            >
              {DEFAULT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Target Type
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as 'boolean' | 'numeric')}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50 font-medium"
              >
                <option value="boolean">Yes/No Checkbox</option>
                <option value="numeric">Numeric Goal (e.g. 30 mins)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Daily Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50 font-medium"
              />
            </div>
          </div>

          {/* Target Value if numeric */}
          {targetType === 'numeric' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Target Value
                </label>
                <input
                  type="number"
                  min={1}
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Unit (e.g. mins, steps)
                </label>
                <input
                  type="text"
                  placeholder="mins, glasses, pages..."
                  value={targetUnit}
                  onChange={(e) => setTargetUnit(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 text-xs font-semibold text-stone-100 bg-emerald-800 hover:bg-emerald-700 rounded-xl shadow-xs transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{editingHabit ? 'Update Goal' : 'Save Goal'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
