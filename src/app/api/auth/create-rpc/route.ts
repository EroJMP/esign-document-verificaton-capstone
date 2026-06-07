import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, createUnauthorizedResponse, createForbiddenResponse, createErrorResponse } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, error, isAdmin } = await requireAdmin();
    
    if (error) {
      return isAdmin === false ? createForbiddenResponse(error) : createUnauthorizedResponse(error);
    }
    
    const { functionName, functionBody } = await req.json();
    
    if (!functionName || !functionBody) {
      return createErrorResponse('Function name and body are required', 400);
    }
    
    // This is a utility endpoint for creating RPC functions
    // In a production environment, this should be heavily restricted or removed
    console.log('RPC creation requested:', { functionName, user: user.id });
    
    return NextResponse.json({
      success: true,
      message: 'RPC function creation logged',
      function_name: functionName,
      created_by: user.id
    });
    
  } catch (error: any) {
    console.error('Error in POST /api/auth/create-rpc:', error);
    return createErrorResponse(error.message || 'An error occurred');
  }
}