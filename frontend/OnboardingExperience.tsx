import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sprout,
  Target,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Flame,
  Coffee,
  Check,
  AlertCircle,
  Clock,
  Compass,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from './types';

interface OnboardingExperienceProps {
  onAuthenticated: (user: UserProfile) => void;
  initialStep?: 'intro' | 'auth';
  darkMode?: boolean;
}

export const OnboardingExperience: React.FC<OnboardingExperienceProps> = ({
  onAuthenticated,
  initialStep = 'intro',
  darkMode = true,
}) => {
  // Phase of the onboarding: 'intro_phase1' -> 'intro_phase2' -> 'register' -> 'otp_verify'
  const [phase, setPhase] = useState<'intro_phase1' | 'intro_phase2' | 'register' | 'otp_verify'>(
    initialStep === 'auth' ? 'register' : 'intro_phase1'
  );

  // Form states
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatic progression for the intro sequence (3-4.5 seconds total)
  useEffect(() => {
    if (initialStep === 'auth') return;

    // Phase 1 -> Phase 2 after 2.2 seconds
    const timer1 = setTimeout(() => {
      setPhase((curr) => (curr === 'intro_phase1' ? 'intro_phase2' : curr));
    }, 2200);

    // Phase 2 -> Register after another 2.3 seconds (total 4.5s)
    const timer2 = setTimeout(() => {
      setPhase((curr) => (curr === 'intro_phase2' ? 'register' : curr));
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [initialStep]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Client-side quick syntax validation
  const validateEmailFormatClient = (val: string): { valid: boolean; reason?: string } => {
    const norm = val.trim().toLowerCase();
    if (!norm) return { valid: false, reason: 'Email address is required.' };
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(norm)) {
      return { valid: false, reason: 'Please enter a valid email format (e.g. name@domain.com).' };
    }

    const [localPart, domain] = norm.split('@');
    if (localPart.length < 3) {
      return { valid: false, reason: 'Email username must be at least 3 characters.' };
    }

    const blocked = ['wtf.com', 'tempmail.com', 'mailinator.com', '10minutemail.com', 'fake.com', 'test.com'];
    if (blocked.includes(domain)) {
      return { valid: false, reason: `The domain "@${domain}" is not permitted. Please use a recognized email provider.` };
    }

    return { valid: true };
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const clientCheck = validateEmailFormatClient(email);
    if (!clientCheck.valid) {
      setErrorMessage(clientCheck.reason || 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Failed to send verification code. Please check your email.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage('A 6-digit verification code has been generated and sent to your email from waqassubhane99@gmail.com.');
      setCooldown(data.resendCooldownSeconds || 60);
      setRemainingAttempts(5);

      setPhase('otp_verify');
      setIsLoading(false);

      // Focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('Request OTP network error:', err);
      setErrorMessage('Network connection error. Please try again.');
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const sanitized = val.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (sanitized.length > 1) {
      // Paste handling
      const pasted = sanitized.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = sanitized;
    setOtpDigits(newDigits);

    if (sanitized && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: fullOtp,
          name: name.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || 'Incorrect verification code.');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Welcome! Authentication verified successfully.');

      // Celebrate with subtle confetti
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#f59e0b', '#3b82f6'],
        });
      } catch {}

      // Transition to main dashboard
      setTimeout(() => {
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
        onAuthenticated(verifiedUser);
      }, 600);
    } catch (err: any) {
      console.error('Verify OTP network error:', err);
      setErrorMessage('Network connection error during verification.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#faf7f2] dark:bg-[#151413] text-stone-900 dark:text-stone-100 transition-colors duration-500">
      
      {/* Cozy ambient warm backgrounds & gentle floating elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft radial glow gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-700/10 dark:bg-emerald-600/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-600/10 dark:bg-amber-600/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-stone-400/5 dark:bg-stone-700/10 blur-3xl" />

        {/* Floating growth & habit thematic badges */}
        <motion.div
          animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          className="absolute top-16 left-12 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#1e1c1a]/70 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/60 shadow-sm text-xs text-stone-600 dark:text-stone-300"
        >
          <Sprout className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Daily Habit Growth</span>
        </motion.div>

        <motion.div
          animate={{ y: [10, -10, 10], rotate: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-20 left-16 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#1e1c1a]/70 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/60 shadow-sm text-xs text-stone-600 dark:text-stone-300"
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Continuous Streaks</span>
        </motion.div>

        <motion.div
          animate={{ y: [-8, 8, -8], rotate: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 6.5, ease: 'easeInOut', delay: 0.5 }}
          className="absolute top-20 right-16 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#1e1c1a]/70 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/60 shadow-sm text-xs text-stone-600 dark:text-stone-300"
        >
          <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Matrix Analytics</span>
        </motion.div>

        <motion.div
          animate={{ y: [8, -8, 8], rotate: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 7.5, ease: 'easeInOut', delay: 1.5 }}
          className="absolute bottom-24 right-14 hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-[#1e1c1a]/70 backdrop-blur-md border border-stone-200/60 dark:border-stone-800/60 shadow-sm text-xs text-stone-600 dark:text-stone-300"
        >
          <Coffee className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
          <span>Cozy & Calming</span>
        </motion.div>
      </div>

      {/* Main Content Area with AnimatePresence */}
      <div className="relative z-10 w-full max-w-lg mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          
          {/* ========================================================================= */}
          {/* OPENING SCENE: PHASE 1 ("Small steps. Every day. A better you.") */}
          {/* ========================================================================= */}
          {phase === 'intro_phase1' && (
            <motion.div
              key="intro_phase1"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-6 flex flex-col items-center"
            >
              {/* Cozy Growth Illustration Icon */}
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-800 to-teal-700 text-stone-100 flex items-center justify-center shadow-lg shadow-emerald-900/10 dark:shadow-emerald-950/30 border border-emerald-700/30"
              >
                <Sprout className="w-10 h-10 animate-pulse text-emerald-200" />
              </motion.div>

              {/* Motivational Tagline 1 */}
              <div className="space-y-3">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-900/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-800/20"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  HabitGrid Journey
                </motion.span>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-serif"
                >
                  Small steps. Every day.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-stone-600 dark:text-stone-400 font-light italic"
                >
                  A better you, one daily check-in at a time.
                </motion.p>
              </div>

              {/* Fast Skip / Continue Link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={() => setPhase('register')}
                className="text-xs text-stone-500 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors pt-2"
              >
                <span>Skip to login</span>
                <ArrowRight className="w-3 h-3" />
              </motion.button>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* OPENING SCENE: PHASE 2 ("Build habits. Track progress. Achieve goals.") */}
          {/* ========================================================================= */}
          {phase === 'intro_phase2' && (
            <motion.div
              key="intro_phase2"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-6 flex flex-col items-center"
            >
              {/* Target & Sparkles Illustration Icon */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-600 to-emerald-800 text-stone-100 flex items-center justify-center shadow-lg shadow-amber-900/10 border border-amber-600/30"
              >
                <Target className="w-10 h-10 text-amber-200" />
              </motion.div>

              {/* Motivational Tagline 2 */}
              <div className="space-y-3">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-900/10 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-800/20"
                >
                  <Compass className="w-3 h-3 text-emerald-500" />
                  Your Personal Matrix
                </motion.span>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100 font-serif leading-tight"
                >
                  Build habits. Track progress.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-stone-600 dark:text-stone-400 font-light"
                >
                  Achieve your goals with clarity and confidence.
                </motion.p>
              </div>

              {/* Fast Skip / Continue Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => setPhase('register')}
                className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-stone-100 font-semibold text-xs flex items-center gap-2 shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.02]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* REGISTRATION / LOGIN CARD: EMAIL INPUT STEP */}
          {/* ========================================================================= */}
          {phase === 'register' && (
            <motion.div
              key="register_card"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-[#1d1b19] rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 dark:border-stone-800/80 space-y-6"
            >
              {/* Cozy Header */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-teal-700 mx-auto flex items-center justify-center text-stone-100 shadow-md font-bold text-xl mb-3">
                  📊
                </div>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-serif">
                  Welcome to HabitGrid
                </h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 italic">
                  "Your progress starts with one small step."
                </p>
              </div>

              {/* Error / Alert */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {/* Email Form */}
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-50 dark:bg-[#252220] border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Please use a recognized email provider (e.g. Gmail, Yahoo, Outlook, iCloud, Proton).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center justify-between">
                    <span>Display Name</span>
                    <span className="text-[10px] text-stone-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-50 dark:bg-[#252220] border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-stone-100 font-semibold text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying domain & sending code...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Cozy Security & Privacy Highlights */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Passwordless OTP • Strict DNS Verification • Private Data</span>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* REGISTRATION / LOGIN CARD: 6-DIGIT OTP VERIFICATION STEP */}
          {/* ========================================================================= */}
          {phase === 'otp_verify' && (
            <motion.div
              key="otp_card"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 0.97 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white dark:bg-[#1d1b19] rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 dark:border-stone-800/80 space-y-6"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-900/10 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-800/20 mx-auto flex items-center justify-center text-xl mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 font-serif">
                  Check Your Email
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  We sent a 6-digit verification code to <span className="font-semibold text-stone-800 dark:text-stone-200">{email}</span> from <span className="font-semibold text-stone-800 dark:text-stone-200">waqassubhane99@gmail.com</span>
                </p>
              </div>

              {/* Success / Error Alerts */}
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </motion.div>
              )}

              {/* 6 Digit Input Matrix */}
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-12 h-14 sm:w-13 sm:h-14 text-center text-xl font-bold font-mono rounded-xl bg-stone-50 dark:bg-[#252220] border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 dark:focus:ring-emerald-500 transition-all shadow-sm"
                      />
                    ))}
                  </div>

                  {remainingAttempts !== null && remainingAttempts < 5 && (
                    <p className="text-[11px] text-center text-amber-600 dark:text-amber-400">
                      {remainingAttempts} verification attempt{remainingAttempts === 1 ? '' : 's'} remaining.
                    </p>
                  )}
                </div>

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={isLoading || otpDigits.some((d) => !d)}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-stone-100 font-semibold text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-950/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying security token...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Verify & Enter HabitGrid</span>
                    </>
                  )}
                </button>
              </form>

              {/* Resend Code & Back Controls */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-100 dark:border-stone-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setPhase('register');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                >
                  ← Change Email
                </button>

                <button
                  type="button"
                  disabled={cooldown > 0 || isLoading}
                  onClick={() => handleRequestOtp()}
                  className="text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline font-medium flex items-center gap-1"
                >
                  {cooldown > 0 ? (
                    <>
                      <Clock className="w-3 h-3" />
                      <span>Resend in {cooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      <span>Resend Code</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
};
