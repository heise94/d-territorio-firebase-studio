
import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/** @type {import('@ducanh2912/next-pwa').PWAConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev,
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
