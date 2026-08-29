import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  RotateCcw, 
  KeyRound, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  Shield, 
  Sparkles,
  Lock
} from 'lucide-react';
import { UserProfile } from './types';
import { saveCurrentUser } from './storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserChanged: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onLogout,
}) => {
  const [step, setStep] = useState<'profile' | 'email_input' | 'otp_verify'>('profile');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Timers
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [expiresSeconds, setExpiresSeconds] = useState(300); // 5 minutes

  // Focus ref for OTP input
  const otpInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldownSeconds > 0) {
      timer = setInterval(() => {
        setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Expiration countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp_verify' && expiresSeconds > 0) {
      timer = setInterval(() => {
        setExpiresSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, expiresSeconds]);

  if (!isOpen) return null;

  // Validate Email syntax and recognized providers client-side
  const validateEmailFormat = (val: string): { valid: boolean; reason?: string } => {
    const trimmed = val.trim();
    if (!trimmed) {
      return { valid: false, reason: 'Email address is required.' };
    }
    if (trimmed.length < 6 || trimmed.length > 254) {
      return { valid: false, reason: 'Email address length must be between 6 and 254 characters.' };
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, reason: 'Please enter a valid email address (e.g. name@domain.com).' };
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2) {
      return { valid: false, reason: 'Email must contain exactly one @ symbol.' };
    }

    const [localPart, domain] = [parts[0].toLowerCase(), parts[1].toLowerCase()];

    if (localPart.length < 3) {
      return { valid: false, reason: 'Email username must be at least 3 characters long.' };
    }
    if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
      return { valid: false, reason: 'Email username contains invalid dots format.' };
    }
    if (/^(.)\1{4,}$/.test(localPart)) {
      return { valid: false, reason: 'Please enter a genuine email username.' };
    }

    const blockedDomains = ['wtf.com', 'tempmail.com', 'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'throwawaymail.com', 'trashmail.com', 'fake.com', 'test.com', 'example.com'];
    if (blockedDomains.includes(domain)) {
      return { valid: false, reason: `The domain "@${domain}" is not permitted. Please use a recognized email provider.` };
    }

    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      return { valid: false, reason: 'Domain is missing an extension like .com or .org.' };
    }

    const domainName = domainParts[0];
    const tld = domainParts[domainParts.length - 1];
    if (domainName.length < 2) {
      return { valid: false, reason: 'Domain name is too short.' };
    }

    const recognizedDomains = [
      'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.fr', 'yahoo.de', 'yahoo.in', 'ymail.com',
      'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
      'icloud.com', 'me.com', 'mac.com',
      'proton.me', 'protonmail.com', 'zoho.com', 'aol.com', 'mail.com', 'gmx.com', 'fastmail.com', 'yandex.com', 'tuta.com', 'hey.com',
      'comcast.net', 'verizon.net', 'att.net'
    ];

    const isInstitutional = domain.endsWith('.edu') || domain.endsWith('.gov') || domain.endsWith('.mil') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.pk') || domain.endsWith('.edu.in') || domain.endsWith('.org');
    const validTlds = ['com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'app', 'co', 'ai', 'dev', 'tech', 'me', 'info', 'uk', 'ca', 'de', 'fr', 'in', 'pk', 'au', 'jp', 'us'];

    if (!recognizedDomains.includes(domain) && !isInstitutional && !validTlds.includes(tld)) {
      return { valid: false, reason: `Please enter an email with a recognized domain (e.g. @gmail.com, @yahoo.com, @outlook.com).` };
    }

    if (domainName === 'wtf' || domainName === 'test' || domainName === 'fake' || domainName === 'nowhere' || /^(.)\1{3,}$/.test(domainName)) {
      return { valid: false, reason: `The domain "@${domain}" is not recognized. Please use a valid email provider.` };
    }

    return { valid: true };
  };

  // Step 1: Submit Email -> Request OTP from server
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validation = validateEmailFormat(email);
    if (!validation.valid) {
      setErrorMessage(validation.reason || 'Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code.');
      }

      setStep('otp_verify');
      setSuccessMessage('A 6-digit verification code has been sent from waqassubhane99@gmail.com to your email.');
      setCooldownSeconds(data.resendCooldownSeconds || 60);
      setExpiresSeconds(data.expiresSeconds || 300);

      // Reset OTP array
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while requesting OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit entry
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take last digit if pasted
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otpCode,
          name: name.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid or expired verification code.');
      }

      // Success! Update User State
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
      onUserChanged(verifiedUser);

      setSuccessMessage(`Welcome, ${verifiedUser.name}! Account verified successfully.`);
      
      setTimeout(() => {
        setSuccessMessage('');
        setStep('profile');
        onClose();
      }, 1200);

    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
      setStep('email_input');
      setEmail('');
      setName('');
      setSuccessMessage('Logged out securely.');
      if (onLogout) {
        onLogout();
      }
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#23211e] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {step === 'profile' ? 'Verified Account' : step === 'email_input' ? 'Secure OTP Sign In' : 'Verify Email Code'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">

          {/* Active Profile View */}
          {step === 'profile' && (
            <div className="space-y-5">
              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-800 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">{currentUser.name}</h3>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-900/10 text-emerald-800 dark:text-emerald-300 border border-emerald-800/20 shrink-0">
                      <ShieldCheck className="w-3 h-3 mr-0.5 text-emerald-800 dark:text-emerald-400" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{currentUser.email}</p>
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 mt-1">
                    Level {currentUser.level} Goal Master ({currentUser.xp} XP)
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    setStep('email_input');
                    setEmail('');
                    setName('');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-800 hover:bg-emerald-700 text-stone-100 flex items-center justify-center space-x-2 transition-all shadow-xs"
                >
                  <Mail className="w-4 h-4" />
                  <span>Switch Account / Sign In with Email OTP</span>
                </button>

                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center space-x-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Email Input Form */}
          {step === 'email_input' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <p className="text-xs text-stone-600 dark:text-stone-400 mb-3">
                  Enter your email address. A cryptographically secure 6-digit OTP will be sent to verify ownership.
                </p>

                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Full Name <span className="text-stone-400 font-normal">(Optional for new accounts)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/50 font-medium"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-stone-100 flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Secure OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep('profile')}
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                >
                  Back to Profile
                </button>
              </div>
            </form>
          )}

          {/* Step 2: OTP Verification Form */}
          {step === 'otp_verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex p-3 rounded-full bg-emerald-900/10 text-emerald-800 dark:text-emerald-400 mb-1">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Enter Verification Code</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Sent to <strong className="text-stone-800 dark:text-stone-200">{email}</strong> from <strong className="text-stone-800 dark:text-stone-200">waqassubhane99@gmail.com</strong>
                </p>
              </div>

              {/* 6-Digit OTP Box Grid */}
              <div className="flex items-center justify-center space-x-2" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-10 h-12 text-center text-lg font-bold rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-800/60 focus:border-emerald-800"
                  />
                ))}
              </div>

              {/* Timers & Cooldown Info */}
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1">
                <span>Code expires in: <strong className="font-mono text-stone-800 dark:text-stone-200">{formatTime(expiresSeconds)}</strong></span>
                
                <button
                  type="button"
                  onClick={() => handleRequestOtp()}
                  disabled={cooldownSeconds > 0 || isLoading}
                  className="font-semibold text-emerald-800 dark:text-emerald-400 hover:underline disabled:opacity-40 disabled:no-underline flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{cooldownSeconds > 0 ? `Resend (${cooldownSeconds}s)` : 'Resend Code'}</span>
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-800 dark:text-emerald-400" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || otp.join('').length < 6}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-stone-100 flex items-center justify-center space-x-2 transition-all shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Verify & Authenticate</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email_input');
                    setErrorMessage('');
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                >
                  Change Email Address
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer Security Note */}
        <div className="p-4 bg-stone-100/60 dark:bg-stone-900/60 border-t border-stone-200/80 dark:border-stone-800 text-[11px] text-stone-500 text-center flex items-center justify-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-800 dark:text-emerald-400" />
          <span>Server-enforced OTP hashing, rate limits & HTTP-only sessions</span>
        </div>

      </div>
    </div>
  );
};
