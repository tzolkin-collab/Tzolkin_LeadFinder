import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tzolkin/core', '@tzolkin/database'],
  experimental: {
    optimizePackageImports: [
      '@mui/material',
      '@mui/x-charts',
      'recharts',
      'three',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
  reactStrictMode: true,
  turbopack: {
    root: path.resolve(__dirname, '../../'),
  },
};

export default nextConfig;
