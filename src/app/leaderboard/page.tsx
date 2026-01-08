'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  userName: string;
  totalScore: number;
  totalQuestions: number;
  testsCompleted: number;
  averageScore: number;
}

interface User {
  id: number;
  name: string;
  username: string;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchLeaderboard();
  }, [router, timeRange]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/leaderboard?range=${timeRange}`);
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error('Reytingni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'bg-gradient-to-r from-yellow-300 to-yellow-500',
          text: 'text-yellow-900',
          icon: 'fas fa-crown',
          glow: 'shadow-lg shadow-yellow-300/50 animate-pulse',
        };
      case 2:
        return {
          bg: 'bg-gradient-to-r from-gray-300 to-gray-400',
          text: 'text-gray-800',
          icon: 'fas fa-medal',
          glow: 'shadow-lg shadow-gray-300/50',
        };
      case 3:
        return {
          bg: 'bg-gradient-to-r from-orange-300 to-orange-500',
          text: 'text-orange-900',
          icon: 'fas fa-medal',
          glow: 'shadow-lg shadow-orange-300/50',
        };
      case 4:
        return {
          bg: 'bg-gradient-to-r from-blue-200 to-blue-300',
          text: 'text-blue-800',
          icon: 'fas fa-star',
          glow: '',
        };
      case 5:
        return {
          bg: 'bg-gradient-to-r from-purple-200 to-purple-300',
          text: 'text-purple-800',
          icon: 'fas fa-star',
          glow: '',
        };
      default:
        return {
          bg: 'bg-white',
          text: 'text-gray-700',
          icon: '',
          glow: '',
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/80 hover:text-white transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Orqaga
            </button>
            <h1 className="text-2xl font-bold">
              <i className="fas fa-trophy mr-2"></i>
              Umumiy Reyting
            </h1>
            <div></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Time Range Filter */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { key: 'all', label: 'Barcha vaqt' },
            { key: 'month', label: 'Oy' },
            { key: 'week', label: 'Hafta' },
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setTimeRange(range.key as typeof timeRange)}
              className={`px-6 py-2 rounded-full font-medium transition-all ${
                timeRange === range.key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="flex justify-center items-end gap-4 mb-8">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="relative">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center text-3xl font-bold text-gray-800 shadow-lg">
                  {leaderboard[1].userName.charAt(0)}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  2
                </div>
              </div>
              <p className="mt-2 font-bold text-gray-800">{leaderboard[1].userName}</p>
              <p className="text-sm text-gray-600">{leaderboard[1].totalScore} ball</p>
              <div className="h-24 w-24 mx-auto bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-lg mt-2 flex items-center justify-center">
                <i className="fas fa-medal text-3xl text-gray-500"></i>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center -mt-8">
              <div className="relative">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-yellow-300 to-yellow-500 flex items-center justify-center text-4xl font-bold text-yellow-900 shadow-lg animate-pulse">
                  {leaderboard[0].userName.charAt(0)}
                </div>
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <i className="fas fa-crown text-3xl text-yellow-500 drop-shadow-lg"></i>
                </div>
              </div>
              <p className="mt-2 font-bold text-gray-800 text-lg">{leaderboard[0].userName}</p>
              <p className="text-sm text-yellow-600 font-medium">{leaderboard[0].totalScore} ball</p>
              <div className="h-32 w-28 mx-auto bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-lg mt-2 flex items-center justify-center">
                <i className="fas fa-trophy text-4xl text-yellow-600"></i>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="relative">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-orange-300 to-orange-500 flex items-center justify-center text-3xl font-bold text-orange-900 shadow-lg">
                  {leaderboard[2].userName.charAt(0)}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  3
                </div>
              </div>
              <p className="mt-2 font-bold text-gray-800">{leaderboard[2].userName}</p>
              <p className="text-sm text-gray-600">{leaderboard[2].totalScore} ball</p>
              <div className="h-20 w-24 mx-auto bg-gradient-to-t from-orange-400 to-orange-300 rounded-t-lg mt-2 flex items-center justify-center">
                <i className="fas fa-medal text-3xl text-orange-600"></i>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <h2 className="font-bold text-gray-800">
              <i className="fas fa-list-ol mr-2 text-primary"></i>
              To'liq reyting
            </h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <i className="fas fa-inbox text-4xl mb-4"></i>
              <p>Hozircha reyting mavjud emas</p>
              <p className="text-sm">Birinchi bo'lib test yechib reyting ochiring!</p>
            </div>
          ) : (
            <div className="divide-y">
              {leaderboard.map((entry) => {
                const style = getRankStyle(entry.rank);
                const isCurrentUser = user?.id === entry.userId;

                return (
                  <div
                    key={entry.userId}
                    className={`px-6 py-4 flex items-center gap-4 transition-all ${style.bg} ${style.glow} ${
                      isCurrentUser ? 'ring-2 ring-primary ring-inset' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-12 text-center">
                      {entry.rank <= 3 ? (
                        <i className={`${style.icon} text-2xl ${style.text}`}></i>
                      ) : (
                        <span className="text-xl font-bold text-gray-500">#{entry.rank}</span>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <p className={`font-bold ${entry.rank <= 5 ? style.text : 'text-gray-800'}`}>
                        {entry.userName}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                            Siz
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.testsCompleted} ta test | O'rtacha: {entry.averageScore.toFixed(1)}%
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${entry.rank <= 5 ? style.text : 'text-gray-800'}`}>
                        {entry.totalScore}
                      </p>
                      <p className="text-xs text-gray-500">ball</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Stats */}
        {user && (
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold text-gray-800 mb-4">
              <i className="fas fa-chart-line mr-2 text-primary"></i>
              Sizning statistikangiz
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <i className="fas fa-tasks text-2xl text-blue-600 mb-2"></i>
                <p className="text-2xl font-bold text-blue-600">
                  {leaderboard.find((e) => e.userId === user.id)?.testsCompleted || 0}
                </p>
                <p className="text-sm text-gray-600">Jami testlar</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <i className="fas fa-star text-2xl text-green-600 mb-2"></i>
                <p className="text-2xl font-bold text-green-600">
                  {leaderboard.find((e) => e.userId === user.id)?.totalScore || 0}
                </p>
                <p className="text-sm text-gray-600">Jami ball</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <i className="fas fa-trophy text-2xl text-purple-600 mb-2"></i>
                <p className="text-2xl font-bold text-purple-600">
                  #{leaderboard.find((e) => e.userId === user.id)?.rank || '-'}
                </p>
                <p className="text-sm text-gray-600">O'rningiz</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
