'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconShield } from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { isAdultContent } from '@/lib/utils/content-filter';

export default function AdultPage() {
  const router = useRouter();
  const [isAgeVerified, setIsAgeVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adultItems, setAdultItems] = useState<ContentItem[]>([]);

  // Check age verification status on mount from local browser session
  useEffect(() => {
    try {
      const verified = sessionStorage.getItem('cinevault_age_gate_verified') === 'true';
      setIsAgeVerified(verified);
    } catch {
      setIsAgeVerified(false);
    }
  }, []);

  // Filter catalog strictly based on available metadata
  useEffect(() => {
    if (!isAgeVerified) return;

    let isMounted = true;
    setLoading(true);

    // Inspect available seed catalog and provider metadata
    const verifiedSeedAdults = SEED_CONTENT.filter(isAdultContent);

    // Under real MovieBox metadata, adult classification is not provided (defaults to PG-13)
    if (isMounted) {
      setAdultItems(verifiedSeedAdults);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isAgeVerified]);

  const handleConfirmAge = () => {
    try {
      sessionStorage.setItem('cinevault_age_gate_verified', 'true');
    } catch {}
    setIsAgeVerified(true);
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Initial SSR / Hydration placeholder
  if (isAgeVerified === null) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 18+ Age Gate
  if (!isAgeVerified) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-card/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <IconShield className="w-8 h-8" variant="Bold" />
          </div>

          <div className="space-y-3">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest bg-red-500/10 border border-red-500/30 text-red-400 uppercase">
              18+ CONTENT
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Adult Viewers Only
            </h1>
            <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
              This section is intended for adult viewers only.
            </p>
            <p className="text-xs text-slate-400 font-medium">
              You must be 18 or older to continue.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmAge}
              className="w-full sm:w-auto text-xs font-bold px-6 py-2.5 shadow-lg shadow-primary/25"
            >
              I&apos;m 18+
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleGoBack}
              className="w-full sm:w-auto text-xs font-medium px-6 py-2.5 border border-white/10 hover:bg-white/5"
            >
              Go Back
            </Button>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            Self-attestation for mature content viewing. Local browser session only.
          </p>
        </div>
      </div>
    );
  }

  // Adult Section Catalog Page
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full select-none">
      {/* Page Header */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 uppercase">
            18+ Restricted
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          18+ Adult
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Mature content for adult viewers.
        </p>
      </div>

      {/* Catalog Display */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : adultItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
          {adultItems.map((item) => (
            <ContentCard key={item.id} content={item} />
          ))}
        </div>
      ) : (
        <div className="min-h-[45vh] flex flex-col items-center justify-center p-8 rounded-3xl bg-card/40 border border-white/5 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
            <IconShield className="w-7 h-7 text-slate-500" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-white">
              No verified 18+ content available right now.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              No titles currently meet the verified 18+ classification from available upstream providers.
            </p>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm" className="text-xs font-semibold mt-2">
              Return to Home
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
