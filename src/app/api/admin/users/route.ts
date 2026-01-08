import { NextResponse } from 'next/server';
import { getUsers, getAllUsers, createUser, updateUser, deleteUser, getUserById } from '@/data/users';

// GET - Get all users (admin only)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json(
        { success: false, message: 'Admin ID kerak' },
        { status: 400 }
      );
    }

    const admin = getUserById(parseInt(adminId));
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Ruxsat yo\'q' },
        { status: 403 }
      );
    }

    const users = getUsers().map(u => ({
      id: u.id,
      username: u.username,
      password: u.password,
      name: u.name,
      isAdmin: u.isAdmin,
    }));

    return NextResponse.json({ success: true, users });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// POST - Create new user (admin only)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminId, username, password, name } = body;

    const admin = getUserById(adminId);
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Ruxsat yo\'q' },
        { status: 403 }
      );
    }

    if (!username || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Barcha maydonlar to\'ldirilishi shart' },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUsers = getAllUsers();
    if (existingUsers.some(u => u.username === username)) {
      return NextResponse.json(
        { success: false, message: 'Bu login allaqachon mavjud' },
        { status: 400 }
      );
    }

    const newUser = createUser({
      username,
      password,
      name,
      isAdmin: false,
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'Foydalanuvchi yaratildi',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// PUT - Update user (admin only)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { adminId, userId, username, password, name } = body;

    const admin = getUserById(adminId);
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Ruxsat yo\'q' },
        { status: 403 }
      );
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Foydalanuvchi topilmadi' },
        { status: 404 }
      );
    }

    // Check if new username conflicts
    if (username && username !== user.username) {
      const existingUsers = getAllUsers();
      if (existingUsers.some(u => u.username === username && u.id !== userId)) {
        return NextResponse.json(
          { success: false, message: 'Bu login allaqachon mavjud' },
          { status: 400 }
        );
      }
    }

    const updates: { username?: string; password?: string; name?: string } = {};
    if (username) updates.username = username;
    if (password) updates.password = password;
    if (name) updates.name = name;

    const updatedUser = updateUser(userId, updates);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Foydalanuvchi yangilandi',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const userId = searchParams.get('userId');

    if (!adminId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Admin ID va User ID kerak' },
        { status: 400 }
      );
    }

    const admin = getUserById(parseInt(adminId));
    if (!admin || !admin.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Ruxsat yo\'q' },
        { status: 403 }
      );
    }

    const success = deleteUser(parseInt(userId));

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Foydalanuvchini o\'chirib bo\'lmadi' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Foydalanuvchi o\'chirildi',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
