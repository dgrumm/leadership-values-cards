/**
 * Simple script to verify environment variables are set correctly
 */

console.log('🔍 Environment Verification');
console.log('===========================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PLAYWRIGHT_TEST: ${process.env.PLAYWRIGHT_TEST}`);
console.log('');

// Check expected values
const isTestEnv = process.env.NODE_ENV === 'test';
const isPlaywrightTest = process.env.PLAYWRIGHT_TEST === 'true';

console.log('📊 Environment Status:');
console.log(`✅ NODE_ENV=test: ${isTestEnv ? 'YES' : 'NO'}`);
console.log(`✅ PLAYWRIGHT_TEST=true: ${isPlaywrightTest ? 'YES' : 'NO'}`);
console.log('');

if (isTestEnv && isPlaywrightTest) {
  console.log('✅ Environment correctly configured for E2E testing');
  console.log('   - Rate limits should be set to high values (1000, 2000, etc.)');
  process.exit(0);
} else {
  console.log('❌ Environment not configured for E2E testing');
  console.log('   - Rate limits will use production values (10, 20, etc.)');
  console.log('   - This may cause rate limit errors during tests');
  process.exit(1);
}