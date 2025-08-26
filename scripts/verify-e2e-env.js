/**
 * Script to verify that E2E environment variables are set correctly
 */

// Set test environment before importing
process.env.NODE_ENV = 'test';
process.env.PLAYWRIGHT_TEST = 'true';

const { RATE_LIMIT_CONFIGS } = require('../lib/utils/rate-limiter');

console.log('🔍 E2E Environment Verification');
console.log('================================');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PLAYWRIGHT_TEST: ${process.env.PLAYWRIGHT_TEST}`);
console.log('');

console.log('📊 Rate Limit Configuration:');
console.log(`CREATE_SESSION.maxRequests: ${RATE_LIMIT_CONFIGS.CREATE_SESSION.maxRequests}`);
console.log(`JOIN_SESSION.maxRequests: ${RATE_LIMIT_CONFIGS.JOIN_SESSION.maxRequests}`);
console.log(`GENERAL.maxRequests: ${RATE_LIMIT_CONFIGS.GENERAL.maxRequests}`);
console.log('');

// Expected values for E2E tests
const expectedCreateSession = 1000;
const expectedJoinSession = 2000;
const expectedGeneral = 1000;

let allCorrect = true;

if (RATE_LIMIT_CONFIGS.CREATE_SESSION.maxRequests !== expectedCreateSession) {
  console.log(`❌ CREATE_SESSION rate limit incorrect: expected ${expectedCreateSession}, got ${RATE_LIMIT_CONFIGS.CREATE_SESSION.maxRequests}`);
  allCorrect = false;
}

if (RATE_LIMIT_CONFIGS.JOIN_SESSION.maxRequests !== expectedJoinSession) {
  console.log(`❌ JOIN_SESSION rate limit incorrect: expected ${expectedJoinSession}, got ${RATE_LIMIT_CONFIGS.JOIN_SESSION.maxRequests}`);
  allCorrect = false;
}

if (RATE_LIMIT_CONFIGS.GENERAL.maxRequests !== expectedGeneral) {
  console.log(`❌ GENERAL rate limit incorrect: expected ${expectedGeneral}, got ${RATE_LIMIT_CONFIGS.GENERAL.maxRequests}`);
  allCorrect = false;
}

if (allCorrect) {
  console.log('✅ All rate limits are correctly configured for E2E testing');
  process.exit(0);
} else {
  console.log('❌ Rate limit configuration is incorrect for E2E testing');
  process.exit(1);
}