import { NextResponse } from 'next/server';
import { variants, getTotalQuestionsCount, getTotalVariantsCount } from '@/data/questions';

export async function GET() {
  try {
    const variantsList = variants.map((v) => ({
      id: v.id,
      name: v.name,
      questionsCount: v.questions.length,
    }));

    return NextResponse.json({
      success: true,
      variants: variantsList,
      totalQuestions: getTotalQuestionsCount(),
      totalVariants: getTotalVariantsCount(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
