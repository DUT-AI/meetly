import type { Metadata } from 'next';

export const siteConfig: Metadata = {
  title: 'Meetly - AI Meeting Assistant',
  description: 'Meetly - Quản trị cuộc họp thông minh, tự động hóa nhiệm vụ và dịch thuật trực tiếp.',
  keywords: ['Project Management', 'Meeting Assistant', 'AI Transcription', 'Task Automation'] as Array<string>,
  authors: {
    name: 'DUT AI CLUB',
    url: 'https://github.com/orgs/DUT-AI/repositories',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Meetly',
  },
  icons: {
    icon: '/icons/icon-192x192.png?v=3',
    apple: '/icons/apple-touch-icon.png?v=3',
  },
} as const;

export const links = {
  sourceCode: 'https://github.com/orgs/DUT-AI/repositories',
} as const;
