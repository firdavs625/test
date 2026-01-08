'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Variant, TestSession, Question } from '@/types';
import { formatTime, getTimeOptions, calculatePercentage, getScoreColor, getScoreBgColor } from '@/lib/utils';

interface User {
  id: number;
  username: string;
  name: string;
}

type TestMode = 'select' | 'individual' | 'group-setup' | 'group-waiting' | 'group-test' | 'result';

export default function VariantPage() {
  const params = useParams();
  const router = useRouter();
  const variantId = parseInt(params.id as string);

  // State
  const [user, setUser] = useState<User | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<TestMode>('select');
  
  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  // Group mode state
  const [waitingTime, setWaitingTime] = useState(60);
  const [questionTimeLimit, setQuestionTimeLimit] = useState(15); // seconds per question
  const [questionTimer, setQuestionTimer] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [session, setSession] = useState<TestSession | null>(null);
  const [availableSessions, setAvailableSessions] = useState<TestSession[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchVariant();
  }, [router, variantId]);

  const fetchVariant = async () => {
    try {
      const res = await fetch(`/api/variants/${variantId}`);
      const data = await res.json();
      if (data.success) {
        setVariant(data.variant);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSessions = async () => {
    try {
      const res = await fetch(`/api/sessions?variantId=${variantId}`);
      const data = await res.json();
      if (data.success) {
        setAvailableSessions(data.sessions.filter((s: TestSession) => s.status === 'waiting'));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Polling for session updates
  const pollSession = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/sessions?sessionId=${session.id}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        if (data.session.status === 'active' && mode === 'group-waiting') {
          setMode('group-test');
        }
      }
    } catch (error) {
      console.error('Error polling session:', error);
    }
  }, [session, mode]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if ((mode === 'group-waiting' || mode === 'group-test') && session) {
      pollInterval = setInterval(pollSession, 1000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [mode, session, pollSession]);

  // Countdown timer for waiting
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === 'group-waiting' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            startGroupTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, countdown]);

  // Per-question timer for group mode
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === 'group-test' && questionTimer > 0 && session?.questionTimeLimit && session.questionTimeLimit > 0) {
      timer = setInterval(() => {
        setQuestionTimer((prev) => {
          if (prev <= 1) {
            // Auto-select wrong answer if no answer given
            if (!isAnswered && variant) {
              const question = variant.questions[currentQuestion];
              // Select -1 (no answer) and move on
              handleAutoTimeout();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, questionTimer, isAnswered, currentQuestion]);

  // Reset question timer when moving to next question in group mode
  useEffect(() => {
    if (mode === 'group-test' && session?.questionTimeLimit && session.questionTimeLimit > 0) {
      setQuestionTimer(session.questionTimeLimit);
    }
  }, [currentQuestion, mode, session?.questionTimeLimit]);

  const handleAutoTimeout = async () => {
    if (isAnswered || !variant) return;
    
    setSelectedOption(-1);
    setIsAnswered(true);
    
    const newAnswers = [...answers, -1]; // -1 means timeout/no answer
    setAnswers(newAnswers);

    if (mode === 'group-test' && session && user) {
      await updateGroupProgress(newAnswers, score);
    }
    
    // Auto move to next question after 1 second
    setTimeout(() => {
      if (currentQuestion < variant.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        finishTest();
      }
    }, 1000);
  };

  const startIndividualTest = () => {
    setMode('individual');
    setCurrentQuestion(0);
    setAnswers([]);
    setScore(0);
    setShowResult(false);
  };

  const handleAnswer = async (optionIndex: number) => {
    if (isAnswered || !variant) return;
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    
    const question = variant.questions[currentQuestion];
    const isCorrect = optionIndex === question.correctIndex;
    const newScore = isCorrect ? score + 1 : score;
    const newAnswers = [...answers, optionIndex];
    
    setAnswers(newAnswers);
    if (isCorrect) setScore(newScore);

    // Update session if in group mode
    if (mode === 'group-test' && session && user) {
      await updateGroupProgress(newAnswers, newScore);
    }
  };

  const nextQuestion = () => {
    if (!variant) return;
    
    if (currentQuestion < variant.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishTest();
    }
  };

  const finishTest = async () => {
    if (mode === 'group-test' && session && user) {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          action: 'finish',
          userId: user.id,
          currentQuestion: currentQuestion + 1,
          answers,
          score,
          finishedAt: Date.now(),
        }),
      });
      await pollSession();
    }
    setMode('result');
  };

  const createGroupSession = async () => {
    if (!user) return;
    
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          waitingTime,
          questionTimeLimit,
          userId: user.id,
          username: user.username,
          name: user.name,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        setCountdown(waitingTime);
        setMode('group-waiting');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const joinSession = async (sessionToJoin: TestSession) => {
    if (!user) return;
    
    try {
      const res = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionToJoin.id,
          action: 'join',
          userId: user.id,
          username: user.username,
          name: user.name,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        const elapsed = Math.floor((Date.now() - sessionToJoin.createdAt) / 1000);
        setCountdown(Math.max(0, sessionToJoin.waitingTime - elapsed));
        setMode('group-waiting');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startGroupTest = async () => {
    if (!session) return;
    
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          action: 'start',
        }),
      });
      
      setMode('group-test');
      setCurrentQuestion(0);
      setAnswers([]);
      setScore(0);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const updateGroupProgress = async (newAnswers: number[], newScore: number) => {
    if (!session || !user) return;
    
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          action: 'updateProgress',
          userId: user.id,
          currentQuestion: currentQuestion + 1,
          answers: newAnswers,
          score: newScore,
        }),
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-500">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!variant) {
    return null;
  }

  // Render mode selection
  if (mode === 'select') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <i className="fas fa-arrow-left text-gray-600"></i>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{variant.name}</h1>
              <p className="text-gray-500">{variant.questions.length} ta savol</p>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-4">
            {/* Individual Mode */}
            <button
              onClick={startIndividualTest}
              className="card w-full p-6 text-left hover:shadow-2xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-user text-2xl text-white"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Individual rejim</h3>
                  <p className="text-gray-500 text-sm">Testni yolg'iz ishlang va o'z bilimingizni sinab ko'ring</p>
                </div>
                <i className="fas fa-chevron-right text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"></i>
              </div>
            </button>

            {/* Group Mode */}
            <button
              onClick={() => {
                setMode('group-setup');
                fetchAvailableSessions();
              }}
              className="card w-full p-6 text-left hover:shadow-2xl transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-users text-2xl text-white"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Guruh bilan ishlash</h3>
                  <p className="text-gray-500 text-sm">Boshqa talabalar bilan birga test ishlang va raqobatlashing</p>
                </div>
                <i className="fas fa-chevron-right text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all"></i>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render group setup
  if (mode === 'group-setup') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setMode('select')}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <i className="fas fa-arrow-left text-gray-600"></i>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Guruh bilan ishlash</h1>
              <p className="text-gray-500">{variant.name}</p>
            </div>
          </div>

          {/* Available Sessions */}
          {availableSessions.length > 0 && (
            <div className="card p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                <i className="fas fa-door-open mr-2 text-green-500"></i>
                Mavjud sessiyalar
              </h3>
              <div className="space-y-3">
                {availableSessions.map((s) => {
                  const elapsed = Math.floor((Date.now() - s.createdAt) / 1000);
                  const remaining = Math.max(0, s.waitingTime - elapsed);
                  return (
                    <button
                      key={s.id}
                      onClick={() => joinSession(s)}
                      className="w-full p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:border-green-400 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">
                            {s.participants.length} ta ishtirokchi
                          </div>
                          <div className="text-sm text-gray-500">
                            <i className="fas fa-clock mr-1"></i>
                            {formatTime(remaining)} qoldi
                          </div>
                        </div>
                        <span className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium">
                          Qo'shilish
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create New Session */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              <i className="fas fa-plus-circle mr-2 text-blue-500"></i>
              Yangi sessiya yaratish
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kutish vaqtini tanlang
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {getTimeOptions().map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setWaitingTime(option.value)}
                    className={`p-3 rounded-xl border-2 font-medium transition-all ${
                      waitingTime === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-stopwatch mr-1 text-orange-500"></i>
                Har bir savol uchun vaqt (ixtiyoriy)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { value: 0, label: "Cheksiz" },
                  { value: 8, label: "8 sek" },
                  { value: 15, label: "15 sek" },
                  { value: 20, label: "20 sek" },
                  { value: 30, label: "30 sek" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setQuestionTimeLimit(option.value)}
                    className={`p-3 rounded-xl border-2 font-medium transition-all ${
                      questionTimeLimit === option.value
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {questionTimeLimit > 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  <i className="fas fa-info-circle mr-1"></i>
                  Vaqt tugaganda avtomatik keyingi savolga o'tiladi
                </p>
              )}
            </div>

            <button
              onClick={createGroupSession}
              className="btn btn-success w-full btn-lg"
            >
              <i className="fas fa-play mr-2"></i>
              Sessiya yaratish va kutish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render group waiting
  if (mode === 'group-waiting' && session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            {/* Countdown */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-600">{formatTime(countdown)}</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">Ishtirokchilar kutilmoqda</h2>
            <p className="text-gray-500 mb-6">Test {formatTime(countdown)} dan keyin boshlanadi</p>

            {/* Participants */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <i className="fas fa-users text-blue-500"></i>
                <span className="font-medium text-gray-700">{session.participants.length} ta ishtirokchi</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {session.participants.map((p) => (
                  <span
                    key={p.userId}
                    className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setMode('select');
                setSession(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-times mr-2"></i>
              Bekor qilish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render test (individual or group)
  if (mode === 'individual' || mode === 'group-test') {
    const question = variant.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / variant.questions.length) * 100;

    // Sort participants by score for live leaderboard
    const liveLeaderboard = session
      ? [...session.participants].sort((a, b) => b.score - a.score).slice(0, 5)
      : [];

    // Get rank colors for top 5
    const getRankColor = (index: number) => {
      switch (index) {
        case 0: return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 animate-pulse';
        case 1: return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
        case 2: return 'bg-gradient-to-r from-orange-400 to-orange-500 text-orange-900';
        case 3: return 'bg-gradient-to-r from-blue-300 to-blue-400 text-blue-800';
        case 4: return 'bg-gradient-to-r from-purple-300 to-purple-400 text-purple-800';
        default: return 'bg-gray-100 text-gray-700';
      }
    };

    return (
      <div className="min-h-screen p-4">
        <div className={`max-w-3xl mx-auto ${mode === 'group-test' && showLeaderboard ? 'lg:mr-80' : ''}`}>
          {/* Header */}
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold">
                  {currentQuestion + 1} / {variant.questions.length}
                </span>
                {mode === 'group-test' && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium">
                    <i className="fas fa-users mr-2"></i>
                    Guruh
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Question Timer */}
                {mode === 'group-test' && session?.questionTimeLimit && session.questionTimeLimit > 0 && (
                  <div className={`px-4 py-2 rounded-xl font-bold text-lg ${
                    questionTimer <= 5 ? 'bg-red-100 text-red-600 animate-pulse' :
                    questionTimer <= 10 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <i className="fas fa-stopwatch mr-2"></i>
                    {questionTimer}s
                  </div>
                )}
                <div className="text-right">
                  <div className="text-sm text-gray-500">Ball</div>
                  <div className="font-bold text-lg text-gray-800">{score}</div>
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="card p-8 mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 leading-relaxed text-center">
              {question.text}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              let optionClass = 'option-btn option-btn-default';
              
              if (isAnswered) {
                if (index === question.correctIndex) {
                  optionClass = 'option-btn option-btn-correct';
                } else if (index === selectedOption && index !== question.correctIndex) {
                  optionClass = 'option-btn option-btn-incorrect';
                } else {
                  optionClass = 'option-btn border-gray-200 bg-gray-50 opacity-60';
                }
              } else if (selectedOption === index) {
                optionClass = 'option-btn option-btn-selected';
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={isAnswered}
                  className={optionClass}
                >
                  <div className="flex items-start gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold text-sm ${
                      isAnswered && index === question.correctIndex
                        ? 'bg-green-500 text-white'
                        : isAnswered && index === selectedOption && index !== question.correctIndex
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-left">{option}</span>
                    {isAnswered && index === question.correctIndex && (
                      <i className="fas fa-check-circle text-green-500 text-xl"></i>
                    )}
                    {isAnswered && index === selectedOption && index !== question.correctIndex && (
                      <i className="fas fa-times-circle text-red-500 text-xl"></i>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          {isAnswered && (
            <button
              onClick={nextQuestion}
              className="btn btn-primary w-full btn-lg"
            >
              {currentQuestion < variant.questions.length - 1 ? (
                <>
                  Keyingi savol
                  <i className="fas fa-arrow-right ml-2"></i>
                </>
              ) : (
                <>
                  Yakunlash
                  <i className="fas fa-flag-checkered ml-2"></i>
                </>
              )}
            </button>
          )}
        </div>

        {/* Real-time Leaderboard Sidebar */}
        {mode === 'group-test' && session && showLeaderboard && (
          <div className="hidden lg:block fixed right-4 top-20 w-72 bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold">
                  <i className="fas fa-trophy mr-2"></i>
                  Jonli Reyting
                </h3>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-white/70 hover:text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {liveLeaderboard.length > 0 ? (
                <div className="space-y-2">
                  {liveLeaderboard.map((p, index) => (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-3 p-3 rounded-xl ${getRankColor(index)} ${
                        p.userId === user?.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                      }`}
                    >
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {p.name}
                          {p.userId === user?.id && ' (Siz)'}
                        </p>
                        <p className="text-xs opacity-75">
                          {p.currentQuestion}/{variant.questions.length} savol
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{p.score}</p>
                        <p className="text-xs opacity-75">ball</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Hali natija yo'q
                </p>
              )}
            </div>
            {session.participants.length > 5 && (
              <div className="border-t p-3 text-center text-sm text-gray-500">
                <i className="fas fa-users mr-1"></i>
                Jami: {session.participants.length} ishtirokchi
              </div>
            )}
          </div>
        )}

        {/* Show leaderboard button on mobile or when hidden */}
        {mode === 'group-test' && session && !showLeaderboard && (
          <button
            onClick={() => setShowLeaderboard(true)}
            className="fixed right-4 bottom-20 w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform"
          >
            <i className="fas fa-trophy text-xl"></i>
          </button>
        )}
      </div>
    );
  }

  // Render result
  if (mode === 'result') {
    const percentage = calculatePercentage(score, variant.questions.length);
    const scoreColor = getScoreColor(percentage);
    const scoreBg = getScoreBgColor(percentage);

    // Check if all participants have finished (for group mode)
    const allFinished = session
      ? session.participants.every((p) => p.finishedAt !== null || p.leftEarly)
      : true;

    // Count finished participants
    const finishedCount = session
      ? session.participants.filter((p) => p.finishedAt !== null).length
      : 0;

    // Sort participants by score for leaderboard
    const leaderboard = session
      ? [...session.participants]
          .filter((p) => p.finishedAt)
          .sort((a, b) => b.score - a.score)
      : [];

    // If in group mode and not all finished, show waiting screen
    if (session && !allFinished) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="card p-8 text-center">
              {/* Animation */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <i className="fas fa-trophy text-5xl text-green-600"></i>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">Siz testni yakunladingiz!</h2>
              <p className="text-gray-600 mb-6">
                Sizning natijangiz: <span className="font-bold text-green-600">{score}/{variant.questions.length}</span>
              </p>

              {/* Waiting for others */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
                <i className="fas fa-hourglass-half text-2xl text-yellow-600 mb-2"></i>
                <p className="font-medium text-gray-800 mb-1">Boshqa ishtirokchilar kutilmoqda</p>
                <p className="text-sm text-gray-600">
                  {finishedCount} / {session.participants.length} ishtirokchi yakunladi
                </p>
              </div>

              {/* Finished participants list */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Yakunlangan ishtirokchilar:</p>
                <div className="space-y-2">
                  {session.participants
                    .filter((p) => p.finishedAt)
                    .map((p) => (
                      <div
                        key={p.userId}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          p.userId === user?.id ? 'bg-green-100' : 'bg-white'
                        }`}
                      >
                        <span className="font-medium text-gray-800">
                          {p.name}
                          {p.userId === user?.id && ' (Siz)'}
                        </span>
                        <i className="fas fa-check-circle text-green-500"></i>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          {/* Result Card */}
          <div className="card p-8 text-center mb-6">
            <div className={`w-24 h-24 ${scoreBg} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <i className={`fas ${percentage >= 60 ? 'fa-trophy' : 'fa-clipboard-list'} text-4xl ${scoreColor}`}></i>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Test yakunlandi!</h1>
            <p className="text-gray-500 mb-6">{variant.name}</p>

            <div className={`inline-block px-8 py-4 ${scoreBg} rounded-2xl mb-6`}>
              <div className={`text-5xl font-bold ${scoreColor}`}>
                {score} / {variant.questions.length}
              </div>
              <div className="text-gray-500 mt-1">{percentage}%</div>
            </div>

            {percentage >= 80 && (
              <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
                <i className="fas fa-star"></i>
                <span className="font-medium">A'lo natija!</span>
              </div>
            )}
          </div>

          {/* Leaderboard (Group mode only) */}
          {session && leaderboard.length > 0 && (
            <div className="card p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                <i className="fas fa-medal mr-2 text-yellow-500"></i>
                Reyting jadvali
              </h3>
              <div className="space-y-2">
                {leaderboard.map((p, index) => {
                  const pPercentage = calculatePercentage(p.score, variant.questions.length);
                  const isCurrentUser = p.userId === user?.id;
                  
                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-4 p-4 rounded-xl ${
                        isCurrentUser ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {p.name}
                          {isCurrentUser && <span className="text-blue-600 ml-1">(Siz)</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-800">{p.score}/{variant.questions.length}</div>
                        <div className="text-sm text-gray-500">{pPercentage}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn btn-secondary flex-1"
            >
              <i className="fas fa-home mr-2"></i>
              Bosh sahifa
            </button>
            <button
              onClick={() => {
                setMode('select');
                setSession(null);
                setCurrentQuestion(0);
                setAnswers([]);
                setScore(0);
                setSelectedOption(null);
                setIsAnswered(false);
              }}
              className="btn btn-primary flex-1"
            >
              <i className="fas fa-redo mr-2"></i>
              Qayta ishlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
