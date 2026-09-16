'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminHeader } from '@/components/admin/admin-header';
import { IconShield, IconArrowRightUp, IconLock } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { ADMIN_EMAIL, normalizeEmail } from '@/lib/auth/admin-constants';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // If on the dedicated admin login page, bypass admin chrome and render directly
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const isVerifiedAdmin =
    user &&
    user.role === 'admin' &&
    normalizeEmail(user.email) === ADMIN_EMAIL;

  useEffect(() => {
    if (!loading && !isVerifiedAdmin) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname || '/admin/dashboard')}`);
    }
  }, [loading, isVerifiedAdmin, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  // Strict RBAC Access Check
  if (!isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-white/10 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5">
            <IconShield className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Access Restricted
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The CineVault Control Center is restricted to verified administrative personnel ({ADMIN_EMAIL}).
              {user ? (
                <>
                  {' '}You are currently signed in as{' '}
                  <strong className="text-white">{user.email}</strong>.
                </>
              ) : (
                ' Please sign in with the authorized administrator account to proceed.'
              )}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <Link href="/admin/login" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto text-xs font-bold gap-1.5"
              >
                <IconLock className="w-3.5 h-3.5" />
                Sign In to Admin
              </Button>
            </Link>

            <Link href="/" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs gap-1.5"
              >
                Return to CineVault
                <IconArrowRightUp className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex flex-row antialiased">
      {/* Sidebar */}
      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <AdminHeader onMobileMenuToggle={() => setMobileSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
