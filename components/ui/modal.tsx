'use client';

import React, { useEffect } from 'react';
import { IconClose } from '@/components/ui/icons';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div
        className={cn(
          'relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-white/10 rounded-2xl shadow-2xl p-6 text-foreground animate-scale-up',
          className
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          {title ? (
            <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
          ) : (
            <div />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full h-8 w-8 text-slate-400 hover:text-white"
          >
            <IconClose className="w-5 h-5" />
          </Button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
