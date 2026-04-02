import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/client-error
 * Receives client-side errors from global-error.tsx and logs them server-side
 * so they appear in docker logs and can be diagnosed without a browser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, digest, url, userAgent } = body;

    console.error('[ClientError] Client-side exception reported:', {
      message,
      digest,
      url,
      userAgent,
      stack: stack?.split('\n').slice(0, 5).join('\n'), // First 5 stack frames
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Swallow parse errors
    return NextResponse.json({ ok: true });
  }
}
