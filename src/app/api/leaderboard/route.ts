import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/sessionStore';

// GET - Get global leaderboard
export async function GET() {
  try {
    const entries = sessionStore.getGlobalLeaderboard();

    const leaderboard = entries.map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      userName: entry.name,
      totalScore: entry.totalScore,
      totalQuestions: entry.totalQuestions,
      testsCompleted: entry.totalTests,
      averageScore: entry.averagePercentage,
    }));

    return NextResponse.json({
      success: true,
      leaderboard,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
