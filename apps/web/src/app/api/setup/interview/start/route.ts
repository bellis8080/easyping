/**
 * POST /api/setup/interview/start
 * Story 3.4: Organization Profile & Category Management
 *
 * Starts the Echo profile interview and returns the opening question.
 */

import { NextResponse } from 'next/server';
import { startInterview } from '@/lib/services/profile-interview-service';

export async function POST() {
  try {
    const opening = startInterview();

    return NextResponse.json({ opening });
  } catch (error) {
    console.error('Error starting interview:', error);
    return NextResponse.json(
      { error: 'Failed to start interview' },
      { status: 500 }
    );
  }
}
