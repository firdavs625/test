'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TestSession } from '@/types';
import { formatTime, getTimeOptions, calculatePercentage, getScoreColor, getScoreBgColor } from '@/lib/utils';

interface User {
  id: number;
  username: string;
  name: string;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
}

type TestMode = 'setup' | 'group-waiting' | 'test' | 'result';

export default function RandomTestPage() {
  const router = useRouter();

  // State
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<TestMode>('setup');
  
  // Setup state
  const [questionCount, setQuestionCount] = useState(10);
  const [testType, setTestType] = useState<'individual' | 'group'>('individual');
  const [waitingTime, setWaitingTime] = useState(60);
  const [questionTimeLimit, setQuestionTimeLimit] = useState(0);
  
  // Test state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  // Group mode state
  const [countdown, setCountdown] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [session, setSession] = useState<TestSession | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(storedUser));
  }, [router]);

  // Polling for session updates
  const pollSession = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/sessions?sessionId=${session.id}`);
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        if (data.session.status === 'active' && mode === 'group-waiting') {
          setMode('test');
        }
      }
    } catch (error) {
      console.error('Error polling session:', error);
    }
  }, [session, mode]);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    if ((mode === 'group-waiting' || mode === 'test') && session && testType === 'group') {
      pollInterval = setInterval(pollSession, 1000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [mode, session, pollSession, testType]);

  // Countdown timer for waiting
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (mode === 'group-waiting' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            startTest();
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
    if (mode === 'test' && testType === 'group' && questionTimer > 0 && session?.questionTimeLimit && session.questionTimeLimit > 0) {
      timer = setInterval(() => {
        setQuestionTimer((prev) => {
          if (prev <= 1) {
            if (!isAnswered) {
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
  }, [mode, questionTimer, isAnswered, currentQuestion, testType]);

  // Reset question timer when moving to next question in group mode
  useEffect(() => {
    if (mode === 'test' && testType === 'group' && session?.questionTimeLimit && session.questionTimeLimit > 0) {
      setQuestionTimer(session.questionTimeLimit);
    }
  }, [currentQuestion, mode, session?.questionTimeLimit, testType]);

  const handleAutoTimeout = async () => {
    if (isAnswered || !questions.length) return;
    
    setSelectedOption(-1);
    setIsAnswered(true);
    
    const newAnswers = [...answers, -1];
    setAnswers(newAnswers);

    if (testType === 'group' && session && user) {
      await updateGroupProgress(newAnswers, score);
    }
    
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        finishTest();
      }
    }, 1000);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/random?count=${questionCount}`);
      const data = await res.json();
      if (data.questions) {
        setQuestions(data.questions);
        return data.questions;
      }
    } catch (error) {
      console.error('Savollarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
    return null;
  };

  const startIndividualTest = async () => {
    const loadedQuestions = await fetchQuestions();
    if (loadedQuestions) {
      setMode('test');
      setCurrentQuestion(0);
      setAnswers([]);
      setScore(0);
    }
  };

  const createGroupSession = async () => {
    if (!user) return;
    
    const loadedQuestions = await fetchQuestions();
    if (!loadedQuestions) return;

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: 0,
          isRandom: true,
          questionCount,
          questionTimeLimit,
          waitingTime,
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
      console.error('Sessiya yaratishda xatolik:', error);
    }
  };

  const startTest = async () => {
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
      
      setMode('test');
      setCurrentQuestion(0);
      setAnswers([]);
      setScore(0);
    } catch (error) {
      console.error('Testni boshlashda xatolik:', error);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (isAnswered || !questions.length) return;
    
    setSelectedOption(optionIndex);
    setIsAnswered(true);
    
    const question = questions[currentQuestion];
    const isCorrect = optionIndex === question.correctIndex;
    const newScore = isCorrect ? score + 1 : score;
    const newAnswers = [...answers, optionIndex];
    
    setAnswers(newAnswers);
    if (isCorrect) setScore(newScore);

    if (testType === 'group' && session && user) {
      await updateGroupProgress(newAnswers, newScore);
    }
  };

  const nextQuestion = () => {
    if (!questions.length) return;
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishTest();
    }
  };

  const finishTest = async () => {
    if (testType === 'group' && session && user) {
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
      console.error('Progressni yangilashda xatolik:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-primary"></i>
      </div>
    );
  }

  // Setup screen
  if (mode === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
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
              <h1 className="text-2xl font-bold text-gray-800">
                <i className="fas fa-random mr-2 text-purple-600"></i>
                Tasodifiy Test
              </h1>
              <p className="text-gray-500">Barcha mavzulardan tasodifiy savollar</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-gray-800 mb-6">
              <i className="fas fa-cog mr-2 text-blue-500"></i>
              Test sozlamalari
            </h3>

            {/* Question count */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Savollar soni
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`p-3 rounded-xl border-2 font-medium transition-all ${
                      questionCount === count
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {count} ta
                  </button>
                ))}
              </div>
            </div>

            {/* Test type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test turi
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTestType('individual')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    testType === 'individual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <i className="fas fa-user text-2xl mb-2 text-blue-500"></i>
                  <p className="font-medium text-gray-800">Yakka test</p>
                  <p className="text-sm text-gray-500">O'zingiz yechasiz</p>
                </button>
                <button
                  onClick={() => setTestType('group')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    testType === 'group'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <i className="fas fa-users text-2xl mb-2 text-green-500"></i>
                  <p className="font-medium text-gray-800">Guruh test</p>
                  <p className="text-sm text-gray-500">Boshqalar bilan</p>
                </button>
              </div>
            </div>

            {/* Group settings */}
            {testType === 'group' && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kutish vaqti
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {getTimeOptions().map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setWaitingTime(option.value)}
                        className={`p-3 rounded-xl border-2 font-medium transition-all ${
                          waitingTime === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
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
              </>
            )}

            <button
              onClick={testType === 'individual' ? startIndividualTest : createGroupSession}
              disabled={loading}
              className="btn btn-primary w-full btn-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Yuklanmoqda...
                </>
              ) : testType === 'individual' ? (
                <>
                  <i className="fas fa-play mr-2"></i>
                  Testni boshlash
                </>
              ) : (
                <>
                  <i className="fas fa-users mr-2"></i>
                  Sessiya yaratish
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Group waiting screen
  if (mode === 'group-waiting' && session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-600">{formatTime(countdown)}</span>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">Ishtirokchilar kutilmoqda</h2>
            <p className="text-gray-500 mb-6">Test {formatTime(countdown)} dan keyin boshlanadi</p>

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
                setMode('setup');
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

  // Test screen
  if (mode === 'test' && questions.length > 0) {
    const question = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    const liveLeaderboard = session
      ? [...session.participants].sort((a, b) => b.score - a.score).slice(0, 5)
      : [];

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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className={`max-w-3xl mx-auto ${testType === 'group' && showLeaderboard ? 'lg:mr-80' : ''}`}>
          {/* Header */}
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-semibold">
                  {currentQuestion + 1} / {questions.length}
                </span>
                {testType === 'group' && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium">
                    <i className="fas fa-users mr-2"></i>
                    Guruh
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {testType === 'group' && session?.questionTimeLimit && session.questionTimeLimit > 0 && (
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
              {currentQuestion < questions.length - 1 ? (
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
        {testType === 'group' && session && showLeaderboard && (
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
                          {p.currentQuestion}/{questions.length} savol
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
                <p className="text-center text-gray-500 py-4">Hali natija yo'q</p>
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

        {/* Show leaderboard button */}
        {testType === 'group' && session && !showLeaderboard && (
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

  // Result screen
  if (mode === 'result' && questions.length > 0) {
    const percentage = calculatePercentage(score, questions.length);
    const scoreColor = getScoreColor(percentage);
    const scoreBg = getScoreBgColor(percentage);

    const allFinished = session
      ? session.participants.every((p) => p.finishedAt !== null || p.leftEarly)
      : true;

    const finishedCount = session
      ? session.participants.filter((p) => p.finishedAt !== null).length
      : 0;

    const leaderboard = session
      ? [...session.participants]
          .filter((p) => p.finishedAt)
          .sort((a, b) => b.score - a.score)
      : [];

    if (session && !allFinished) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="card p-8 text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <i className="fas fa-trophy text-5xl text-green-600"></i>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-2">Siz testni yakunladingiz!</h2>
              <p className="text-gray-600 mb-6">
                Sizning natijangiz: <span className="font-bold text-green-600">{score}/{questions.length}</span>
              </p>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
                <i className="fas fa-hourglass-half text-2xl text-yellow-600 mb-2"></i>
                <p className="font-medium text-gray-800 mb-1">Boshqa ishtirokchilar kutilmoqda</p>
                <p className="text-sm text-gray-600">
                  {finishedCount} / {session.participants.length} ishtirokchi yakunladi
                </p>
              </div>

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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="card p-8 text-center mb-6">
            <div className={`w-24 h-24 ${scoreBg} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <i className={`fas ${percentage >= 60 ? 'fa-trophy' : 'fa-clipboard-list'} text-4xl ${scoreColor}`}></i>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Test yakunlandi!</h1>
            <p className="text-gray-500 mb-6">Tasodifiy Test ({questions.length} savol)</p>

            <div className={`inline-block px-8 py-4 ${scoreBg} rounded-2xl mb-6`}>
              <div className={`text-5xl font-bold ${scoreColor}`}>
                {score} / {questions.length}
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

          {/* Leaderboard */}
          {session && leaderboard.length > 0 && (
            <div className="card p-6 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                <i className="fas fa-medal mr-2 text-yellow-500"></i>
                Reyting jadvali
              </h3>
              <div className="space-y-2">
                {leaderboard.map((p, index) => {
                  const pPercentage = calculatePercentage(p.score, questions.length);
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
                        <div className="font-bold text-gray-800">{p.score}/{questions.length}</div>
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
                setMode('setup');
                setSession(null);
                setQuestions([]);
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
