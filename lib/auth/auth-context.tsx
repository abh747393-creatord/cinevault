'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types/user';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getStoredUser, saveStoredUser } from '@/lib/storage/local-storage-store';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isSupabaseActive: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email: string, username: string, displayName: string, password?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isSupabaseActive = isSupabaseConfigured;

  useEffect(() => {
    if (!isSupabaseActive) {
      // Local demo mode
      const stored = getStoredUser();
      setUser(stored);
      setLoading(false);
      return;
    }

    const supabase = getBrowserClient();
    if (!supabase) {
      setUser(getStoredUser());
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isSupabaseActive]);

  const fetchUserProfile = async (userId: string, email: string) => {
    const supabase = getBrowserClient();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setUser({
          id: data.id,
          email: email,
          username: data.username || email.split('@')[0],
          displayName: data.display_name || email.split('@')[0],
          avatarUrl: data.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          role: (data.role as UserRole) || 'user',
          preferredLanguage: data.preferred_language || 'English',
          preferredSubtitleLanguage: data.preferred_subtitle_language || 'English',
          defaultQuality: data.default_quality || '1080p',
          autoplayNext: data.autoplay_next ?? true,
          theme: data.theme || 'dark',
          createdAt: data.created_at || new Date().toISOString(),
        });
      } else {
        // Create initial profile record if not present
        const initialProfile: UserProfile = {
          id: userId,
          email,
          username: email.split('@')[0],
          displayName: email.split('@')[0],
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          role: 'user',
          preferredLanguage: 'English',
          preferredSubtitleLanguage: 'English',
          defaultQuality: '1080p',
          autoplayNext: true,
          theme: 'dark',
          createdAt: new Date().toISOString(),
        };
        await supabase.from('profiles').insert([
          {
            id: userId,
            username: initialProfile.username,
            display_name: initialProfile.displayName,
            role: 'user',
          },
        ]);
        setUser(initialProfile);
      }
    } catch {
      setUser(getStoredUser());
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password?: string) => {
    if (!isSupabaseActive) {
      const updated: UserProfile = {
        ...getStoredUser(),
        email,
        displayName: email.split('@')[0],
        username: email.split('@')[0],
      };
      saveStoredUser(updated);
      setUser(updated);
      return {};
    }

    const supabase = getBrowserClient();
    if (!supabase) return { error: 'Supabase client not initialized' };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password || 'Password123!',
    });

    if (error) {
      return { error: error.message };
    }
    return {};
  };

  const signUp = async (
    email: string,
    username: string,
    displayName: string,
    password?: string
  ) => {
    if (!isSupabaseActive) {
      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email,
        username,
        displayName,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        role: 'user',
        preferredLanguage: 'English',
        preferredSubtitleLanguage: 'English',
        defaultQuality: '1080p',
        autoplayNext: true,
        theme: 'dark',
        createdAt: new Date().toISOString(),
        stats: { hoursWatched: 0, completedTitles: 0, watchlistCount: 0 },
      };
      saveStoredUser(newUser);
      setUser(newUser);
      return {};
    }

    const supabase = getBrowserClient();
    if (!supabase) return { error: 'Supabase client not initialized' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password: password || 'Password123!',
      options: {
        data: { username, display_name: displayName },
      },
    });

    if (error) return { error: error.message };
    if (data.user) {
      await supabase.from('profiles').insert([
        {
          id: data.user.id,
          username,
          display_name: displayName,
          role: 'user',
        },
      ]);
    }
    return {};
  };

  const signOut = async () => {
    if (isSupabaseActive) {
      const supabase = getBrowserClient();
      if (supabase) await supabase.auth.signOut();
    }
    setUser(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    saveStoredUser(updated);

    if (isSupabaseActive) {
      const supabase = getBrowserClient();
      if (supabase) {
        await supabase
          .from('profiles')
          .update({
            display_name: updated.displayName,
            preferred_language: updated.preferredLanguage,
            preferred_subtitle_language: updated.preferredSubtitleLanguage,
            default_quality: updated.defaultQuality,
            autoplay_next: updated.autoplayNext,
            theme: updated.theme,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
    }
  };

  const switchRole = useCallback((role: UserRole) => {
    if (!user) return;
    const updated = { ...user, role };
    setUser(updated);
    saveStoredUser(updated);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSupabaseActive,
        signIn,
        signUp,
        signOut,
        updateProfile,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
