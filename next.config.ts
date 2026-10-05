
import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('@ducanh2912/next-pwa').PWAConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev,
  cacheOnFrontEndNav: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [{
      // Never cache participant pages, RSC responses or identity/session API responses.
      urlPattern: ({ url }: { url: URL }) =>
        url.pathname === '/campanas' || url.pathname.startsWith('/campanas/') || url.pathname.startsWith('/api/campanas/'),
      handler: 'NetworkOnly',
    }],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default isDev ? nextConfig : withPWA(nextConfig);
