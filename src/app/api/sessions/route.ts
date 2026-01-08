import { NextResponse } from 'next/server';
import { sessionStore } from '@/lib/sessionStore';
import { TestSession, SessionParticipant } from '@/types';
import { getVariantById } from '@/data/questions';
import { v4 as uuidv4 } from 'uuid';

// GET - Get sessions for a variant or all sessions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get('variantId');
    const sessionId = searchParams.get('sessionId');
    const activeOnly = searchParams.get('active');

    if (sessionId) {
      const session = sessionStore.getSession(sessionId);
      if (!session) {
        return NextResponse.json(
          { success: false, message: 'Sessiya topilmadi' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, session });
    }

    if (activeOnly === 'true') {
      const sessions = sessionStore.getAllActiveSessions().map(s => ({
        id: s.id,
        variantId: s.variantId,
        variantName: s.variantName || `Variant ${s.variantId}`,
        hostName: s.createdByName || 'Noma\'lum',
        hostId: s.createdBy,
        participantCount: s.participants.length,
        status: s.status,
        isRandom: s.isRandom,
        questionCount: s.questionCount,
      }));
      return NextResponse.json({ success: true, sessions });
    }

    if (variantId) {
      const sessions = sessionStore.getActiveSessionsForVariant(parseInt(variantId));
      return NextResponse.json({ success: true, sessions });
    }

    const allSessions = sessionStore.getAllSessions();
    return NextResponse.json({ success: true, sessions: allSessions });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// POST - Create a new session
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { variantId, waitingTime, questionTimeLimit, userId, username, name, isRandom, questionCount, questions } = body;

    if (!waitingTime || !userId) {
      return NextResponse.json(
        { success: false, message: 'Barcha maydonlar to\'ldirilishi shart' },
        { status: 400 }
      );
    }

    let variantName = 'Random Test';
    if (!isRandom) {
      const variant = getVariantById(variantId);
      if (!variant) {
        return NextResponse.json(
          { success: false, message: 'Variant topilmadi' },
          { status: 404 }
        );
      }
      variantName = variant.name;
    }

    const sessionId = uuidv4();
    const now = Date.now();

    const participant: SessionParticipant = {
      userId,
      username,
      name,
      currentQuestion: 0,
      answers: [],
      score: 0,
      finishedAt: null,
      leftEarly: false,
    };

    const session: TestSession = {
      id: sessionId,
      variantId: isRandom ? 0 : variantId,
      variantName,
      isRandom: isRandom || false,
      questionCount: questionCount || 10,
      questionTimeLimit: questionTimeLimit || 0,
      startTime: null,
      endTime: null,
      waitingTime,
      status: 'waiting',
      participants: [participant],
      createdBy: userId,
      createdByName: name,
      createdAt: now,
      currentQuestionIndex: 0,
      questionStartTime: null,
    };

    sessionStore.createSession(session);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// PUT - Update session (join, start, update progress)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, action, userId, username, name, currentQuestion, answers, score, finishedAt, leftEarly, currentQuestionIndex, questionStartTime } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { success: false, message: 'Session ID va action kerak' },
        { status: 400 }
      );
    }

    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sessiya topilmadi' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'join': {
        if (session.status !== 'waiting') {
          return NextResponse.json(
            { success: false, message: 'Bu sessiyaga qo\'shilish mumkin emas' },
            { status: 400 }
          );
        }

        const participant: SessionParticipant = {
          userId,
          username,
          name,
          currentQuestion: 0,
          answers: [],
          score: 0,
          finishedAt: null,
          leftEarly: false,
        };

        const updatedSession = sessionStore.addParticipant(sessionId, participant);
        return NextResponse.json({ success: true, session: updatedSession });
      }

      case 'start': {
        const now = Date.now();
        const updatedSession = sessionStore.updateSession(sessionId, {
          status: 'active',
          startTime: now,
          currentQuestionIndex: 0,
          questionStartTime: now,
        });
        return NextResponse.json({ success: true, session: updatedSession });
      }

      case 'nextQuestion': {
        const now = Date.now();
        const newIndex = (currentQuestionIndex ?? session.currentQuestionIndex) + 1;
        const updatedSession = sessionStore.updateSession(sessionId, {
          currentQuestionIndex: newIndex,
          questionStartTime: now,
        });
        return NextResponse.json({ success: true, session: updatedSession });
      }

      case 'updateProgress': {
        const updatedSession = sessionStore.updateParticipant(sessionId, userId, {
          currentQuestion,
          answers,
          score,
        });
        return NextResponse.json({ success: true, session: updatedSession });
      }

      case 'leave': {
        const updatedSession = sessionStore.updateParticipant(sessionId, userId, {
          finishedAt: Date.now(),
          leftEarly: true,
        });
        return NextResponse.json({ success: true, session: updatedSession });
      }

      case 'finish': {
        const updatedSession = sessionStore.updateParticipant(sessionId, userId, {
          currentQuestion,
          answers,
          score,
          finishedAt: finishedAt || Date.now(),
          leftEarly: leftEarly || false,
        });

        // Update global leaderboard
        if (updatedSession) {
          const participant = updatedSession.participants.find(p => p.userId === userId);
          if (participant) {
            sessionStore.updateLeaderboard(
              userId,
              participant.username,
              participant.name,
              participant.score,
              updatedSession.questionCount
            );
          }
        }

        // Check if all participants finished
        const latestSession = sessionStore.getSession(sessionId);
        const allFinished = latestSession?.participants.every(p => p.finishedAt !== null);
        if (allFinished) {
          sessionStore.updateSession(sessionId, {
            status: 'finished',
            endTime: Date.now(),
          });
        }

        return NextResponse.json({ success: true, session: sessionStore.getSession(sessionId) });
      }

      case 'forceFinish': {
        // Force finish the session for all participants
        const latestSession = sessionStore.getSession(sessionId);
        if (latestSession) {
          latestSession.participants.forEach(p => {
            if (!p.finishedAt) {
              sessionStore.updateParticipant(sessionId, p.userId, {
                finishedAt: Date.now(),
              });
              sessionStore.updateLeaderboard(
                p.userId,
                p.username,
                p.name,
                p.score,
                latestSession.questionCount
              );
            }
          });
          sessionStore.updateSession(sessionId, {
            status: 'finished',
            endTime: Date.now(),
          });
        }
        return NextResponse.json({ success: true, session: sessionStore.getSession(sessionId) });
      }

      case 'cancel': {
        // Only creator can cancel
        if (session.createdBy !== userId) {
          return NextResponse.json(
            { success: false, message: 'Faqat yaratuvchi bekor qilishi mumkin' },
            { status: 403 }
          );
        }
        sessionStore.deleteSession(sessionId);
        return NextResponse.json({ success: true, message: 'Sessiya bekor qilindi' });
      }

      default:
        return NextResponse.json(
          { success: false, message: 'Noma\'lum action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a session (only creator can delete)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Session ID va User ID kerak' },
        { status: 400 }
      );
    }

    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Sessiya topilmadi' },
        { status: 404 }
      );
    }

    if (session.createdBy !== parseInt(userId)) {
      return NextResponse.json(
        { success: false, message: 'Faqat yaratuvchi o\'chirishi mumkin' },
        { status: 403 }
      );
    }

    sessionStore.deleteSession(sessionId);
    return NextResponse.json({ success: true, message: 'Sessiya o\'chirildi' });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
