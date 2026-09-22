'use client';

import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AudioTimelinePlayerRef {
  seekTo: (timeMs: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTimeMs: () => number;
}

interface AudioTimelinePlayerProps {
  audioUrl?: string | null;
  onTimeUpdate?: (timeMs: number) => void;
  className?: string;
}

export const AudioTimelinePlayer = forwardRef<AudioTimelinePlayerRef, AudioTimelinePlayerProps>(
  ({ audioUrl, onTimeUpdate, className }, ref) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0); // in seconds
    const [currentTime, setCurrentTime] = useState(0); // in seconds
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);

    useImperativeHandle(ref, () => ({
      seekTo: (timeMs: number) => {
        if (audioRef.current) {
          const targetSec = Math.max(0, Math.min(timeMs / 1000, duration || 99999));
          audioRef.current.currentTime = targetSec;
          setCurrentTime(targetSec);
          if (!isPlaying) {
            audioRef.current.play().catch(() => { });
          }
        }
      },
      play: () => {
        audioRef.current?.play().catch(() => { });
      },
      pause: () => {
        audioRef.current?.pause();
      },
      getCurrentTimeMs: () => {
        return Math.round((audioRef.current?.currentTime ?? 0) * 1000);
      },
    }));

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration || 0);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        const cur = audioRef.current.currentTime;
        setCurrentTime(cur);
        onTimeUpdate?.(Math.round(cur * 1000));
      }
    };

    const togglePlay = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => { });
      }
    };

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetSec = parseFloat(e.target.value);
      if (audioRef.current) {
        audioRef.current.currentTime = targetSec;
        setCurrentTime(targetSec);
        onTimeUpdate?.(Math.round(targetSec * 1000));
      }
    };

    const skipTime = (deltaSeconds: number) => {
      if (audioRef.current) {
        const target = Math.max(0, Math.min(currentTime + deltaSeconds, duration));
        audioRef.current.currentTime = target;
        setCurrentTime(target);
        onTimeUpdate?.(Math.round(target * 1000));
      }
    };

    const cyclePlaybackRate = () => {
      const rates = [1, 1.25, 1.5, 2];
      const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
      const nextRate = rates[nextIdx];
      setPlaybackRate(nextRate);
      if (audioRef.current) {
        audioRef.current.playbackRate = nextRate;
      }
    };

    const toggleMute = () => {
      if (audioRef.current) {
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
      }
    };

    const formatDuration = (seconds: number) => {
      if (isNaN(seconds) || seconds < 0) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!audioUrl) {
      return (
        <div
          className={cn('p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium', className)}
        >
          Chưa có file ghi âm cuộc họp hoặc phiên đang diễn ra.
        </div>
      );
    }

    return (
      <div className={cn('flex flex-col gap-2.5 p-3.5 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800', className)}>
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-10 text-right">{formatDuration(currentTime)}</span>
          <div className="relative flex-1 group flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 w-10">{formatDuration(duration)}</span>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => skipTime(-5)}
              className="size-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title="Lùi 5 giây"
            >
              <RotateCcw className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={togglePlay}
              className="size-9 p-0 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs"
              title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => skipTime(5)}
              className="size-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title="Tiến 5 giây"
            >
              <RotateCw className="size-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cyclePlaybackRate}
              className="h-7 px-2 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
              title="Tốc độ phát"
            >
              {playbackRate}x
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="size-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
            >
              {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

AudioTimelinePlayer.displayName = 'AudioTimelinePlayer';
