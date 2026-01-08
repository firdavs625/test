import { TestSession, SessionParticipant, GlobalLeaderboardEntry } from '@/types';

// In-memory session storage for real-time group tests
// Note: In production with multiple serverless instances, use Redis or a database
class SessionStore {
  private sessions: Map<string, TestSession> = new Map();
  private leaderboard: Map<number, GlobalLeaderboardEntry> = new Map();

  createSession(session: TestSession): void {
    this.sessions.set(session.id, session);
  }

  getSession(id: string): TestSession | null {
    return this.sessions.get(id) || null;
  }

  updateSession(id: string, updates: Partial<TestSession>): TestSession | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  getSessionsByVariant(variantId: number): TestSession[] {
    const result: TestSession[] = [];
    this.sessions.forEach((session) => {
      if (session.variantId === variantId && session.status === 'waiting') {
        result.push(session);
      }
    });
    return result;
  }

  getActiveSessionsForVariant(variantId: number): TestSession[] {
    const result: TestSession[] = [];
    this.sessions.forEach((session) => {
      if (session.variantId === variantId && (session.status === 'waiting' || session.status === 'active')) {
        result.push(session);
      }
    });
    return result;
  }

  getAllActiveSessions(): TestSession[] {
    const result: TestSession[] = [];
    this.sessions.forEach((session) => {
      if (session.status === 'waiting' || session.status === 'active') {
        result.push(session);
      }
    });
    return result;
  }

  getWaitingSessions(): TestSession[] {
    const result: TestSession[] = [];
    this.sessions.forEach((session) => {
      if (session.status === 'waiting') {
        result.push(session);
      }
    });
    return result;
  }

  addParticipant(sessionId: string, participant: SessionParticipant): TestSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check if user already in session
    const exists = session.participants.find(p => p.userId === participant.userId);
    if (exists) return session;

    session.participants.push(participant);
    this.sessions.set(sessionId, session);
    return session;
  }

  updateParticipant(sessionId: string, userId: number, updates: Partial<SessionParticipant>): TestSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const participantIndex = session.participants.findIndex(p => p.userId === userId);
    if (participantIndex === -1) return null;

    session.participants[participantIndex] = { ...session.participants[participantIndex], ...updates };
    this.sessions.set(sessionId, session);
    return session;
  }

  getAllSessions(): TestSession[] {
    return Array.from(this.sessions.values());
  }

  // Leaderboard methods
  updateLeaderboard(userId: number, username: string, name: string, score: number, total: number): void {
    const existing = this.leaderboard.get(userId);
    const now = Date.now();
    
    if (existing) {
      const newTotalScore = existing.totalScore + score;
      const newTotalQuestions = existing.totalQuestions + total;
      this.leaderboard.set(userId, {
        ...existing,
        name,
        totalTests: existing.totalTests + 1,
        totalScore: newTotalScore,
        totalQuestions: newTotalQuestions,
        averagePercentage: Math.round((newTotalScore / newTotalQuestions) * 100),
        bestScore: Math.max(existing.bestScore, Math.round((score / total) * 100)),
        lastTestDate: now,
      });
    } else {
      this.leaderboard.set(userId, {
        userId,
        username,
        name,
        totalTests: 1,
        totalScore: score,
        totalQuestions: total,
        averagePercentage: Math.round((score / total) * 100),
        bestScore: Math.round((score / total) * 100),
        lastTestDate: now,
      });
    }
  }

  getGlobalLeaderboard(): GlobalLeaderboardEntry[] {
    return Array.from(this.leaderboard.values())
      .sort((a, b) => b.averagePercentage - a.averagePercentage || b.totalTests - a.totalTests);
  }

  getUserStats(userId: number): GlobalLeaderboardEntry | null {
    return this.leaderboard.get(userId) || null;
  }

  // Cleanup old sessions (older than 2 hours)
  cleanup(): void {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    this.sessions.forEach((session, id) => {
      if (session.createdAt < twoHoursAgo && session.status === 'finished') {
        this.sessions.delete(id);
      }
    });
  }
}

// Singleton instance
export const sessionStore = new SessionStore();

// Cleanup every 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionStore.cleanup();
  }, 30 * 60 * 1000);
}
