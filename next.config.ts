import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma out of the server bundle so OpenNext can ship its workerd build
  serverExternalPackages: ['@prisma/client', '.prisma/client'],

  // Lint has pre-existing errors; run it with `npm run lint` instead of blocking deploys
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for better performance
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Prevent chunk loading errors in development
      config.output.hotUpdateChunkFilename = 'static/webpack/[id].[fullhash].hot-update.js'
      config.output.hotUpdateMainFilename = 'static/webpack/[fullhash].hot-update.json'
      
      // Faster rebuilds in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    return config
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-label',
      '@radix-ui/react-switch',
      'date-fns'
    ],
  },
  
  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Development configuration
  devIndicators: {
    position: 'bottom-right',
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig;
