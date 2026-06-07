import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, supabase, error: 'Unauthorized' };
  }
  
  return { user, supabase, error: null };
}

export async function getAuthenticatedSession() {
  const supabase = await createClient();
  
  // Use getUser() instead of getSession() for security
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { session: null, user: null, supabase, error: 'Unauthorized' };
  }
  
  // Get session for additional session data if needed
  const { data: { session } } = await supabase.auth.getSession();
  
  return { session, user, supabase, error: null };
}

export async function requireAdmin() {
  const { user, supabase, error } = await getAuthenticatedUser();
  
  if (error || !user) {
    return { user: null, supabase, error: 'Unauthorized', isAdmin: false };
  }
  
  // Check if user is admin
  const { data: userData, error: roleError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  const isAdmin = userData?.role === 'admin';
  
  if (!isAdmin) {
    return { user, supabase, error: 'Admin access required', isAdmin: false };
  }
  
  return { user, supabase, error: null, isAdmin: true };
}

export function createUnauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function createForbiddenResponse(message = 'Access forbidden') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function createErrorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function createSuccessResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
