import { NextResponse } from 'next/server';

/**
 * Health check endpoint for testing
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'running'
  });
}