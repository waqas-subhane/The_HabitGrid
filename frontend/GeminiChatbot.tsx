import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  X, 
  Trash2, 
  Copy, 
  Check, 
  Lightbulb, 
  Maximize2, 
  Minimize2, 
  AlertCircle,
  Wand2,
  HelpCircle,
  Target
} from 'lucide-react';
import { Habit, DailyLog, UserProfile } from './types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface GeminiChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  habits?: Habit[];
  logs?: DailyLog[];
  userProfile?: UserProfile;
}

const SUGGESTED_PROMPTS = [
  { icon: '💡', text: 'Explain the concept of Habit Stacking with an example' },
  { icon: '📊', text: 'How can I stay consistent when my daily streak breaks?' },
  { icon: '🎯', text: 'Suggest 3 high-impact daily micro-habits for focus' },
  { icon: '⚡', text: 'Explain how photosynthesis works in 3 simple bullet points' },
];

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  isOpen,
  onClose,
  habits = [],
  logs = [],
  userProfile
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! 👋 I'm **Gemini AI**, your personal assistant embedded in HabitGrid Pro.

You can ask me **any general question** (e.g. science, technology, coding, general knowledge, creative writing) or ask for **customized habit & goal coaching**! 

How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Prepare context about user's active goals for Gemini if applicable
  const getUserContext = () => {
    if (!habits || habits.length === 0) return null;

    const habitSummary = habits.map(h => ({
      title: h.title,
      category: h.category,
      targetType: h.targetType,
      targetValue: h.targetValue ? `${h.targetValue} ${h.targetUnit || ''}` : undefined
    }));

    return {
      totalGoals: habits.length,
      goals: habitSummary,
      userLevel: userProfile?.level,
      userXp: userProfile?.xp,
      totalCheckins: logs.length
    };
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const historyForApi = messages.slice(1).map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: historyForApi,
          userContext: getUserContext()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'GEMINI_API_KEY_MISSING') {
          throw new Error('Gemini API Key is not configured. Please set GEMINI_API_KEY in the environment settings.');
        }
        throw new Error(data.message || 'Failed to receive a response from Gemini AI.');
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text || 'I could not generate an answer right now.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(err.message || 'Error connecting to Gemini API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Chat history cleared. What else can I help you with?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Simple Markdown formatter function
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-2" />;

          // Headers
          if (line.startsWith('### ')) {
            return <h4 key={idx} className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-2">{line.replace('### ', '')}</h4>;
          }
          if (line.startsWith('## ')) {
            return <h3 key={idx} className="font-bold text-base text-stone-900 dark:text-stone-100 mt-3">{line.replace('## ', '')}</h3>;
          }
          if (line.startsWith('# ')) {
            return <h2 key={idx} className="font-bold text-lg text-stone-900 dark:text-stone-100 mt-3">{line.replace('# ', '')}</h2>;
          }

          // Bullet lists
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const listText = line.trim().replace(/^[-*]\s+/, '');
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-emerald-800 dark:text-emerald-400 font-bold">•</span>
                <span>{parseBold(listText)}</span>
              </div>
            );
          }

          // Numbered lists
          if (/^\d+\.\s+/.test(line.trim())) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-stone-500 font-semibold">{line.match(/^\d+\./)?.[0]}</span>
                <span>{parseBold(line.replace(/^\d+\.\s+/, ''))}</span>
              </div>
            );
          }

          return <p key={idx}>{parseBold(line)}</p>;
        })}
      </div>
    );
  };

  // Helper to parse **bold** text
  const parseBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-stone-900 dark:text-stone-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className={`fixed z-50 transition-all duration-300 flex flex-col ${
      isExpanded 
        ? 'inset-2 sm:inset-6 md:inset-10 rounded-2xl' 
        : 'bottom-4 right-4 left-4 sm:left-auto sm:w-[450px] h-[600px] max-h-[85vh] rounded-2xl'
    } bg-white dark:bg-[#23211e] border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-fade-in`}>
      
      {/* Top Header */}
      <div className="px-5 py-3.5 bg-stone-900 text-stone-100 dark:bg-[#1a1816] flex items-center justify-between border-b border-stone-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-800/80 text-emerald-200 flex items-center justify-center shadow-inner">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-sm text-stone-100">Gemini AI Assistant</h3>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                3.6 Flash
              </span>
            </div>
            <p className="text-[11px] text-stone-400">Ask general questions or habit coaching</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors hidden sm:block"
            title={isExpanded ? "Collapse View" : "Expand View"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Message Banner if missing key or network error */}
      {errorMessage && (
        <div className="bg-amber-900/20 border-b border-amber-800/30 p-3 text-amber-800 dark:text-amber-300 text-xs flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Chat Error</p>
            <p className="text-[11px] opacity-90">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-amber-600 hover:text-amber-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50 dark:bg-[#1a1816]/60">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 ${
              msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                msg.role === 'user'
                  ? 'bg-emerald-800 text-stone-100'
                  : 'bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />}
            </div>

            {/* Message Bubble */}
            <div className={`group relative max-w-[85%] rounded-2xl p-3.5 shadow-xs transition-all ${
              msg.role === 'user'
                ? 'bg-emerald-800 text-stone-100 rounded-tr-xs'
                : 'bg-white dark:bg-[#23211e] text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-800/80 rounded-tl-xs'
            }`}>
              {/* Content */}
              {renderFormattedContent(msg.content)}

              {/* Timestamp & Copy action */}
              <div className={`mt-2 flex items-center justify-between text-[10px] opacity-75 pt-1 border-t ${
                msg.role === 'user' ? 'border-emerald-700/50 text-stone-200' : 'border-stone-100 dark:border-stone-800 text-stone-400'
              }`}>
                <span>{msg.timestamp}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-200 dark:bg-stone-800 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-800 dark:text-emerald-400 animate-pulse" />
            </div>
            <div className="bg-white dark:bg-[#23211e] border border-stone-200 dark:border-stone-800 rounded-2xl rounded-tl-xs p-3.5 shadow-xs flex items-center space-x-2">
              <span className="text-xs text-stone-500 font-medium">Gemini is thinking</span>
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips (when chat has few messages) */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 py-2 bg-stone-100/60 dark:bg-stone-900/60 border-t border-stone-200/60 dark:border-stone-800/60">
          <p className="text-[11px] font-semibold text-stone-500 mb-1.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-600" />
            <span>Suggested Prompts:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt.text)}
                className="text-left text-[11px] px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#23211e] border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-emerald-800/50 hover:bg-emerald-900/5 transition-all flex items-center space-x-1.5"
              >
                <span>{prompt.icon}</span>
                <span className="truncate max-w-[220px]">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white dark:bg-[#23211e] border-t border-stone-200/80 dark:border-stone-800 flex items-center space-x-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini any question (e.g. quantum physics, habits)..."
          disabled={isLoading}
          className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-stone-100 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50 placeholder:text-stone-400 font-medium"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-stone-100 disabled:opacity-40 disabled:hover:bg-emerald-800 transition-all shadow-xs"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
