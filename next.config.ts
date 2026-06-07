import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing PDF.js worker from node_modules
  webpack: (config) => {
    // Add rule to handle PDF.js worker
    config.module.rules.push({
      test: /pdf\.worker\.(min\.)?js/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/[name].[hash][ext]',
      },
    });
    
    return config;
  },
  // Disable ESLint during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
