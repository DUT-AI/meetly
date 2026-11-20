/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/tasks',
        permanent: false,
      },
      {
        source: '/meetly',
        destination: '/tasks',
        permanent: true,
      },
      {
        source: '/meetly/tasks',
        destination: '/tasks',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/sign-in',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://api:8000/api/v1';
    const apiHost = internalApiUrl.replace(/\/api\/v1\/?$/, '');
    return [
      {
        source: '/meetly/api/:path*',
        destination: `${apiHost}/api/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiHost}/api/:path*`,
      },
      {
        source: '/docs',
        destination: `${apiHost}/docs`,
      },
      {
        source: '/redoc',
        destination: `${apiHost}/redoc`,
      },
      {
        source: '/openapi.json',
        destination: `${apiHost}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
