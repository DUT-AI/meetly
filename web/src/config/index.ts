import type { Metadata } from 'next';

export const siteConfig: Metadata = {
  title: 'Meetly',
  description: 'Meetly - Task Management',
  keywords: ['Project Management'] as Array<string>,
  authors: {
    name: 'DUT AI CLUB',
    url: 'https://github.com/orgs/DUT-AI/repositories',
  },
} as const;

export const links = {
  sourceCode: 'https://github.com/orgs/DUT-AI/repositories',
} as const;
