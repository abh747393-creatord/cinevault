'use client';

import React, { useState } from 'react';
import { IconCopy, IconCheck, IconShare, IconSend, IconWhatsapp } from '@/components/ui/icons';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem;
}

export function ShareDialog({ isOpen, onClose, content }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/${content.contentType === 'movie' ? 'movie' : 'tv'}/${content.slug}`
    : '';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: `Watch ${content.title} on CineVault!`,
          url,
        });
      } catch {
        // User cancelled share
      }
    }
  };

  const shareText = encodeURIComponent(`Watch "${content.title}" on CineVault: ${url}`);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Watch ${content.title} on CineVault!`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${content.title} on CineVault!`)}&url=${encodeURIComponent(url)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Title">
      <div className="space-y-5">
        <div>
          <p className="text-sm text-slate-300 font-medium">{content.title}</p>
          <p className="text-xs text-slate-400 mt-0.5">Share this title with your friends</p>
        </div>

        {/* Copy Link Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 h-10 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-slate-300 outline-none select-all"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 h-10"
            aria-label={copied ? 'Link copied' : 'Copy link'}
          >
            {copied ? <IconCheck className="w-4 h-4 text-emerald-400" /> : <IconCopy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label="Device Share"
            >
              <IconShare className="w-4 h-4 text-primary" />
              Device Share
            </button>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Share on WhatsApp"
          >
            <IconWhatsapp className="w-4 h-4" />
            WhatsApp
          </a>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-xs font-semibold text-sky-400 border border-sky-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Share on Telegram"
          >
            <IconSend className="w-4 h-4" />
            Telegram
          </a>

          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/5 transition-colors"
          >
            X / Twitter
          </a>
        </div>
      </div>
    </Modal>
  );
}
