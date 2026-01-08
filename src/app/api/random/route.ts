import { NextResponse } from 'next/server';
import { getRandomQuestions, getTotalQuestionsCount } from '@/data/questions';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '10');
    
    const maxQuestions = getTotalQuestionsCount();
    const actualCount = Math.min(Math.max(5, count), maxQuestions);
    
    const questions = getRandomQuestions(actualCount);

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
      maxAvailable: maxQuestions,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
