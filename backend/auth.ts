import crypto from 'crypto';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import validator from 'validator';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  avatar: string;
  level: number;
  xp: number;
  streakDays: number;
  highestStreak: number;
  createdAt: string;
  updatedAt: string;
}

export interface OTPRecord {
  id: string;
  email: string;
  otpHash: string;
  perOtpSalt: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  used: boolean;
  createdAt: number;
  ip: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
}

export interface RateLimitRecord {
  count: number;
  resetAt: number;
  lastRequestAt: number;
}

interface AuthDatabase {
  users: ServerUser[];
  otps: OTPRecord[];
  sessions: SessionRecord[];
  rateLimits: Record<string, RateLimitRecord>;
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'auth_db.json');
const SALT = process.env.OTP_SALT || 'habitgrid_secure_otp_salt_2026';

// Ensure data directory exists
function ensureDbFile() {
  const dir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE_PATH)) {
    const initialDb: AuthDatabase = {
      users: [
        {
          id: 'user_demo',
          email: 'alex.rivera@example.com',
          name: 'Alex Rivera',
          emailVerified: true,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          level: 5,
          xp: 1450,
          streakDays: 12,
          highestStreak: 18,
          createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ],
      otps: [],
      sessions: [],
      rateLimits: {},
    };
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
  }
}

function loadDb(): AuthDatabase {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading auth database:', err);
    return { users: [], otps: [], sessions: [], rateLimits: {} };
  }
}

function saveDb(db: AuthDatabase) {
  ensureDbFile();
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving auth database:', err);
  }
}

// Utility: Normalize email address
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Recognized major email domains & reputable providers
export const RECOGNIZED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.ca',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.in',
  'ymail.com',
  'rocketmail.com',
  'outlook.com',
  'hotmail.com',
  'hotmail.co.uk',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'protonmail.ch',
  'zoho.com',
  'zohomail.com',
  'aol.com',
  'aim.com',
  'mail.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'fastmail.com',
  'fastmail.fm',
  'yandex.com',
  'yandex.ru',
  'tutanota.com',
  'tuta.com',
  'tuta.io',
  'hey.com',
  'comcast.net',
  'sbcglobal.net',
  'verizon.net',
  'att.net',
  'bell.net',
  'cox.net',
  'charter.net',
]);

// Explicitly blocked disposable/fake domains
export const BLOCKED_OR_DISPOSABLE_DOMAINS = new Set([
  'wtf.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'mailinator.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'dispostable.com',
  'trashmail.com',
  'fake.com',
  'fakemail.com',
  'test.com',
  'example.com',
  'sample.com',
  'nowhere.com',
  'spam.la',
  'yopmail.com',
  'sharklasers.com',
  'getairmail.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'mytemp.email',
  'tempail.com',
  'mohmal.com',
  'crazymailing.com',
]);

// Valid TLDs
export const VALID_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'io', 'app', 'co', 'ai', 'dev', 'tech', 'me', 'info',
  'uk', 'ca', 'de', 'fr', 'in', 'pk', 'au', 'jp', 'cn', 'br', 'ru', 'ch', 'se', 'nl', 'nz', 'es', 'it', 'us'
]);

// Utility: Strengthened email validation with structure, domain, validator checks, and DNS MX record lookup
export async function isValidEmailFormat(email: string): Promise<{ valid: boolean; reason?: string }> {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email address is required.' };
  }

  const trimmed = email.trim();
  if (trimmed.length < 6 || trimmed.length > 254) {
    return { valid: false, reason: 'Email address length must be between 6 and 254 characters.' };
  }

  // 1. Validator syntax check (local-part@domain.tld)
  if (!validator.isEmail(trimmed, { allow_utf8_local_part: false, require_tld: true })) {
    return { valid: false, reason: 'Please enter a valid email format (e.g. name@example.com).' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Email address must contain exactly one "@" symbol.' };
  }

  const [localPart, domain] = [parts[0].toLowerCase(), parts[1].toLowerCase()];

  // 2. Local part checks
  if (localPart.length < 3) {
    return { valid: false, reason: 'Email username must be at least 3 characters long.' };
  }
  if (localPart.length > 64) {
    return { valid: false, reason: 'Email username is too long (max 64 characters).' };
  }
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { valid: false, reason: 'Email username cannot start, end, or contain consecutive dots.' };
  }
  if (/^(.)\1{4,}$/.test(localPart)) {
    return { valid: false, reason: 'Please enter a genuine email username instead of repeating characters.' };
  }

  // 3. Domain disposable / blocked check
  if (BLOCKED_OR_DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, reason: `The domain "@${domain}" is not permitted. Please use a recognized email provider.` };
  }

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return { valid: false, reason: 'Domain is missing a top-level extension (e.g. .com).' };
  }

  const domainName = domainParts[0];
  const tld = domainParts[domainParts.length - 1];

  if (domainName.length < 2) {
    return { valid: false, reason: 'Domain name is too short.' };
  }

  // Reject obvious placeholder/fake domain names
  if (domainName === 'wtf' || domainName === 'test' || domainName === 'fake' || domainName === 'nowhere' || domainName === 'example' || domainName === 'sample' || /^(.)\1{3,}$/.test(domainName)) {
    return { valid: false, reason: `The domain "@${domain}" is not valid. Please enter a genuine email from a recognized provider (e.g. @gmail.com, @yahoo.com, @outlook.com).` };
  }

  // 4. Recognized major providers can skip DNS MX for sub-millisecond response
  if (RECOGNIZED_EMAIL_DOMAINS.has(domain)) {
    return { valid: true };
  }

  // Institutional or academic domain
  const isInstitutional = domain.endsWith('.edu') || domain.endsWith('.gov') || domain.endsWith('.mil') || domain.endsWith('.ac.uk') || domain.endsWith('.edu.pk') || domain.endsWith('.edu.in') || domain.endsWith('.org');
  if (isInstitutional) {
    return { valid: true };
  }

  // Check valid TLD
  if (!VALID_TLDS.has(tld)) {
    return { valid: false, reason: `The domain extension ".${tld}" is not recognized. Please use a standard email domain.` };
  }

  // 5. DNS MX Record lookup to verify domain actually exists and accepts mail
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { 
        valid: false, 
        reason: `The domain "@${domain}" has no active Mail Exchange (MX) records. Please use a valid email address.` 
      };
    }
    return { valid: true };
  } catch (err: any) {
    // Check fallback A records for legacy mail routing
    try {
      const aRecords = await dns.promises.resolve4(domain);
      if (aRecords && aRecords.length > 0) {
        return { valid: true };
      }
    } catch {}

    return { 
      valid: false, 
      reason: `The domain "@${domain}" does not exist or has no active mail server (DNS check failed).` 
    };
  }
}

// Cryptographic hash for OTP using both a unique per-OTP salt and the server-side secret (SALT)
export function hashOTP(otp: string, perOtpSalt: string): string {
  return crypto.createHash('sha256').update(`${otp}:${perOtpSalt}:${SALT}`).digest('hex');
}

// Cryptographic hash for session tokens
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(`session:${token}:${SALT}`).digest('hex');
}

// Timing-safe comparison for hashes
export function safeCompareHashes(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Rate Limiting Logic
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  cooldownMs: number = 0
): { allowed: boolean; retryAfterSeconds: number; message?: string } {
  const db = loadDb();
  const now = Date.now();
  const record = db.rateLimits[key] || { count: 0, resetAt: now + windowMs, lastRequestAt: 0 };

  // Reset window if expired
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  // Check cooldown between requests
  if (cooldownMs > 0 && record.lastRequestAt > 0) {
    const elapsed = now - record.lastRequestAt;
    if (elapsed < cooldownMs) {
      const waitSec = Math.ceil((cooldownMs - elapsed) / 1000);
      return {
        allowed: false,
        retryAfterSeconds: waitSec,
        message: `Please wait ${waitSec} seconds before requesting another code.`
      };
    }
  }

  // Check limit count
  if (record.count >= limit) {
    const waitSec = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: waitSec,
      message: `Too many requests. Please try again in ${Math.ceil(waitSec / 60)} minutes.`
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordRateLimitHit(key: string, windowMs: number) {
  const db = loadDb();
  const now = Date.now();
  const record = db.rateLimits[key] || { count: 0, resetAt: now + windowMs, lastRequestAt: 0 };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count += 1;
  }
  record.lastRequestAt = now;

  db.rateLimits[key] = record;
  saveDb(db);
}

// Database CRUD Functions

export function findUserByEmail(email: string): ServerUser | undefined {
  const db = loadDb();
  const norm = normalizeEmail(email);
  return db.users.find(u => normalizeEmail(u.email) === norm);
}

export function findUserById(id: string): ServerUser | undefined {
  const db = loadDb();
  return db.users.find(u => u.id === id);
}

export function createUser(email: string, name?: string): ServerUser {
  const db = loadDb();
  const norm = normalizeEmail(email);
  
  const existing = db.users.find(u => normalizeEmail(u.email) === norm);
  if (existing) {
    existing.emailVerified = true;
    existing.updatedAt = new Date().toISOString();
    saveDb(db);
    return existing;
  }

  const defaultName = name?.trim() || norm.split('@')[0].replace(/[._-]/g, ' ') || 'Goal Master';
  const capitalizedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

  const newUser: ServerUser = {
    id: `usr_${crypto.randomBytes(8).toString('hex')}`,
    email: norm,
    name: capitalizedName,
    emailVerified: true,
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    level: 1,
    xp: 0,
    streakDays: 0,
    highestStreak: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);
  return newUser;
}

// OTP Operations
export function createOTP(email: string, ip: string): { otp: string; expiresSeconds: number; resendCooldownSeconds: number } {
  const db = loadDb();
  const norm = normalizeEmail(email);
  const now = Date.now();

  // Generate 6-digit random OTP number
  const otp = crypto.randomInt(100000, 999999).toString();
  
  // Generate a unique cryptographically secure random salt for this specific OTP
  const perOtpSalt = crypto.randomBytes(16).toString('hex');
  
  // Hash the OTP using both perOtpSalt and the server-side OTP_SALT secret
  const otpHash = hashOTP(otp, perOtpSalt);
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes

  // Invalidate any old non-used OTPs for this email immediately
  db.otps = db.otps.map(o => {
    if (normalizeEmail(o.email) === norm && !o.used) {
      return { ...o, used: true };
    }
    return o;
  });

  // Create new record storing hash and perOtpSalt (never plaintext OTP)
  const newOtpRecord: OTPRecord = {
    id: `otp_${crypto.randomBytes(8).toString('hex')}`,
    email: norm,
    otpHash,
    perOtpSalt,
    expiresAt,
    attempts: 0,
    maxAttempts: 5,
    used: false,
    createdAt: now,
    ip,
  };

  db.otps.push(newOtpRecord);

  // Clean up expired/old OTP records (> 1 hour old)
  db.otps = db.otps.filter(o => now - o.createdAt < 3600 * 1000);

  saveDb(db);

  return {
    otp,
    expiresSeconds: 300,
    resendCooldownSeconds: 60,
  };
}

export function verifyOTP(
  email: string,
  inputOtp: string
): { success: boolean; message: string; remainingAttempts?: number } {
  const db = loadDb();
  const norm = normalizeEmail(email);
  const now = Date.now();

  // Find active OTP record for this email
  const activeRecord = db.otps.find(
    o => normalizeEmail(o.email) === norm && !o.used && o.expiresAt > now
  );

  if (!activeRecord) {
    return {
      success: false,
      message: 'Verification code has expired or is invalid. Please request a new code.',
    };
  }

  // Check attempt limit
  if (activeRecord.attempts >= activeRecord.maxAttempts) {
    activeRecord.used = true; // Invalidate
    saveDb(db);
    return {
      success: false,
      message: 'Maximum verification attempts reached (5). Please request a new code.',
    };
  }

  // Re-hash submitted OTP using the stored per-OTP salt and server-side secret
  const inputHash = hashOTP(inputOtp, activeRecord.perOtpSalt);
  const isMatch = safeCompareHashes(inputHash, activeRecord.otpHash);

  if (!isMatch) {
    activeRecord.attempts += 1;
    const remaining = activeRecord.maxAttempts - activeRecord.attempts;

    if (activeRecord.attempts >= activeRecord.maxAttempts) {
      activeRecord.used = true; // Invalidate on final attempt
    }

    saveDb(db);

    return {
      success: false,
      message: remaining > 0 
        ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Maximum verification attempts reached. Please request a new code.',
      remainingAttempts: remaining,
    };
  }

  // Success! Immediately mark used to prevent replay
  activeRecord.used = true;
  saveDb(db);

  return {
    success: true,
    message: 'OTP verified successfully.',
  };
}

// Session Operations
export function createSession(userId: string): { sessionToken: string; expiresAt: number } {
  const db = loadDb();
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(sessionToken);
  const expiresAt = Date.now() + 7 * 24 * 3600 * 1000; // 7 days

  const newSession: SessionRecord = {
    id: `sess_${crypto.randomBytes(8).toString('hex')}`,
    userId,
    tokenHash,
    expiresAt,
    createdAt: Date.now(),
  };

  db.sessions.push(newSession);

  // Clean up expired sessions
  db.sessions = db.sessions.filter(s => s.expiresAt > Date.now());

  saveDb(db);

  return { sessionToken, expiresAt };
}

export function validateSession(sessionToken: string): ServerUser | null {
  if (!sessionToken) return null;
  const db = loadDb();
  const tokenHash = hashToken(sessionToken);
  const now = Date.now();

  const session = db.sessions.find(s => safeCompareHashes(s.tokenHash, tokenHash) && s.expiresAt > now);
  if (!session) return null;

  const user = db.users.find(u => u.id === session.userId);
  return user || null;
}

export function deleteSession(sessionToken: string): boolean {
  if (!sessionToken) return false;
  const db = loadDb();
  const tokenHash = hashToken(sessionToken);
  
  const initialLength = db.sessions.length;
  db.sessions = db.sessions.filter(s => !safeCompareHashes(s.tokenHash, tokenHash));
  saveDb(db);

  return db.sessions.length < initialLength;
}
