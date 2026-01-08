import { NextResponse } from 'next/server';
import { getVariantById } from '@/data/questions';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const variantId = parseInt(params.id);
    
    if (isNaN(variantId)) {
      return NextResponse.json(
        { success: false, message: 'Noto\'g\'ri variant ID' },
        { status: 400 }
      );
    }

    const variant = getVariantById(variantId);

    if (!variant) {
      return NextResponse.json(
        { success: false, message: 'Variant topilmadi' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      variant,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
