import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const { user, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        role: 'admin'
      }
    });
  } catch (error: unknown) {
    console.error('Permission check error:', error);
    return NextResponse.json({ error: 'Permission check failed' }, { status: 500 });
  }
}