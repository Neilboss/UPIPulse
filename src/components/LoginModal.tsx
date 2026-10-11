'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, KeyRound, Sparkles, LogIn, LogOut, CheckCircle2, Shield, Eye, EyeOff, User, X } from 'lucide-react';
import { AuthService, AuthUser } from '../lib/services/authService';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  isMandatory?: boolean;
}

export function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  isMandatory = false,
}: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isEditingCreds, setIsEditingCreds] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const held = AuthService.getHeldCredentials();
      setEmail(held.email);
      setPassword(held.password);
      setName(held.name);
      setCurrentUser(AuthService.getCurrentUser());
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFillDemo = () => {
    setEmail(AuthService.DEFAULT_EMAIL);
    setPassword(AuthService.DEFAULT_PASSWORD);
    setName(AuthService.DEFAULT_NAME);
    setError(null);
    setSuccessMsg('Demo credentials filled!');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleSaveCustomCreds = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }
    AuthService.saveHeldCredentials(email, password, name || 'User');
    setIsEditingCreds(false);
    setSuccessMsg('Dummy credentials updated and held securely!');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const result = AuthService.login(email, password, rememberMe);
      setIsSubmitting(false);

      if (result.success && result.user) {
        setSuccessMsg('Login successful! Welcome back.');
        setTimeout(() => {
          onLoginSuccess(result.user!);
          if (onClose) onClose();
        }, 600);
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    }, 400);
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setSuccessMsg('Logged out successfully.');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
        {/* Close Button if not mandatory */}
        {!isMandatory && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header with App Branding */}
        <div className="text-center space-y-1 pt-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-1">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            {currentUser?.isLoggedIn ? 'Account Profile' : 'UPIPulse Login'}
          </h2>
          <p className="text-xs text-zinc-400">
            {currentUser?.isLoggedIn
              ? `Logged in as ${currentUser.email}`
              : 'Sign in to access your private financial ledger'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {currentUser?.isLoggedIn ? (
          /* User Profile & Session Active View */
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Status</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Authenticated
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">User Email</span>
                <span className="text-xs font-mono text-zinc-200">{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Display Name</span>
                <span className="text-xs font-semibold text-zinc-200">{currentUser.name}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Continue to App
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Login Form with Held Credentials */
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            {/* Quick Demo Credentials Pill */}
            <div className="flex items-center justify-between p-2 bg-zinc-950 border border-zinc-800/80 rounded-xl">
              <div className="text-[10px] text-zinc-400">
                <span className="font-semibold text-zinc-300 block">Dummy Credentials:</span>
                <span className="font-mono text-emerald-400">user@upipulse.app / password123</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Autofill</span>
              </button>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Email ID
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@upipulse.app"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-3 pr-9 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me / Hold Credentials */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0"
                />
                <span>Hold dummy password in session</span>
              </label>

              <button
                type="button"
                onClick={() => setIsEditingCreds(!isEditingCreds)}
                className="text-[10px] text-emerald-400 hover:underline"
              >
                {isEditingCreds ? 'Cancel' : 'Edit Held Creds'}
              </button>
            </div>

            {/* Optional Custom Held Credential Config */}
            {isEditingCreds && (
              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 animate-in fade-in">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase block">
                  Set Custom Dummy Credentials:
                </span>
                <input
                  type="text"
                  placeholder="Your Name (e.g. Neil)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomCreds}
                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-semibold rounded-lg text-xs"
                >
                  Save & Hold New Credentials
                </button>
              </div>
            )}

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-zinc-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <span>Logging in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Log In with Dummy Credentials</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
