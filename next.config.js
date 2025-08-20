/** @type {import('next').NextConfig} */
const { execSync } = require('child_process');
const path = require('path');

const nextConfig = {
  // Build-time CSV processing
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    if (isServer) {
      // Run CSV validation and generation during build
      console.log('🎴 Processing card decks...');
      try {
        execSync('node scripts/build-csv.js validate', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Card decks processed successfully');
      } catch (error) {
        console.error('❌ CSV processing failed:', error.message);
        throw new Error('Build failed due to CSV processing errors');
      }
    }
    
    return config;
  },
  
  // Environment variables for deck selection
  env: {
    CARD_DECK_TYPE: process.env.CARD_DECK_TYPE || 'professional',
  },
  
  // Experimental features for better performance
  experimental: {
    // Enable if needed for large card datasets
    // largePageDataBytes: 128 * 1000, // 128KB
  }
}

module.exports = nextConfig