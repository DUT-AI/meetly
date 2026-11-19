'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Grid, LayoutDashboard, GraduationCap, CheckSquare } from 'lucide-react';

interface AppItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  isActive?: boolean;
}

const APPS: AppItem[] = [
  {
    id: 'manage',
    title: 'Hệ thống Quản lý',
    description: 'Bảng điều khiển quản trị trung tâm và dữ liệu',
    icon: LayoutDashboard,
    path: '/manage/dashboard',
  },
  {
    id: 'lms',
    title: 'Học tập & Trắc nghiệm',
    description: 'Ngân hàng câu hỏi, bài tập và đề thi LMS',
    icon: GraduationCap,
    path: '/lms/dashboard',
  },
  {
    id: 'meetly',
    title: 'Công việc & Lịch trình',
    description: 'Bảng việc Kanban, ghi chú và dự án',
    icon: CheckSquare,
    path: '/meetly/tasks',
    isActive: true,
  },
];

export function WaffleLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="DUT-AI Apps"
        title="Chuyển đổi ứng dụng DUT-AI"
        className={`p-2 rounded-xl transition-colors focus:outline-none ${
          isOpen
            ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
        }`}
      >
        <Grid className="size-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 mb-2 border-b border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
              DUT-AI WORKSPACE
            </p>
          </div>

          <div className="flex flex-col gap-1">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <a
                  key={app.id}
                  href={app.path}
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                    app.isActive
                      ? 'bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 shrink-0 text-neutral-900 dark:text-neutral-100">
                    <Icon className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {app.title}
                      </p>
                      {app.isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                          Đang mở
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                      {app.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default WaffleLauncher;
