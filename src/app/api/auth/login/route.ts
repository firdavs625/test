import { NextResponse } from 'next/server';
import { authenticateUser } from '@/data/users';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Login va parol kiritilishi shart' },
        { status: 400 }
      );
    }

    const user = authenticateUser(username, password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Login yoki parol noto\'g\'ri' },
        { status: 401 }
      );
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
