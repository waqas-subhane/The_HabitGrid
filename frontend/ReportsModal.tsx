import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Printer, Upload, CheckCircle2, FileText } from 'lucide-react';
import { Habit, DailyLog, UserProfile } from './types';
import { DEFAULT_CATEGORIES, formatDate } from './storage';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habits: Habit[];
  logs: DailyLog[];
  user: UserProfile;
  onImportData: (imported: { habits: Habit[]; logs: DailyLog[] }) => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  habits,
  logs,
  user,
  onImportData,
}) => {
  const [reportType, setReportType] = useState<'csv' | 'json' | 'printable'>('printable');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate CSV string
  const handleExportCSV = () => {
    const headers = ['Date', 'Habit Title', 'Category', 'Completed', 'Target Value'];
    const rows = logs.map((log) => {
      const habit = habits.find(h => h.id === log.habitId);
      const cat = DEFAULT_CATEGORIES.find(c => c.id === habit?.category)?.name || 'General';
      return [
        log.date,
        `"${habit?.title || 'Unknown'}"`,
        `"${cat}"`,
        log.completed ? 'TRUE' : 'FALSE',
        log.value || '',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HabitGrid_Report_${user.name.replace(/\s+/g, '_')}_${formatDate(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ user, habits, logs }, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `HabitGrid_Backup_${formatDate(new Date())}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.habits && parsed.logs) {
          onImportData({ habits: parsed.habits, logs: parsed.logs });
          setImportStatus('Data backup imported successfully!');
        } else {
          setImportStatus('Invalid JSON backup format.');
        }
      } catch (err) {
        setImportStatus('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate monthly stats for report
  const totalCheckins = logs.filter(l => l.completed).length;
  const completionRate = logs.length > 0 ? Math.round((totalCheckins / logs.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#23211e] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Exportable Reports & Data Backup</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-1">
          <button
            onClick={() => setReportType('printable')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              reportType === 'printable'
                ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Executive Summary Report
          </button>
          <button
            onClick={() => setReportType('csv')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              reportType === 'csv'
                ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            CSV Spreadsheet Export
          </button>
          <button
            onClick={() => setReportType('json')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              reportType === 'json'
                ? 'bg-white dark:bg-stone-800 text-emerald-800 dark:text-emerald-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            JSON Data Backup
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {reportType === 'printable' && (
            <div id="printable-report" className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-6">
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">HabitGrid Executive Progress Report</h1>
                  <p className="text-xs text-slate-500">Member: {user.name} ({user.email})</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Generated Date</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{formatDate(new Date())}</span>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Active Goals</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{habits.length}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Check-ins</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalCheckins}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overall Rate</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{completionRate}%</span>
                </div>
              </div>

              {/* Active Goals Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2">Tracked Goals Overview</h4>
                <div className="space-y-1.5">
                  {habits.map((h) => (
                    <div key={h.id} className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded-lg text-xs border border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{h.emoji} {h.title}</span>
                      <span className="text-slate-500 capitalize">{h.category} • {h.frequency}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report (PDF)</span>
                </button>
              </div>
            </div>
          )}

          {reportType === 'csv' && (
            <div className="text-center space-y-4 py-8">
              <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Export Raw Spreadsheet Data (.CSV)</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Download all logged daily check-in rows in CSV format, ready to open in Microsoft Excel or Google Sheets.
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 mx-auto transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV File</span>
              </button>
            </div>
          )}

          {reportType === 'json' && (
            <div className="space-y-6">
              <div className="text-center space-y-3 p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                <FileText className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Export Complete Data Backup (.JSON)</h3>
                <button
                  onClick={handleExportJSON}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl mx-auto shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Backup File</span>
                </button>
              </div>

              {/* Import JSON */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Restore Data from Backup File</span>
                </h4>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-600 hover:file:bg-emerald-500/20"
                />
                {importStatus && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2">{importStatus}</p>
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
