import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack configuration to prevent chunk loading errors
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Prevent chunk loading errors in development
      config.output.hotUpdateChunkFilename = 'static/webpack/[id].[fullhash].hot-update.js'
      config.output.hotUpdateMainFilename = 'static/webpack/[fullhash].hot-update.json'
    }
    return config
  },
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  
  // Development configuration
  devIndicators: {
    appIsrStatus: true,
    buildActivityPosition: 'bottom-right',
  },
}

export default nextConfig;
