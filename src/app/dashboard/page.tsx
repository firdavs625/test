'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Variant {
  id: number;
  name: string;
  questionsCount: number;
}

interface User {
  id: number;
  name: string;
  username: string;
  isAdmin?: boolean;
}

interface ActiveSession {
  id: string;
  variantId: number;
  variantName: string;
  hostName: string;
  hostId: number;
  participantCount: number;
  status: 'waiting' | 'active' | 'completed';
  isRandom?: boolean;
  questionCount?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    setProfileName(parsedUser.name);
    fetchVariants();
    fetchActiveSessions();

    // Poll for active sessions every 3 seconds
    const interval = setInterval(fetchActiveSessions, 3000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchVariants = async () => {
    try {
      const res = await fetch('/api/variants');
      const data = await res.json();
      if (data.variants) {
        setVariants(data.variants);
      } else if (Array.isArray(data)) {
        setVariants(data);
      }
    } catch (error) {
      console.error('Variantlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch('/api/sessions?active=true');
      const data = await res.json();
      if (data.sessions) {
        setActiveSessions(data.sessions);
      }
    } catch (error) {
      console.error('Aktiv sessiyalarni yuklashda xatolik:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleProfileSave = async () => {
    setProfileError('');
    setProfileSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setProfileError('Yangi parollar mos kelmaydi');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setProfileError('Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    setSavingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: profileName,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error || 'Xatolik yuz berdi');
        return;
      }

      // Update local storage
      const updatedUser = { ...user, name: profileName };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser as User);
      setProfileSuccess('Profil muvaffaqiyatli yangilandi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setProfileError('Xatolik yuz berdi');
    } finally {
      setSavingProfile(false);
    }
  };

  const joinSession = async (session: ActiveSession) => {
    if (!user) return;

    try {
      const res = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          sessionId: session.id,
          userId: user.id,
          username: user.username,
          name: user.name,
        }),
      });

      if (res.ok) {
        if (session.isRandom) {
          router.push(`/random?session=${session.id}&joined=true`);
        } else {
          router.push(`/variant/${session.variantId}?session=${session.id}&joined=true`);
        }
      }
    } catch (error) {
      console.error('Sessiyaga qo\'shilishda xatolik:', error);
    }
  };

  const cancelSession = async (sessionId: string) => {
    if (!user) return;

    if (!confirm('Sessiyani bekor qilmoqchimisiz?')) return;

    try {
      const res = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          sessionId,
          userId: user.id,
        }),
      });

      if (res.ok) {
        fetchActiveSessions();
      }
    } catch (error) {
      console.error('Sessiyani bekor qilishda xatolik:', error);
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
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary">
              <i className="fas fa-graduation-cap mr-2"></i>
              Test Platformasi
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/leaderboard')}
              className="text-gray-600 hover:text-primary transition-colors"
              title="Umumiy reyting"
            >
              <i className="fas fa-trophy text-xl"></i>
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-primary transition-colors"
                title="Admin panel"
              >
                <i className="fas fa-cog text-xl"></i>
              </button>
            )}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
            >
              <i className="fas fa-user-circle text-xl"></i>
              <span className="font-medium">{user?.name}</span>
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/random')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <i className="fas fa-random text-2xl sm:text-3xl mb-2"></i>
            <h3 className="text-base sm:text-lg font-bold">Tasodifiy Test</h3>
            <p className="text-xs sm:text-sm opacity-90">Tasodifiy savollar</p>
          </button>
          <button
            onClick={() => router.push('/leaderboard')}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <i className="fas fa-trophy text-2xl sm:text-3xl mb-2"></i>
            <h3 className="text-base sm:text-lg font-bold">Reyting</h3>
            <p className="text-xs sm:text-sm opacity-90">Natijalar reytingi</p>
          </button>
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 sm:p-6 rounded-xl shadow-lg">
            <i className="fas fa-chart-bar text-2xl sm:text-3xl mb-2"></i>
            <h3 className="text-base sm:text-lg font-bold">Statistika</h3>
            <p className="text-xs sm:text-sm opacity-90">Testlar: -</p>
          </div>
        </div>

        {/* Active Sessions */}
        {activeSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              <i className="fas fa-users text-primary mr-2"></i>
              Faol guruh testlari
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-800 text-sm sm:text-base">
                      {session.isRandom ? (
                        <span className="text-purple-600">
                          <i className="fas fa-random mr-1"></i>
                          <span className="hidden sm:inline">Tasodifiy Test</span>
                          <span className="sm:hidden">Random</span> ({session.questionCount})
                        </span>
                      ) : (
                        <span className="line-clamp-1">{session.variantName}</span>
                      )}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        session.status === 'waiting'
                          ? 'bg-yellow-100 text-yellow-700'
                          : session.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {session.status === 'waiting'
                        ? 'Kutilmoqda'
                        : session.status === 'active'
                        ? 'Davom etmoqda'
                        : 'Yakunlandi'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 truncate">
                    <i className="fas fa-user mr-1"></i>
                    {session.hostName}
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    <i className="fas fa-users mr-1"></i>
                    {session.participantCount} kishi
                  </p>
                  {session.status === 'waiting' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => joinSession(session)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        <i className="fas fa-sign-in-alt mr-1 sm:mr-2"></i>
                        Qo'shilish
                      </button>
                      {session.hostId === user?.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelSession(session.id);
                          }}
                          className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors"
                          title="Bekor qilish"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Variants List */}
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">
          <i className="fas fa-list text-primary mr-2"></i>
          Test variantlari
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {variants.map((variant) => (
            <div
              key={variant.id}
              onClick={() => router.push(`/variant/${variant.id}`)}
              className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg transition-all transform hover:scale-105"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="bg-primary text-white px-3 py-1 rounded-full text-sm font-medium">
                  Variant {variant.id}
                </span>
                <i className="fas fa-arrow-right text-gray-400"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {variant.name}
              </h3>
              <p className="text-gray-600">
                <i className="fas fa-question-circle mr-2"></i>
                {variant.questionsCount} ta savol
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                <i className="fas fa-user-edit mr-2"></i>
                Profil sozlamalari
              </h2>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileError('');
                  setProfileSuccess('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {profileError && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">
                <i className="fas fa-check-circle mr-2"></i>
                {profileSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ism
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <hr className="my-4" />

              <p className="text-sm text-gray-600 mb-2">
                <i className="fas fa-lock mr-1"></i>
                Parolni o'zgartirish (ixtiyoriy)
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Joriy parol
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Joriy parolni kiriting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yangi parol
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Yangi parolni kiriting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yangi parolni tasdiqlang
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Yangi parolni qayta kiriting"
                />
              </div>

              <button
                onClick={handleProfileSave}
                disabled={savingProfile}
                className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Saqlash
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
