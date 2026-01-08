import { NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/data/users';

// PUT - Update user profile (name or password)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, currentPassword, newPassword } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID kerak' },
        { status: 400 }
      );
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    const updates: { name?: string; password?: string } = {};

    // Update name
    if (name && name.trim()) {
      updates.name = name.trim();
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Joriy parolni kiriting' },
          { status: 400 }
        );
      }

      if (user.password !== currentPassword) {
        return NextResponse.json(
          { success: false, message: 'Joriy parol noto\'g\'ri' },
          { status: 401 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: 'Yangi parol kamida 6 ta belgidan iborat bo\'lishi kerak' },
          { status: 400 }
        );
      }

      updates.password = newPassword;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: 'O\'zgartirish uchun ma\'lumot kiritilmagan' },
        { status: 400 }
      );
    }

    const updatedUser = updateUser(userId, updates);

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, message: 'Xatolik yuz berdi' },
        { status: 500 }
      );
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: 'Ma\'lumotlar muvaffaqiyatli yangilandi',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
