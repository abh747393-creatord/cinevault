'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  IconShield,
  IconLock,
  IconMail,
  IconAlertCircle,
  IconCheck,
  IconArrowLeft,
  IconClapperboardPlay,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { getBrowserClient } from '@/lib/supabase/client';
import { ADMIN_EMAIL, normalizeEmail } from '@/lib/auth/admin-constants';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/admin/dashboard';
  const urlError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === 'unauthorized' ? 'Access Restricted: Administrator privileges required.' : null
  );
  const [success, setSuccess] = useState(false);

  // Check if existing session is already verified as admin
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        if (normalizeEmail(session.user.email) === ADMIN_EMAIL) {
          router.replace(redirectTarget);
        }
      }
    });
  }, [router, redirectTarget]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalized = normalizeEmail(email);

    // Immediate client-side validation against admin allowlist
    if (normalized !== ADMIN_EMAIL) {
      setError('Access Denied: This account is not authorized for administrative access.');
      setLoading(false);
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) {
      setError('Authentication gateway is currently unavailable.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });

      if (authError) {
        setError(authError.message || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      if (data?.user?.email && normalizeEmail(data.user.email) === ADMIN_EMAIL) {
        setSuccess(true);
        setTimeout(() => {
          router.push(redirectTarget);
        }, 500);
      } else {
        await supabase.auth.signOut();
        setError('Access Denied: Unauthorized account.');
      }
    } catch {
      setError('An unexpected error occurred during admin sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      {/* Cinematic Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-[#0e1118]/90 border border-white/10 shadow-2xl space-y-6 relative z-10 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <IconShield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-wider text-white">
              CINE<span className="text-primary">VAULT</span>
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Control Center Portal
          </h2>
          <p className="text-xs text-slate-400">
            Secure administrative entrance. Authorized personnel only.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-400 animate-fade-in">
            <IconAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-400 animate-fade-in">
            <IconCheck className="w-4 h-4 shrink-0" />
            <span>Authentication verified. Redirecting to Dashboard...</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Administrator Email
            </label>
            <div className="relative">
              <IconMail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                className="w-full h-10 pl-10 pr-3 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <IconLock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                className="w-full h-10 pl-10 pr-3 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || success}
            className="w-full font-bold text-xs h-11 shadow-lg shadow-primary/25"
          >
            {loading ? 'Authenticating...' : 'Sign In as Administrator'}
          </Button>
        </form>

        {/* Discreet Return Link */}
        <div className="text-center pt-3 border-t border-white/10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <IconArrowLeft className="w-3.5 h-3.5" />
            Return to CineVault Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
