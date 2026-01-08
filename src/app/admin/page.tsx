'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  name: string;
  username: string;
  isAdmin?: boolean;
}

interface ManagedUser {
  id: number;
  name: string;
  username: string;
  isAdmin: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    isAdmin: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (!parsedUser.isAdmin) {
      router.push('/dashboard');
      return;
    }
    setUser(parsedUser);
    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Foydalanuvchilarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      isAdmin: false,
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (userToEdit: ManagedUser) => {
    setModalMode('edit');
    setEditingUser(userToEdit);
    setFormData({
      name: userToEdit.name,
      username: userToEdit.username,
      password: '',
      isAdmin: userToEdit.isAdmin,
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.name || !formData.username) {
      setError('Ism va username majburiy');
      return;
    }

    if (modalMode === 'create' && !formData.password) {
      setError('Parol majburiy');
      return;
    }

    setSaving(true);

    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Xatolik yuz berdi');
          return;
        }

        setSuccess('Foydalanuvchi muvaffaqiyatli yaratildi');
        fetchUsers();
        setTimeout(() => setShowModal(false), 1500);
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingUser?.id,
            ...formData,
            password: formData.password || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Xatolik yuz berdi');
          return;
        }

        setSuccess('Foydalanuvchi muvaffaqiyatli yangilandi');
        fetchUsers();
        setTimeout(() => setShowModal(false), 1500);
      }
    } catch (error) {
      setError('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUsers();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('O\'chirishda xatolik:', error);
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
      <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-white/80 hover:text-white transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Orqaga
            </button>
            <h1 className="text-2xl font-bold">
              <i className="fas fa-cog mr-2"></i>
              Admin Panel
            </h1>
            <div className="text-sm">
              <i className="fas fa-user-shield mr-1"></i>
              {user?.name}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-2xl text-blue-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                <p className="text-sm text-gray-500">Jami foydalanuvchilar</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-user-graduate text-2xl text-green-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {users.filter((u) => !u.isAdmin).length}
                </p>
                <p className="text-sm text-gray-500">Talabalar</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-user-shield text-2xl text-purple-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {users.filter((u) => u.isAdmin).length}
                </p>
                <p className="text-sm text-gray-500">Adminlar</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-bar text-2xl text-orange-600"></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">-</p>
                <p className="text-sm text-gray-500">Aktiv sessiyalar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
            <h2 className="font-bold text-gray-800">
              <i className="fas fa-users mr-2 text-primary"></i>
              Foydalanuvchilar ro'yxati
            </h2>
            <button
              onClick={openCreateModal}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              Yangi foydalanuvchi
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ism
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amallar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                          <span className="text-primary font-medium">
                            {u.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {u.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.isAdmin ? (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                          <i className="fas fa-shield-alt mr-1"></i>
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          <i className="fas fa-user mr-1"></i>
                          Talaba
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-gray-600">O'chirilsinmi?</span>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                            title="Tahrirlash"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => setDeleteConfirm(u.id)}
                              className="text-red-600 hover:text-red-800"
                              title="O'chirish"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                <i className={`fas ${modalMode === 'create' ? 'fa-user-plus' : 'fa-user-edit'} mr-2`}></i>
                {modalMode === 'create' ? 'Yangi foydalanuvchi' : 'Foydalanuvchini tahrirlash'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 text-green-700 p-3 rounded-lg mb-4">
                <i className="fas fa-check-circle mr-2"></i>
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ism *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Foydalanuvchi ismi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Tizimga kirish uchun username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parol {modalMode === 'create' ? '*' : '(bo\'sh qoldiring o\'zgartirmaslik uchun)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Parol"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="isAdmin" className="ml-2 text-sm text-gray-700">
                  Admin huquqlarini berish
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
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
        </div>
      )}
    </div>
  );
}
