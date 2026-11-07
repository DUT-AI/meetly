'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share, Bell, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra ứng dụng đã chạy ở chế độ standalone (đã cài đặt) chưa
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. Kiểm tra nếu là thiết bị iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Đăng ký Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[Meetly PWA] Service Worker đăng ký thành công với scope:', registration.scope);
        })
        .catch((err) => {
          console.warn('[Meetly PWA] Lỗi đăng ký Service Worker:', err);
        });
    }

    // 4. Bắt sự kiện beforeinstallprompt (Android / Chrome)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Nếu chưa cài đặt, hiển thị banner nhắc cài đặt trên mobile
      if (!isStandaloneMode) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Nếu là iOS và chưa cài đặt, hiển thị banner sau 3 giây
    if (isIosDevice && !isStandaloneMode) {
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('meetly_pwa_ios_dismissed');
        if (!dismissed) {
          setShowInstallBanner(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('[Meetly PWA] Người dùng đã chấp nhận cài đặt');
      }
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    if (isIos) {
      localStorage.setItem('meetly_pwa_ios_dismissed', 'true');
    }
  };

  return (
    <>
      {children}

      {/* Banner hướng dẫn cài đặt PWA trên điện thoại */}
      {showInstallBanner && !isStandalone && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-indigo-500/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md">
                <img src="/icons/icon-192x192.png" alt="Meetly" className="size-8 rounded-lg object-contain" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-100">Cài đặt ứng dụng Meetly</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Trải nghiệm mượt mà toàn màn hình & nhận thông báo đẩy tức thì trên điện thoại.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismissBanner}
              className="text-slate-400 hover:text-white transition p-1"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-3.5 flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissBanner}
              className="text-xs text-slate-400 hover:text-white"
            >
              Để sau
            </Button>

            {isIos ? (
              <div className="flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-800/50">
                <span>Bấm nút</span>
                <Share className="size-3.5 inline text-blue-400" />
                <span>rồi chọn <strong>"Thêm vào MH chính"</strong></span>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-medium gap-1.5 shadow-md shadow-indigo-600/30"
              >
                <Download className="size-3.5" />
                Cài đặt ngay
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Tiện ích phát âm thanh thông báo chime (Sound Alert)
 * Sử dụng HTML5 Audio và Web Audio API tổng hợp âm tần số kép (D5 -> A5)
 */
export function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.8;
    audio.play().catch(() => {
      // Fallback: Web Audio API Synthesizer (hoạt động kể cả khi file âm thanh bị chặn)
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // Tone 1: 659.25Hz (E5)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.2);

        // Tone 2: 880Hz (A5)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0.35, ctx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.15);
        osc2.stop(ctx.currentTime + 0.45);
      } catch (synthErr) {
        console.warn('[SoundAlert] Audio synthesizer failed', synthErr);
      }
    });
  } catch (e) {
    console.warn('[SoundAlert] Could not play notification sound', e);
  }
}

